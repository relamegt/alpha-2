const prisma = require('../config/db');

async function resolveProblemId(idOrSlug) {
    if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(idOrSlug)) {
        return idOrSlug;
    }
    const problem = await prisma.problem.findUnique({ where: { slug: idOrSlug } });
    return problem ? problem.id : null;
}

async function uniqueSlug(title) {
    const base = (title || 'course-contest').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    let candidate = base;
    let counter = 2;
    while (true) {
        const existing = await prisma.courseContest.findUnique({ where: { slug: candidate } });
        if (!existing) return candidate;
        candidate = `${base}-${counter}`;
        counter++;
    }
}

class CourseContest {
    static async _populateProblems(contest) {
        if (!contest) return null;
        if (!contest.problemIds || contest.problemIds.length === 0) {
            contest.problems = [];
            return contest;
        }
        const Problem = require('./Problem');
        contest.problems = await Problem.findByIds(contest.problemIds);
        return contest;
    }

    static async create(data) {
        const slug = await uniqueSlug(data.title);
        const problemIds = data.problems ? await Promise.all(data.problems.map(async p => await resolveProblemId(String(p)))) : [];
        
        const contest = await prisma.courseContest.create({
            data: {
                slug,
                title: data.title,
                description: data.description || '',
                duration: data.duration || 60,
                maxAttempts: typeof data.maxAttempts === 'number' ? data.maxAttempts : 1,
                proctoringEnabled: data.proctoringEnabled !== false,
                tabSwitchLimit: data.tabSwitchLimit || 3,
                maxViolations: data.maxViolations || 5,
                rules: data.rules || '',
                difficulty: data.difficulty || 'Medium',
                coinsReward: data.coinsReward || 0,
                createdBy: data.createdBy,
                courseId: data.courseId || null,
                problemIds: problemIds.filter(Boolean)
            }
        });
        return this._populateProblems(contest);
    }

    static async findByCourseId(courseId) {
        const contests = await prisma.courseContest.findMany({
            where: { courseId },
            orderBy: { createdAt: 'desc' }
        });
        return Promise.all(contests.map(c => this._populateProblems(c)));
    }

    static async findByIds(ids) {
        if (!ids || ids.length === 0) return [];
        const contests = await prisma.courseContest.findMany({
            where: { id: { in: ids } },
            orderBy: { createdAt: 'desc' }
        });
        return Promise.all(contests.map(c => this._populateProblems(c)));
    }

    static async findById(idOrSlug) {
        if (!idOrSlug || idOrSlug === 'undefined' || idOrSlug === 'null') return null;

        let contest = null;
        const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(idOrSlug);

        if (isUUID) {
            try {
                contest = await prisma.courseContest.findUnique({
                    where: { id: idOrSlug }
                });
            } catch (e) {
                console.error('[CourseContest.findById] UUID lookup error:', e.message);
            }
        }
        
        if (!contest) {
            try {
                contest = await prisma.courseContest.findUnique({
                    where: { slug: String(idOrSlug) }
                });
            } catch (e) {
                console.error('[CourseContest.findById] Slug lookup error:', e.message);
            }
        }

        return this._populateProblems(contest);
    }

    static async findAll() {
        const contests = await prisma.courseContest.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return Promise.all(contests.map(c => this._populateProblems(c)));
    }

    static async update(id, data) {
        const { id: _, problems, createdAt, updatedAt, isSolved, isCompleted, type, status, ...validData } = data;
        
        const updatePayload = { ...validData };
        if (problems) {
            const problemIds = await Promise.all(problems.map(async p => await resolveProblemId(String(p))));
            updatePayload.problemIds = problemIds.filter(Boolean);
        }

        const contest = await prisma.courseContest.update({
            where: { id },
            data: updatePayload
        });
        return this._populateProblems(contest);
    }

    static async delete(id) {
        // Delete all course contest related data
        await prisma.$transaction([
            prisma.courseContestSubmission.deleteMany({ where: { courseContestId: id } }),
            prisma.courseContestLeaderboard.deleteMany({ where: { courseContestId: id } }),
            prisma.courseContest.delete({ where: { id } })
        ]);
        return { success: true };
    }

    static async getStatistics(courseContestId) {
        const contest = await this.findById(courseContestId);
        if (!contest) return null;

        const totalSubmissions = await prisma.courseContestSubmission.count({
            where: { courseContestId }
        });
        const acceptedSubmissions = await prisma.courseContestSubmission.count({
            where: { courseContestId, verdict: 'Accepted' }
        });
        const uniqueStudents = await prisma.courseContestSubmission.findMany({
            where: { courseContestId },
            select: { studentId: true },
            distinct: ['studentId']
        });

        return {
            totalProblems: contest.problems?.length || 0,
            totalSubmissions,
            acceptedSubmissions,
            uniqueParticipants: uniqueStudents.length,
            acceptanceRate: totalSubmissions > 0 ? ((acceptedSubmissions / totalSubmissions) * 100).toFixed(2) : 0
        };
    }
}

module.exports = CourseContest;
