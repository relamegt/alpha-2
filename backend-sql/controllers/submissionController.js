const Submission  = require('../models/Submission');
const Problem     = require('../models/Problem');
const SqlProblem  = require('../models/SqlProblem');
const Video       = require('../models/Video');
const Quiz        = require('../models/Quiz');
const Article     = require('../models/Article');
const Progress    = require('../models/Progress');
const Leaderboard = require('../models/Leaderboard');
const User        = require('../models/User');
const ProgressService = require('../services/progressService');
const { VERDICTS, CONTENT_TYPES, DB_TYPES, USER_ROLES } = require('../utils/constants');
const { executeWithTestCases, validateCode } = require('../services/judge0Service');
const { executeSqlWithTestCases }            = require('../services/sqlJudgeService');
const prisma = require('../config/db');

// ─── Polymorphic problem lookup ───────────────────────────────────────────────
// Runs all 5 model lookups IN PARALLEL to avoid 5 sequential DB round-trips.
// Returns the first non-null result with a guaranteed `.type` field.
const findProblemAcrossModels = async (idOrSlug) => {
    const [problem, sqlProblem, video, quiz, article] = await Promise.allSettled([
        Problem.findById(idOrSlug),
        SqlProblem.findById(idOrSlug),
        Video.findById(idOrSlug),
        Quiz.findById(idOrSlug),
        Article.findById(idOrSlug),
    ]);

    const candidates = [
        { result: problem,    fallbackType: 'problem' },
        { result: sqlProblem, fallbackType: 'sql'     },
        { result: video,      fallbackType: 'video'   },
        { result: quiz,       fallbackType: 'quiz'    },
        { result: article,    fallbackType: 'article' },
    ];

    for (const { result, fallbackType } of candidates) {
        if (result.status === 'fulfilled' && result.value) {
            const item = result.value;
            if (!item.type) item.type = fallbackType;
            return item;
        }
    }
    return null;
};

