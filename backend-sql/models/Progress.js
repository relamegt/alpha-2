const prisma = require('../config/db');

// ─── Maps content type → FK column name on the Progress row ──────────────────
const FK_COLUMN = {
    problem: 'problemId',
    coding:  'problemId',   // alias
    sql:     'sqlProblemId',
    video:   'videoId',
    quiz:    'quizId',
    article: 'articleId',
    practical: 'practicalExerciseId',
    assignment: 'assignmentId',
};

// Canonical contentType aliases (normalise 'coding' → 'problem')
const CANONICAL_TYPE = {
    problem: 'problem',
    coding:  'problem',
    sql:     'sql',
    video:   'video',
    quiz:    'quiz',
    article: 'article',
    practical: 'practical',
    assignment: 'assignment',
};

/**
 * Build the data payload for a Progress create/upsert.
 * Always sets contentType + contentId (the canonical unique key).
 * Also sets the specific FK column for JOIN performance.
 */
function _buildPayload(studentId, contentId, contentType, status, extra = {}) {
    const col          = FK_COLUMN[contentType];
    const canonicalType = CANONICAL_TYPE[contentType];

    if (!col || !canonicalType) {
        throw new Error(`Unknown contentType for Progress: "${contentType}"`);
    }

    return {
        studentId,
        contentType: canonicalType,
        contentId,
        // Nullify all FK columns, then set the one that matches
        problemId:    null,
        sqlProblemId: null,
        videoId:      null,
        quizId:       null,
        articleId:    null,
        practicalExerciseId: null,
        assignmentId: null,
        [col]: contentId,
        status,
        lastAttemptAt: new Date(),
        ...extra,
    };
}

class Progress {
    /**
     * Upsert a progress record for any content type.
     * Uses @@unique([studentId, contentType, contentId]) — no NULL collision possible.
     */
    static async create(studentId, contentId, contentType, status = 'in_progress') {
        const canonicalType = CANONICAL_TYPE[contentType];
        if (!canonicalType) {
            throw new Error(`Unknown contentType for Progress.create: "${contentType}"`);
        }

        const payload = _buildPayload(studentId, contentId, contentType, status);

        return await prisma.progress.upsert({
            where: {
                user_content_unique: {
                    studentId,
                    contentType: canonicalType,
                    contentId,
                }
            },
            update: {
                status,
                lastAttemptAt: new Date(),
                // Keep FK in sync (in case it was previously null from legacy data)
                [FK_COLUMN[contentType]]: contentId,
            },
            create: payload,
        });
    }

    static async findAllByStudent(studentId) {
        return await prisma.progress.findMany({
            where: { studentId },
            orderBy: { lastAttemptAt: 'desc' },
        });
    }

    static async findByStudent(studentId) {
        const records = await this.findAllByStudent(studentId);
        if (records.length === 0) return null;

        return {
            studentId,
            problemsSolved: records
                .filter(p => p.status === 'completed')
                .map(p => p.contentId),   // contentId is always set — no null issues
            viewedEditorials: [],
            courseProgress: [],
            streakDays: 0,
            maxStreakDays: 0,
            lastActiveDate: new Date(Math.max(...records.map(r => new Date(r.lastAttemptAt)))),
            totalTimeSpent: 0,
        };
    }

    static async updateStatus(studentId, contentId, contentType, status) {
        return await this.create(studentId, contentId, contentType, status);
    }

    static async updateProblemsSolved(studentId, contentId, contentType) {
        return await this.updateStatus(studentId, contentId, contentType, 'completed');
    }

    /**
     * Mark editorial viewed without downgrading a 'completed' record.
     */
    static async markEditorialViewed(studentId, contentId, contentType) {
        const canonicalType = CANONICAL_TYPE[contentType];
        if (!canonicalType) return;

        const existing = await prisma.progress.findUnique({
            where: {
                user_content_unique: { studentId, contentType: canonicalType, contentId }
            }
        });

        if (!existing) {
            return await this.create(studentId, contentId, contentType, 'in_progress');
        }
        // Don't overwrite a 'completed' record
        return existing;
    }

