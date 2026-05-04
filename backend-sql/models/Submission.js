const prisma = require('../config/db');

class Submission {
    // Create new submission
    static async create(submissionData) {
        return await prisma.submission.create({
            data: {
                studentId: submissionData.studentId,
                problemId: submissionData.problemId || null,
                sqlProblemId: submissionData.sqlProblemId || null,
                code: submissionData.code,
                language: submissionData.language,
                verdict: submissionData.verdict,
                testCasesPassed: submissionData.testCasesPassed || 0,
                totalTestCases: submissionData.totalTestCases || 0,
                memoryUsed: submissionData.memoryUsed || 0,
                executionTime: submissionData.executionTime || 0,
                points: submissionData.points || 0,
                metadata: submissionData.metadata || {}
            }
        });
    }

    // Find submission by ID
    static async findById(submissionId) {
        const submission = await prisma.submission.findUnique({
            where: { id: submissionId },
            include: {
                problem: true,
                sqlProblem: true,
                video: true,
                quiz: true,
                privateArticle: true,
                student: true
            }
        });
        if (!submission) return null;
        return { ...submission, submittedAt: submission.createdAt };
    }

    // Find all submissions by student
    static async findByStudent(studentId, limit = 100) {
        const submissions = await prisma.submission.findMany({
            where: { studentId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: { problem: true, sqlProblem: true }
        });
        return submissions.map(sub => ({ ...sub, submittedAt: sub.createdAt }));
    }

    // Find submissions by student and content ID (polymorphic)
    static async findByStudentAndProblem(studentId, contentId) {
        const submissions = await prisma.submission.findMany({
            where: {
                studentId,
                OR: [
                    { problemId: contentId },
                    { sqlProblemId: contentId },
                    { videoId: contentId },
                    { quizId: contentId },
                    { articleId: contentId }
                ]
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
            include: { problem: true, sqlProblem: true, video: true, quiz: true, privateArticle: true }
        });
        return submissions.map(sub => ({ ...sub, submittedAt: sub.createdAt }));
    }

    // Find recent submissions (last N submissions) with problem details
    static async findRecentSubmissions(studentId, limit = 10) {
        const submissions = await prisma.submission.findMany({
            where: { studentId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                problem: { select: { title: true, difficulty: true, slug: true } },
                sqlProblem: { select: { title: true, difficulty: true, slug: true } },
                video: { select: { title: true, difficulty: true, slug: true } },
                quiz: { select: { title: true, difficulty: true, slug: true } },
                privateArticle: { select: { title: true, difficulty: true, slug: true } }
            }
        });

        return submissions.map(sub => {
            const problem = sub.problem || sub.sqlProblem || sub.video || sub.quiz || sub.privateArticle;
            let type = 'coding';
            if (sub.sqlProblemId) type = 'sql';
            else if (sub.videoId) type = 'video';
            else if (sub.quizId) type = 'quiz';
            else if (sub.articleId) type = 'article';

            return {
                ...sub,
                submittedAt: sub.createdAt,
                problemTitle: problem ? problem.title : 'Unknown Content',
                problemDifficulty: problem ? problem.difficulty : 'Easy',
                problemType: type,
                problemSlug: problem ? problem.slug : null
            };
        });
    }

    // Find all recent submissions (global) with details
    static async findAllRecentSubmissions(limit = 10) {
        const submissions = await prisma.submission.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                student: { select: { username: true, email: true } },
                problem: { select: { title: true } },
                sqlProblem: { select: { title: true } },
                video: { select: { title: true } },
                quiz: { select: { title: true } },
                privateArticle: { select: { title: true } }
            }
        });