// ─── Run code (sample test cases only, or custom input) ───────────────────────
const runCode = async (req, res) => {
    console.log('\n📥 [API] POST /student/code/run');
    try {
        const { problemId, code, language, customInput, customInputs } = req.body;
        const isCustom      = customInput !== undefined && customInput !== null && customInput !== '';
        const isMultiCustom = Array.isArray(customInputs) && customInputs.length > 0;

        const problem = await findProblemAcrossModels(problemId);
        if (!problem) {
            return res.status(404).json({ success: false, message: 'Problem not found' });
        }

        let results = [];
        let finalVerdict = 'Accepted';
        let totalPassed  = 0;

        if (problem.type !== 'sql') {
            const validation = validateCode(code, language);
            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    message: 'Code validation failed',
                    errors: validation.errors,
                });
            }
        }

        const executeRunner = problem.type === 'sql' ? executeSqlWithTestCases : executeWithTestCases;

        const getSolutionCode = () => {
            const solCode = problem.solutionCode?.[language] ||
                Object.values(problem.solutionCode || {}).find(c => c);
            const solLang = problem.solutionCode?.[language]
                ? language
                : Object.keys(problem.solutionCode || {}).find(k => problem.solutionCode[k]);
            return { solCode, solLang };
        };

        // ── SQL ───────────────────────────────────────────────────────────────
        if (problem.type === 'sql') {
            let casesToRun = [];
            if (isMultiCustom) {
                casesToRun = customInputs.map(c => ({
                    input: c.input, output: c.expectedOutput ?? undefined,
                    isHidden: false, isCustom: c.isCustom ?? false,
                }));
            } else if (isCustom) {
                casesToRun = [{ input: customInput, output: undefined, isHidden: false, isCustom: true }];
            } else {
                const sampleCases = Array.isArray(problem.testCases)
                    ? problem.testCases.slice(0, 2).filter(tc => !tc.isHidden)
                    : [];
                casesToRun = sampleCases;
            }

            const sqlResult = await executeSqlWithTestCases(language, code, casesToRun, problem.timeLimit, problem.id, problem);
            results = sqlResult.results.map(r => ({
                input: r.input, expectedOutput: r.expectedOutput, actualOutput: r.actualOutput,
                passed: r.passed, verdict: r.verdict, error: r.error,
                isHidden: r.isHidden || false, isCustom: r.isCustom || false, hasSolution: true,
            }));
            totalPassed  = sqlResult.testCasesPassed;
            finalVerdict = sqlResult.verdict;

        // ── Multi-custom ──────────────────────────────────────────────────────
        } else if (isMultiCustom) {
            const casesNeedingSolution = customInputs.filter(c => c.expectedOutput === undefined || c.expectedOutput === null);
            const userTestCases = customInputs.map(c => ({ input: c.input, output: c.expectedOutput ?? undefined, isHidden: false }));
            const { solCode, solLang } = getSolutionCode();
            const needsSolution = casesNeedingSolution.length > 0 && solCode && solLang;

            const [userResult, solResult] = await Promise.all([
                executeRunner(language, code, userTestCases, problem.timeLimit),
                needsSolution
                    ? executeRunner(solLang, solCode,
                        casesNeedingSolution.map(c => ({ input: c.input, output: undefined, isHidden: false })),
                        problem.timeLimit).catch(() => null)
                    : Promise.resolve(null),
            ]);

            let solOutputMap = {};
            if (solResult) {
                casesNeedingSolution.forEach((c, idx) => {
                    solOutputMap[c.input] = solResult.results[idx]?.actualOutput ?? null;
                });
            }

            results = customInputs.map((c, i) => {
                const userOut     = userResult.results[i]?.actualOutput ?? '';
                const userVerdict = userResult.results[i]?.verdict ?? userResult.verdict;
                const userError   = userResult.results[i]?.error ?? null;
                const expectedOut = c.expectedOutput ?? solOutputMap[c.input] ?? null;
                const passed      = expectedOut !== null
                    ? (userOut?.trim() === expectedOut?.trim())
                    : (userVerdict === 'Accepted' || !userError);
                return {
                    input: c.input,
                    expectedOutput: expectedOut ?? '(No reference solution available)',
                    actualOutput: userOut, passed,
                    verdict: passed ? 'Accepted' : (userError ? userVerdict : 'Wrong Answer'),
                    error: userError, isHidden: false, isCustom: c.isCustom ?? false,
                    hasSolution: expectedOut !== null,
                };
            });
            totalPassed  = results.filter(r => r.passed).length;
            finalVerdict = results.every(r => r.passed)   ? 'Accepted'
                : results.some(r => r.verdict === 'Compilation Error') ? 'Compilation Error'
                : results.some(r => r.verdict === 'Runtime Error')     ? 'Runtime Error'
                : results.some(r => r.verdict === 'TLE')               ? 'TLE'
                : 'Wrong Answer';

        // ── Single custom ─────────────────────────────────────────────────────
        } else if (isCustom) {
            const userTestCase = [{ input: customInput, output: undefined, isHidden: false }];
            const { solCode, solLang } = getSolutionCode();

            const [userResult, solRunResult] = await Promise.all([
                executeRunner(language, code, userTestCase, problem.timeLimit),
                solCode && solLang
                    ? executeRunner(solLang, solCode,
                        [{ input: customInput, output: undefined, isHidden: false }],
                        problem.timeLimit).catch(() => null)
                    : Promise.resolve(null),
            ]);

            const userOutput  = userResult.results[0]?.actualOutput ?? '';
            const userVerdict = userResult.results[0]?.verdict ?? userResult.verdict;
            const userError   = userResult.results[0]?.error ?? userResult.error;
            const expectedOut = solRunResult?.results[0]?.actualOutput ?? null;
            const passed      = expectedOut !== null
                ? (userOutput?.trim() === expectedOut?.trim())
                : (userVerdict === 'Accepted' || userVerdict === 'No output');

            results = [{
                input: customInput,
                expectedOutput: expectedOut ?? '(No reference solution available)',
                actualOutput: userOutput, passed,
                verdict: expectedOut !== null ? (passed ? 'Accepted' : 'Wrong Answer') : userVerdict,
                error: userError, isHidden: false, isCustom: true, hasSolution: !!expectedOut,
            }];
            totalPassed  = passed ? 1 : 0;
            finalVerdict = results[0].verdict;

        // ── Sample test cases ─────────────────────────────────────────────────
        } else {
            const testCases = await Problem.getSampleTestCases(problem.id);
            const result    = await executeRunner(language, code, testCases, problem.timeLimit, problem.id);
            results = result.results.map(r => ({
                input: r.input, expectedOutput: r.expectedOutput, actualOutput: r.actualOutput,
                passed: r.passed, verdict: r.verdict, error: r.error,
                isHidden: false, isCustom: false, hasSolution: true,
            }));
            totalPassed  = result.testCasesPassed;
            finalVerdict = result.verdict ?? (totalPassed === results.length ? 'Accepted' : 'Wrong Answer');
        }

        console.log(`   ✅ Run Complete: ${finalVerdict} (${totalPassed}/${results.length})`);
        return res.json({
            success: true,
            message: 'Code executed successfully',
            verdict: finalVerdict,
            testCasesPassed: totalPassed,
            totalTestCases: results.length,
            results,
            error: results.find(r => r.error)?.error || null,
            isCustomInput: isCustom || isMultiCustom,
        });
    } catch (error) {
        console.error('   ❌ Controller Error:', error);
        return res.status(500).json({
            success: false, message: 'Code execution failed', error: error.message,
        });
    }
};

