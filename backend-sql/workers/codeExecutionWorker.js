// backend/workers/codeExecutionWorker.js
const { Worker } = require('bullmq');
const { getNewRedisClient, getRedis } = require('../config/redis');
const Problem = require('../models/Problem');
const ContestSubmission = require('../models/ContestSubmission');
const CourseContestSubmission = require('../models/CourseContestSubmission');
const { executeWithTestCases } = require('../services/judge0Service');
const { executeSqlWithTestCases } = require('../services/sqlJudgeService');
const { notifyLeaderboardUpdate, notifySubmission, notifyExecutionResult } = require('../config/websocket');

const startCodeExecutionWorker = () => {
    const qName = process.env.NODE_ENV === 'production' ? 'code-execution' : 'code-execution-dev';
    const worker = new Worker(qName, async (job) => {
        const data = job.data;
        console.log(`[Worker] Started ${data.type} execution for: ${data.studentId}, problem: ${data.problemId}`);

        try {
            let testCases = [];
            const isCustom = data.customInput !== undefined && data.customInput !== null && String(data.customInput).trim() !== '';
            const isMultiCustom = Array.isArray(data.customInputs) && data.customInputs.length > 0;

            if (isMultiCustom) {
                testCases = data.customInputs.map(c => ({
                    input: c.input,
                    output: c.expectedOutput ?? undefined,
                    isHidden: false,
                    isCustom: c.isCustom ?? true
                }));
            } else if (isCustom) {
                testCases = [{ input: data.customInput, output: undefined, isHidden: false, isCustom: true }];
            } else {
                testCases = await Problem.getAllTestCases(data.problemId);
                if (data.type === 'run' || data.type === 'cc_run') {
                    // Strictly ONLY expose non-hidden (sample) test cases
                    testCases = testCases.filter(tc => !tc.isHidden);
                }
            }

            // Get problem to check type
            const problem = await Problem.findById(data.problemId);
            if (!problem) throw new Error('Problem not found');

            const executeRunner = problem.type === 'sql' ? executeSqlWithTestCases : executeWithTestCases;

            // Helper: get solution code for standard problems
            const getSolutionCode = () => {
                const language = data.language;
                const solCode = problem.solutionCode?.[language] ||
                    Object.values(problem.solutionCode || {}).find(c => c);
                const solLang = problem.solutionCode?.[language]
                    ? language
                    : Object.keys(problem.solutionCode || {}).find(k => problem.solutionCode[k]);
                return { solCode, solLang };
            };

            let result;
            if (problem.type !== 'sql' && (isCustom || isMultiCustom)) {
                // For standard problems with custom input, we might need to run reference solution
                const casesNeedingSolution = testCases.filter(c => c.output === undefined || c.output === null);
                const { solCode, solLang } = getSolutionCode();
                const needsSolution = casesNeedingSolution.length > 0 && solCode && solLang;

                const [userRes, solRes] = await Promise.all([
                    executeRunner(data.language, data.code, testCases, data.timeLimit, problem.id, problem),
                    needsSolution
                        ? executeRunner(solLang, solCode, casesNeedingSolution, data.timeLimit, problem.id, problem).catch(e => {
                            console.warn('[Worker] Solution code failed:', e.message);
                            return null;
                        })
                        : Promise.resolve(null)
                ]);

                // Map solution outputs back to results
                if (solRes) {
                    const solMap = {};
                    casesNeedingSolution.forEach((c, i) => {
                        solMap[c.input] = solRes.results[i]?.actualOutput;
                    });
                    
                    userRes.results = userRes.results.map(r => {
                        if (r.expectedOutput === undefined || r.expectedOutput === null) {
                            r.expectedOutput = solMap[r.input] ?? '(No reference solution)';
                            r.passed = r.actualOutput?.trim() === r.expectedOutput?.trim();
                        }
                        return r;
                    });
                    // Re-calculate testCasesPassed
                    userRes.testCasesPassed = userRes.results.filter(r => r.passed).length;
                }
                result = userRes;
            } else {
                // SQL or standard with database test cases
                result = await executeRunner(
                    data.language,
                    data.code,
                    testCases,
                    data.timeLimit,
                    problem.id,
                    problem
                );
            }

            if (data.type === 'run' || data.type === 'cc_run') {
                const runResult = {
                    isRun: true,
                    success: true,
                    problemId: data.problemId,
                    message: 'Code executed successfully',
                    results: result.results.map((r, idx) => ({
                        input: r.input,
                        expectedOutput: r.expectedOutput,
                        actualOutput: r.actualOutput,
                        passed: r.passed,
                        verdict: r.verdict,
                        error: r.error,
                        isHidden: r.isHidden || false,
                        isCustom: r.isCustom || testCases[idx]?.isCustom || false
                    }))
                };

                const contestId = data.contestId || data.courseContestId;
                notifyExecutionResult(contestId, data.studentId, runResult);
                return runResult;
            }

            // If it's a practice submission
            if (data.type === 'submit' && data.isPractice) {
                const practiceResult = {
                    success: true,
                    isPractice: true,
                    problemId: data.problemId,
                    message: result.verdict === 'Accepted' ? 'Practice submission passed!' : 'Practice submission completed',
                    submission: {
                        _id: 'temporary-practice-id',
                        verdict: result.verdict,
                        testCasesPassed: result.testCasesPassed,
                        totalTestCases: result.totalTestCases,
                        submittedAt: new Date(),
                        tabSwitchCount: 0,
                        tabSwitchDuration: 0,
                        pasteAttempts: 0,
                        fullscreenExits: 0
                    },
                    results: result.results.map(r => {
                        if (r.isHidden) {
                            return { passed: r.passed, isHidden: true, verdict: r.verdict };
                        }
                        return {
                            input: r.input,
                            expectedOutput: r.expectedOutput,
                            actualOutput: r.actualOutput,
                            passed: r.passed,
                            isHidden: false,
                            verdict: r.verdict,
                            error: r.error
                        };
                    })
                };

                notifyExecutionResult(data.contestId, data.studentId, practiceResult);
                return practiceResult;
            }

            // --- Normal Contest Submission Flow ---
            if (data.type === 'submit' || data.type === 'cc_submit') {
                const isCC = data.type === 'cc_submit';
                const submissionModel = isCC ? CourseContestSubmission : ContestSubmission;

                const submission = await submissionModel.create({
                    contestId: data.contestId, // for regular
                    courseContestId: data.courseContestId, // for cc
                    studentId: data.studentId,
                    problemId: data.problemId,
                    code: data.code,
                    language: data.language,
                    verdict: result.verdict,
                    testCasesPassed: result.testCasesPassed,
                    totalTestCases: result.totalTestCases,
                    tabSwitchCount: data.tabSwitchCount || 0,
                    tabSwitchDuration: data.tabSwitchDuration || 0,
                    pasteAttempts: data.pasteAttempts || 0,
                    fullscreenExits: data.fullscreenExits || 0,
                    isAutoSubmit: data.isAutoSubmit || false,
                    attemptNumber: data.attemptNumber || 1
                });

                const finalResult = {
                    success: true,
                    problemId: data.problemId,
                    message: data.isAutoSubmit
                        ? 'Code auto-submitted due to violations'
                        : result.verdict === 'Accepted'
                            ? 'Problem solved! Submission locked.'
                            : 'Code submitted successfully',
                    submission: {
                        id: submission.id,
                        verdict: submission.verdict,
                        testCasesPassed: submission.testCasesPassed,
                        totalTestCases: submission.totalTestCases,
                        submittedAt: submission.submittedAt,
                        isAutoSubmit: data.isAutoSubmit,
                        problemLocked: result.verdict === 'Accepted'
                    },
                    results: result.results.map(r => {
                        if (r.isHidden) return { passed: r.passed, isHidden: true, verdict: r.verdict };
                        return {
                            input: r.input, expectedOutput: r.expectedOutput, actualOutput: r.actualOutput,
                            passed: r.passed, isHidden: false, verdict: r.verdict, error: r.error
                        };
                    })
                };

                const contestId = data.contestId || data.courseContestId;
                try {
                    await submissionModel.invalidateCache(contestId);
                    notifyLeaderboardUpdate(contestId);
                    notifySubmission(contestId, {
                        studentId: data.studentId,
                        problemId: data.problemId,
                        verdict: result.verdict,
                        timestamp: submission.submittedAt,
                        isAutoSubmit: data.isAutoSubmit
                    });
                    notifyExecutionResult(contestId, data.studentId, finalResult);
                } catch (wsError) {
                    console.error('[Worker] WebSocket notification error:', wsError);
                }
                return finalResult;
            }
        } catch (error) {
            console.error(`[Worker] Error executing code for ${data.studentId}:`, error);

            const contestId = data.contestId || data.courseContestId;
            notifyExecutionResult(contestId, data.studentId, {
                success: false,
                isError: true,
                problemId: data.problemId,
                message: error.message || 'Execution failed'
            });
            throw error;
        } finally {
            // Remove Redis lock
            if ((data.type === 'submit' || data.type === 'cc_submit') && !data.isPractice) {
                const redis = getRedis();
                const lockPrefix = data.type === 'cc_submit' ? 'lock:cc_submission' : 'lock:submission';
                const lockKey = `${lockPrefix}:${data.studentId}:${data.problemId}`;
                await redis.del(lockKey).catch(e => console.error(e));
            }
        }
    }, {
        connection: getNewRedisClient(),
        concurrency: 5 // Maintain piston API limit (5 req/sec is typical, 5 concurrency ensures safety)
    });

    worker.on('completed', (job) => {
        console.log(`[Worker] Execution Job ${job.id} completed successfully`);
    });

    worker.on('failed', (job, err) => {
        console.error(`[Worker] Execution Job ${job?.id} failed:`, err.message);
    });

    worker.on('error', (err) => {
        console.error('[Worker] Execution Worker error:', err.message);
    });

    console.log('👷 Code Execution Worker started (Concurrency: 5)');
    return worker;
};

module.exports = { startCodeExecutionWorker };