        return submissions.map(sub => ({
            id: sub.id,
            code: sub.code,
            language: sub.language,
            verdict: sub.verdict,
            submittedAt: sub.createdAt,
            user: sub.student ? { username: sub.student.username, email: sub.student.email } : null,
            problem: {
                title: sub.problem?.title || sub.sqlProblem?.title || 'Unknown',
                type: sub.sqlProblemId ? 'sql' : 'coding'
            }
        }));
    }

    // Get submission heatmap data (365 days)
    static async getHeatmapData(studentId) {
        const oneYearAgo = new Date();
        oneYearAgo.setDate(oneYearAgo.getDate() - 365);

        const submissions = await prisma.submission.findMany({
            where: {
                studentId,
                createdAt: { gte: oneYearAgo }
            },
            select: { createdAt: true }
        });

        const heatmapData = {};
        submissions.forEach(sub => {
            const dateKey = sub.createdAt.toDateString();
            heatmapData[dateKey] = (heatmapData[dateKey] || 0) + 1;
        });

        return heatmapData;
    }

    // Get verdict breakdown (pie chart data)
    static async getVerdictData(studentId) {
        const groups = await prisma.submission.groupBy({
            by: ['verdict'],
            where: { studentId },
            _count: { _all: true },
        });

        const verdictCounts = {
            'Accepted': 0,
            'Partially Accepted': 0,
            'Wrong Answer': 0,
            'Time Limit Exceeded': 0,
            'Runtime Error': 0,
            'Compilation Error': 0
        };

        groups.forEach(g => {
            const v = g.verdict;
            if (verdictCounts.hasOwnProperty(v)) {
                verdictCounts[v] = g._count._all;
            } else if (v === 'TLE') {
                verdictCounts['Time Limit Exceeded'] = g._count._all;
            }
        });

        return verdictCounts;
    }

    // Get language usage statistics
    static async getLanguageStats(studentId) {
        const groups = await prisma.submission.groupBy({
            by: ['language'],
            where: {
                studentId,
                verdict: 'Accepted'
            },
            _count: { _all: true },
        });

        const languageCounts = {};
        groups.forEach(g => {
            languageCounts[g.language] = g._count._all;
        });

        return languageCounts;
    }

    // Check if problem/content is solved/completed by student
    static async isProblemSolved(studentId, contentId) {
        const acceptedSubmission = await prisma.submission.findFirst({
            where: {
                studentId,
                verdict: 'Accepted',
                OR: [
                    { problemId: contentId },
                    { sqlProblemId: contentId },
                    { videoId: contentId },
                    { quizId: contentId },
                    { articleId: contentId }
                ]
            }
        });
        return acceptedSubmission !== null;
    }

    // Get solved problems by student
    static async getSolvedProblems(studentId) {
        const acceptedSubmissions = await prisma.submission.findMany({
            where: {
                studentId,
                verdict: 'Accepted'
            },
            select: { problemId: true, sqlProblemId: true }
        });

        const codingIds = acceptedSubmissions.filter(s => s.problemId).map(s => s.problemId);
        const sqlIds = acceptedSubmissions.filter(s => s.sqlProblemId).map(s => s.sqlProblemId);
        return [...new Set([...codingIds, ...sqlIds])];
    }

    // Get solved problems count by difficulty
    static async getSolvedCountByDifficulty(studentId) {
        const acceptedSubmissions = await prisma.submission.findMany({
            where: {
                studentId,
                verdict: 'Accepted'
            },
            include: {
                problem: { select: { difficulty: true } },
                sqlProblem: { select: { difficulty: true } }
            }
        });

        const counts = { easy: 0, medium: 0, hard: 0 };
        acceptedSubmissions.forEach(sub => {
            const problem = sub.problem || sub.sqlProblem;
            if (!problem) return;
            const diff = (problem.difficulty || '').toLowerCase();
            if (diff === 'easy') counts.easy++;
            else if (diff === 'medium') counts.medium++;
            else if (diff === 'hard') counts.hard++;
        });

        return counts;
    }

    // Get submission statistics
    // BUG FIX: replaced findMany({ take: 1000 }) with groupBy aggregation.
    // A hard cap of 1000 rows gives wrong acceptance rates for active students.
    // groupBy runs a single SQL COUNT per verdict — correct for any dataset size.
    static async getStatistics(studentId) {
        const groups = await prisma.submission.groupBy({
            by: ['verdict'],
            where: { studentId },
            _count: { _all: true },
        });

        const countFor = (verdict) =>
            groups.find(g => g.verdict === verdict)?._count._all || 0;

        const total    = groups.reduce((sum, g) => sum + g._count._all, 0);
        const accepted = countFor('Accepted');

        return {
            totalSubmissions:    total,
            acceptedSubmissions: accepted,
            wrongAnswers:        countFor('Wrong Answer'),
            timeouts:            countFor('TLE'),
            runtimeErrors:       countFor('Runtime Error'),
            compilationErrors:   countFor('Compilation Error'),
            acceptanceRate:      total > 0 ? ((accepted / total) * 100).toFixed(2) : '0.00',
        };
    }

    static async deleteByStudent(studentId) {
        return await prisma.submission.deleteMany({ where: { studentId } });
    }

    static async deleteByProblem(problemId, isSql = false) {
        const where = {};
        if (isSql) where.sqlProblemId = problemId;
        else where.problemId = problemId;
        return await prisma.submission.deleteMany({ where });
    }
}

module.exports = Submission;