// ─── Submit code (all test cases) ────────────────────────────────────────────
const submitCode = async (req, res) => {
    try {
        const { problemId, code, language, courseId } = req.body;
        const studentId = req.user.userId;
        console.log(`\n📥 [API] POST /student/code/submit - Problem: ${problemId}, Lang: ${language}`);

        const problem = await findProblemAcrossModels(problemId);
        if (!problem) {
            return res.status(404).json({ success: false, message: 'Problem not found' });
        }

        const executeRunner = problem.type === 'sql' ? executeSqlWithTestCases : executeWithTestCases;

        if (problem.type !== 'sql') {
            const validation = validateCode(code, language);
            if (!validation.valid) {
                return res.status(400).json({
                    success: false, message: 'Code validation failed', errors: validation.errors,
                });
            }
        } else {
            if (!['mysql', 'postgres', 'postgresql'].includes(language)) {
                return res.status(400).json({
                    success: false, message: 'dbType must be "mysql" or "postgres" for SQL problems',
                });
            }
        }

        const allTestCases = problem.testCases || [];
        const result = await executeRunner(language, code, allTestCases, problem.timeLimit, problem.id, problem);

        const tempSubmissionId = require('crypto').randomUUID();
        const submittedAt = new Date();

        const mappedResults = result.results.map(r => ({
            input:          r.isHidden ? null : r.input,
            expectedOutput: r.isHidden ? null : r.expectedOutput,
            actualOutput:   r.isHidden ? null : r.actualOutput,
            passed:   r.passed,
            verdict:  r.verdict,
            error:    r.isHidden ? null : r.error,
            isHidden: r.isHidden || false,
        }));

        // ── Determine first-solve AND Save in Transaction ─────────────────────
        let isFirstSolve = false;
        let coinsEarned  = 0;

        // Perform all DB operations atomically
        const resultData = await ProgressService.handleContentCompletion(
            studentId,
            problem,
            {
                code,
                language,
                verdict: result.verdict,
                testCasesPassed: result.testCasesPassed,
                totalTestCases: result.totalTestCases,
                executionTime: result.executionTime,
                memoryUsed: result.memoryUsed
            },
            result.verdict === VERDICTS.ACCEPTED && req.user.role === USER_ROLES.STUDENT,
            courseId
        );

        isFirstSolve = resultData.isFirstSolve;
        coinsEarned = resultData.coinsEarned;

        console.log(`   ✅ Submit: ${result.verdict} (${result.testCasesPassed}/${result.totalTestCases}), Coins: ${coinsEarned}, FirstSolve: ${isFirstSolve}`);

        res.json({
            success: true,
            message: 'Code submitted successfully',
            verdict:        result.verdict,
            testCasesPassed: result.testCasesPassed,
            totalTestCases:  result.totalTestCases,
            isFirstSolve,
            coinsEarned,
            totalAlphaCoins: resultData.totalAlphaCoins,
            submission: {
                id: resultData.submission?.id || tempSubmissionId,
                verdict: result.verdict,
                testCasesPassed: result.testCasesPassed,
                totalTestCases:  result.totalTestCases,
                submittedAt, 
                coinsEarned, 
                totalCoins: resultData.totalAlphaCoins, 
                isFirstSolve,
            },
            results:    mappedResults,
            error:      result.error,
            totalCoins: resultData.totalAlphaCoins,
        });

    } catch (error) {
        console.error('Submit code error:', error);
        return res.status(500).json({
            success: false, message: 'Code submission failed', error: error.message,
        });
    }
};

