const prisma = require('../config/db');

async function resolveProblemId(idOrSlug) {
    if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(idOrSlug)) {
        return idOrSlug;
    }
    const problem = await prisma.problem.findUnique({ where: { slug: idOrSlug } });
    return problem ? problem.id : null;
}

async function uniqueSlug(title) {
    const base = (title || 'contest').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    let candidate = base;
    let counter = 2;
    while (true) {
        const existing = await prisma.contest.findUnique({ where: { slug: candidate } });
        if (!existing) return candidate;
        candidate = `${base}-${counter}`;
        counter++;
    }
}

class Contest {
    static async create(contestData) {
        const slug = await uniqueSlug(contestData.title);
        const problemIds = contestData.problems ? await Promise.all(contestData.problems.map(async p => await resolveProblemId(String(p)))) : [];
        
        return await prisma.contest.create({
            data: {
                slug,
                title: contestData.title,
                description: contestData.description || '',
                startTime: new Date(contestData.startTime),
                endTime: new Date(contestData.endTime),
                duration: contestData.duration || 60,
                maxAttempts: typeof contestData.maxAttempts === 'number' ? contestData.maxAttempts : 1,
                proctoringEnabled: contestData.proctoringEnabled !== false,
                tabSwitchLimit: contestData.tabSwitchLimit || 3,
                maxViolations: contestData.maxViolations || 5,
                batchId: contestData.batchId || null,
                status: contestData.status || 'upcoming',
                rules: contestData.rules || '',
                difficulty: contestData.difficulty || 'Medium',
                coinsReward: contestData.coinsReward || 0,
                createdBy: contestData.createdBy,
                problems: {
                    connect: problemIds.filter(Boolean).map(id => ({ id }))
                }
            }
        });
    }

    static async findById(idOrSlug) {
        let contest = null;
        try {
            contest = await prisma.contest.findUnique({
                where: { id: idOrSlug },
                include: { problems: true }
            });
        } catch (e) {}
        if (!contest) {
            contest = await prisma.contest.findUnique({
                where: { slug: String(idOrSlug) },
                include: { problems: true }
            });
        }
        return contest;
    }

    static async findAll() {
        return await prisma.contest.findMany({
            orderBy: { startTime: 'desc' }
        });
    }

    static async findByBatchId(batchId) {
        return await prisma.contest.findMany({
            where: { batchId },
            include: { problems: true },
            orderBy: { startTime: 'asc' }
        });
    }

    static async update(id, updateData) {
        const { _id, id: _, problems, isSolo, courseId, ...validData } = updateData;
        
        const data = { ...validData };
        if (updateData.startTime) data.startTime = new Date(updateData.startTime);
        if (updateData.endTime) data.endTime = new Date(updateData.endTime);
        
        if (problems) {
            const problemIds = await Promise.all(problems.map(async p => await resolveProblemId(String(p))));
            data.problems = {
                set: problemIds.filter(Boolean).map(pid => ({ id: pid }))
            };
        }

        return await prisma.contest.update({
            where: { id },
            data
        });
    }

    static async delete(id) {
        // Delete all contest submissions first
        await prisma.contestSubmission.deleteMany({ where: { contestId: id } });
        return await prisma.contest.delete({ where: { id } });
    }

    static async hasStarted(contestId) {
        const contest = await prisma.contest.findUnique({
            where: { id: contestId },
            select: { startTime: true }
        });
        if (!contest) return false;
        return new Date() >= new Date(contest.startTime);
    }

    static async getStatistics(contestId) {
        const contest = await prisma.contest.findUnique({
            where: { id: contestId },
            include: { problems: true }
        });
        if (!contest) return null;

        const totalSubmissions = await prisma.contestSubmission.count({
            where: { contestId }
        });
        const acceptedSubmissions = await prisma.contestSubmission.count({
            where: { contestId, verdict: 'Accepted' }
        });
        const uniqueStudents = await prisma.contestSubmission.findMany({
            where: { contestId },
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

    // --- Added Missing Methods for Parity ---

    static async findActiveContests() {
        const now = new Date();
        return await prisma.contest.findMany({
            where: { startTime: { lte: now }, endTime: { gte: now } },
            orderBy: { startTime: 'desc' }
        });
    }

    static async findUpcomingContests() {
        return await prisma.contest.findMany({
            where: { startTime: { gt: new Date() } },
            orderBy: { startTime: 'asc' }
        });
    }

    static async findPastContests() {
        return await prisma.contest.findMany({
            where: { endTime: { lt: new Date() } },
            orderBy: { endTime: 'desc' }
        });
    }

    static async find(query) {
        return await prisma.contest.findMany({ where: query });
    }

    static async deleteByBatchId(batchId) {
        return await prisma.contest.deleteMany({ where: { batchId } });
    }

    static async isActive(contestId) {
        const contest = await this.findById(contestId);
        if (!contest) return false;
        const now = new Date();
        return now >= new Date(contest.startTime) && now <= new Date(contest.endTime);
    }

    static async hasEnded(contestId) {
        const contest = await this.findById(contestId);
        if (!contest) return true;
        return new Date() > new Date(contest.endTime);
    }

    static async getDuration(contestId) {
        const contest = await this.findById(contestId);
        if (!contest) return 0;
        return (new Date(contest.endTime) - new Date(contest.startTime)) / (1000 * 60);
    }

    static async countByBatch(batchId) {
        return await prisma.contest.count({ where: { batchId } });
    }
}

module.exports = Contest;
