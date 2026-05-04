const prisma = require('../config/db');

const slugify = text => text ? text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') : 'sql-problem';

async function uniqueSlug(title) {
    const base = slugify(title) || 'sql-problem';
    let candidate = base;
    let counter = 2;
    // BUG FIX: added hard limit to prevent infinite loop
    while (counter <= 100) {
        const existing = await prisma.sqlProblem.findUnique({ where: { slug: candidate } });
        if (!existing) return candidate;
        candidate = `${base}-${counter}`;
        counter++;
    }
    return `${base}-${Date.now()}`;
}

class SqlProblem {
    static async bulkCreate(problems, createdBy) {
        const results = [];
        for (const prob of problems) {
            prob.createdBy = createdBy || prob.createdBy;
            results.push(await this.create(prob));
        }
        return results;
    }

    static async create(data) {
        const slug = await uniqueSlug(data.title);
        
        const diffInput = data.difficulty?.toLowerCase() || 'easy';
        const difficulty = diffInput.charAt(0).toUpperCase() + diffInput.slice(1);
        const points = diffInput === 'easy' ? 20 : diffInput === 'medium' ? 50 : 100;

        return await prisma.sqlProblem.create({
            data: {
                slug,
                title: data.title,
                section: data.section,
                difficulty,
                points,
                description: data.description,
                article: data.article || data.editorial || {},
                articleLink: data.articleLink || data.editorialLink || null,
                supported_dbs: data.supported_dbs || [],
                solutionCode: data.solutionCode || {},
                sqlSchema: data.sqlSchema || null,
                testCases: data.testCases || [],
                isContestProblem: data.isContestProblem || false,
                contestId: data.contestId || null,
                createdBy: data.createdBy
            }
        });
    }

    static async findById(idOrSlug) {
        let problem = null;
        try {
            problem = await prisma.sqlProblem.findUnique({ where: { id: idOrSlug } });
        } catch (e) {}
        if (!problem) {
            problem = await prisma.sqlProblem.findUnique({ where: { slug: idOrSlug } });
        }
        return problem;
    }

    static async findByIds(ids) {
        if (!ids || ids.length === 0) return [];
        const cleanIds = ids.map(p => typeof p === 'string' ? p : (p.id || p._id || (typeof p === 'object' && p !== null ? String(p) : p))).filter(id => id && typeof id === 'string');
        if (cleanIds.length === 0) return [];
        return await prisma.sqlProblem.findMany({
            where: { id: { in: cleanIds } }
        });
    }

    static async findAll() {
        return await prisma.sqlProblem.findMany({
            where: { isContestProblem: false },
            orderBy: [{ section: 'asc' }, { difficulty: 'asc' }]
        });
    }

    static async findAllSummary() {
        return await prisma.sqlProblem.findMany({
            where: { isContestProblem: false },
            select: {
                id: true,
                slug: true,
                title: true,
                section: true,
                difficulty: true,
                points: true,
                type: true,
                createdAt: true
            },
            orderBy: [{ section: 'asc' }, { difficulty: 'asc' }]
        });
    }

    static async update(idOrSlug, updateData) {
        const problem = await this.findById(idOrSlug);
        if (!problem) return null;

        const { _id, id, createdAt, updatedAt, isSolved, isCompleted, type, status, ...validData } = updateData;
        if (validData.editorial) {
            validData.article = validData.editorial;
            delete validData.editorial;
        }
        if (validData.editorialLink) {
            validData.articleLink = validData.editorialLink;
            delete validData.editorialLink;
        }

        return await prisma.sqlProblem.update({
            where: { id: problem.id },
            data: validData
        });
    }

    static async delete(idOrSlug) {
        const problem = await this.findById(idOrSlug);
        if (!problem) return null;

        // BUG FIX: cleanup related rows first
        const Progress = require('./Progress');
        await Promise.all([
            prisma.submission.deleteMany({ where: { sqlProblemId: problem.id } }),
            Progress.deleteByContent(problem.id, 'sql')
        ]);

        return await prisma.sqlProblem.delete({
            where: { id: problem.id }
        });
    }

    static async findBySection(section) {
        return await prisma.sqlProblem.findMany({ where: { section, isContestProblem: false } });
    }

    static async findContestProblems(contestId) {
        return await prisma.sqlProblem.findMany({ where: { contestId } });
    }

    static async getDifficultyWiseCount() {
        const counts = await prisma.sqlProblem.groupBy({
            by: ['difficulty'],
            where: { isContestProblem: false },
            _count: { _all: true }
        });
        const result = {};
        counts.forEach(c => result[c.difficulty || 'Uncategorized'] = c._count._all);
        return result;
    }

    static async count() {
        return await prisma.sqlProblem.count({ where: { isContestProblem: false } });
    }
}

module.exports = SqlProblem;