// ─── Get submission by ID ────────────────────────────────────────────────────
const getSubmissionById = async (req, res) => {
    try {
        const { submissionId } = req.params;
        const submission = await Submission.findById(submissionId);
        if (!submission) {
            return res.status(404).json({ success: false, message: 'Submission not found' });
        }
        if (req.user.role === 'student' && submission.studentId !== req.user.userId) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        return res.json({ success: true, submission });
    } catch (error) {
        console.error('Get submission by ID error:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch submission', error: error.message });
    }
};

// ─── Get student submissions ─────────────────────────────────────────────────
const getStudentSubmissions = async (req, res) => {
    try {
        const studentId = req.params.studentId || req.user.userId;
        const { limit = 100, problemId } = req.query;

        if (req.user.role === 'student' && studentId !== req.user.userId) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        let submissions;
        if (problemId) {
            let actualProblemId = problemId;
            const uuidRe = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
            if (problemId && problemId !== 'global' && problemId !== 'all' && !uuidRe.test(problemId)) {
                const p = await findProblemAcrossModels(problemId);
                if (p) { actualProblemId = p.id; }
                else    { return res.status(404).json({ success: false, message: 'Problem not found' }); }
            }
            submissions = await Submission.findByStudentAndProblem(studentId, actualProblemId);
        } else {
            submissions = await Submission.findByStudent(studentId, parseInt(limit));
        }

        return res.json({ success: true, count: submissions.length, submissions });
    } catch (error) {
        console.error('Get student submissions error:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch submissions', error: error.message });
    }
};

// ─── Get recent submissions ───────────────────────────────────────────────────
const getRecentSubmissions = async (req, res) => {
    try {
        const userId = req.user.userId;
        const role   = req.user.role;
        const { limit = 10 } = req.query;

        let submissions;
        if (role === 'admin' || role === 'instructor') {
            submissions = await Submission.findAllRecentSubmissions(parseInt(limit));
        } else {
            submissions = await Submission.findRecentSubmissions(userId, parseInt(limit));
        }

        return res.json({ success: true, count: submissions.length, submissions });
    } catch (error) {
        console.error('Get recent submissions error:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch recent submissions', error: error.message });
    }
};

// ─── Get submission statistics ────────────────────────────────────────────────
const getSubmissionStatistics = async (req, res) => {
    try {
        const studentId = req.params.studentId || req.user.userId;
        if (req.user.role === 'student' && studentId !== req.user.userId) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        const stats = await Submission.getStatistics(studentId);
        return res.json({ success: true, statistics: stats });
    } catch (error) {
        console.error('Get submission statistics error:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch statistics', error: error.message });
    }
};