    static async hasViewedEditorial(studentId, contentId, contentType) {
        const canonicalType = CANONICAL_TYPE[contentType];
        if (!canonicalType) return false;

        const record = await prisma.progress.findUnique({
            where: {
                user_content_unique: { studentId, contentType: canonicalType, contentId }
            }
        });
        return !!record;
    }

    /**
     * Check if a specific piece of content is completed by a student.
     */
    static async isCompleted(studentId, contentId, contentType) {
        const canonicalType = CANONICAL_TYPE[contentType];
        if (!canonicalType) return false;

        const record = await prisma.progress.findUnique({
            where: {
                user_content_unique: { studentId, contentType: canonicalType, contentId }
            },
            select: { status: true },
        });
        return record?.status === 'completed';
    }

    static async getStatistics(studentId) {
        // Single query — use groupBy to count by status
        const progressRecords = await this.findAllByStudent(studentId);
        const completedRecords = progressRecords.filter(p => p.status === 'completed');
        const solvedIds = completedRecords.map(p => p.contentId);

        // Contest completions
        let solvedContestIds = [];
        try {
            const completedContests = await prisma.contestSubmission.findMany({
                where: { studentId, isFinalContestSubmission: true },
                select: { contestId: true },
                distinct: ['contestId'],
            });
            solvedContestIds = completedContests.map(c => c.contestId);
        } catch (e) { /* non-fatal */ }

        let solvedCourseContestIds = [];
        try {
            const completedCourseContests = await prisma.courseContestSubmission.findMany({
                where: { studentId, isFinalSubmission: true },
                select: { courseContestId: true },
                distinct: ['courseContestId'],
            });
            solvedCourseContestIds = completedCourseContests.map(c => c.courseContestId);
        } catch (e) { /* non-fatal */ }

        const allSolvedIds = [...new Set([...solvedIds, ...solvedContestIds, ...solvedCourseContestIds])];

        // Content counts — run in parallel
        const [problemCount, sqlCount, videoCount, quizCount, articleCount, assignmentCount, practicalCount] = await Promise.all([
            prisma.problem.count({ where: { isContestProblem: false } }),
            prisma.sqlProblem.count({ where: { isContestProblem: false } }),
            prisma.video.count(),
            prisma.quiz.count(),
            prisma.privateArticle.count(),
            prisma.assignment.count(),
            // Safety check for models that might be missing from schema but present in code
            prisma.practical_exercises ? prisma.practical_exercises.count() : Promise.resolve(0),
        ]);

        const totalContent = problemCount + sqlCount + videoCount + quizCount + articleCount + assignmentCount + practicalCount;

        return {
            problemsSolvedCount: allSolvedIds.length,
            problemsSolved: allSolvedIds,
            totalProblems: totalContent,
            courseProgress: [],
            streakDays: 0,
            maxStreakDays: 0,
            totalTimeSpent: 0,
            lastActiveDate: progressRecords.length > 0
                ? new Date(Math.max(...progressRecords.map(r => new Date(r.lastAttemptAt))))
                : new Date(),
        };
    }

    /**
     * Get a map of contentId → status for a batch of content IDs.
     * Used by the course sidebar to efficiently show green ticks.
     */
    static async getCompletionMap(studentId, contentIds) {
        if (!contentIds || contentIds.length === 0) return {};

        const records = await prisma.progress.findMany({
            where: {
                studentId,
                contentId: { in: contentIds },
                status: 'completed',
            },
            select: { contentId: true },
        });

        const map = {};
        records.forEach(r => { map[r.contentId] = true; });
        return map;
    }

    static async reset(studentId) {
        return await prisma.progress.deleteMany({ where: { studentId } });
    }

    static async deleteByStudent(studentId) {
        return await prisma.progress.deleteMany({ where: { studentId } });
    }

    /**
     * Delete all progress rows referencing a specific content item.
     * Called when a Problem/Video/Quiz/Article/SqlProblem is deleted.
     */
    static async deleteByContent(contentId, contentType) {
        const canonicalType = CANONICAL_TYPE[contentType];
        if (!canonicalType) return;
        return await prisma.progress.deleteMany({
            where: { contentType: canonicalType, contentId },
        });
    }
}

module.exports = Progress;