// ─── Mark a non-coding problem as complete (video / quiz / article) ───────────
const markProblemComplete = async (req, res) => {
    try {
        const { problemId } = req.params;
        const { answers, courseId }   = req.body;
        const studentId     = req.user.userId;

        const problem = await findProblemAcrossModels(problemId);
        if (!problem) {
            return res.status(404).json({ success: false, message: 'Problem not found' });
        }

        if (!problem.type || problem.type === 'problem') {
            return res.status(400).json({
                success: false,
                message: 'Coding problems must be submitted with code via /submit',
            });
        }

        const contentType = problem.type; // 'sql' | 'video' | 'quiz' | 'article'
        const isSql       = contentType === 'sql';

        // ── Atomic completion via ProgressService ─────────────────────────────
        const hasAnswers = answers && Object.keys(answers).length > 0;
        const isQuiz        = contentType === CONTENT_TYPES.QUIZ;
        const isVideo       = contentType === CONTENT_TYPES.VIDEO;
        const isQuizOrVideo = isQuiz || isVideo;

        let testCasesPassed = 0;
        let totalTestCases  = 0;

        if (isQuizOrVideo && problem.quizQuestions) {
            try {
                const questions = Array.isArray(problem.quizQuestions) 
                    ? problem.quizQuestions 
                    : (typeof problem.quizQuestions === 'string' ? JSON.parse(problem.quizQuestions) : []);
                
                totalTestCases = questions.length;
                if (answers) {
                    questions.forEach((q, idx) => {
                        // Support both numeric index and string ID for quiz keys
                        const qId = q.id !== undefined ? String(q.id) : String(idx);
                        const studentAns = answers[qId] !== undefined ? answers[qId] : answers[idx];

                        const correctVal = q.correctOptionIndex !== undefined ? q.correctOptionIndex : (q.correctOption !== undefined ? q.correctOption : q.correctAnswer);
                        
                        if (studentAns !== undefined && String(studentAns) === String(correctVal)) {
                            testCasesPassed++;
                        }
                    });
                }
            } catch (e) {
                console.warn('[Quiz Grading Failed]:', e.message);
            }
        }

        const submissionData = {
            code: (isQuizOrVideo && hasAnswers) ? JSON.stringify(answers) : `Completed: ${contentType}`,
            language: (isQuizOrVideo && hasAnswers) ? 'json' : 'text',
            verdict: VERDICTS.ACCEPTED,
            testCasesPassed,
            totalTestCases,
            metadata: (isQuizOrVideo && hasAnswers) ? { answers } : {}
        };

        const resultData = await ProgressService.handleContentCompletion(
            studentId,
            problem,
            submissionData,
            true,
            courseId
        );

        return res.json({
            success: true,
            message: 'Problem marked as complete',
            isFirstSolve: resultData.isFirstSolve, 
            coinsEarned: resultData.coinsEarned,
            totalAlphaCoins: resultData.totalAlphaCoins,
            testCasesPassed,
            totalTestCases,
            verdict: VERDICTS.ACCEPTED,
        });

    } catch (error) {
        console.error('Mark problem complete error:', error);
        return res.status(500).json({
            success: false, message: 'Failed to mark problem complete', error: error.message,
        });
    }
};

// ─── Get latest submission for a problem/content ─────────────────────────────
const getLatestSubmissionByProblem = async (req, res) => {
    try {
        const { problemId } = req.params;
        const studentId = req.user.userId;

        const problem = await findProblemAcrossModels(problemId);
        if (!problem) {
            return res.status(404).json({ success: false, message: 'Problem not found' });
        }

        const fkColumn = ProgressService._getFkColumn(problem.type || CONTENT_TYPES.PROBLEM);
        
        const latestSubmission = await prisma.submission.findFirst({
            where: { studentId, [fkColumn]: problem.id },
            orderBy: { createdAt: 'desc' }
        });

        return res.json({
            success: true,
            submission: latestSubmission
        });
    } catch (error) {
        console.error('Get latest submission error:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch latest submission' });
    }
};

module.exports = {
    runCode,
    submitCode,
    getSubmissionById,
    getStudentSubmissions,
    getRecentSubmissions,
    getSubmissionStatistics,
    markProblemComplete,
    getLatestSubmissionByProblem,
};
