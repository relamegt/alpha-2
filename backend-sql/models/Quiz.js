const prisma = require('../config/db');

const slugify = text => text ? text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') : 'quiz';

async function uniqueSlug(title) {
    const base = slugify(title) || 'quiz';
    let candidate = base;
    let counter = 2;
    // BUG FIX: added hard limit to prevent infinite loop
    while (counter <= 100) {
        const existing = await prisma.quiz.findUnique({ where: { slug: candidate } });
        if (!existing) return candidate;
        candidate = `${base}-${counter}`;
        counter++;
    }
    return `${base}-${Date.now()}`;
}

class Quiz {
    static async create(data) {
        const slug = await uniqueSlug(data.title);
        return await prisma.quiz.create({
            data: {
                slug,
                title: data.title,
                section: data.section,
                difficulty: data.difficulty ? (data.difficulty.charAt(0).toUpperCase() + data.difficulty.slice(1).toLowerCase()) : 'Medium',
                points: data.points || 0,
                description: data.description || '',
                quizQuestions: data.quizQuestions || [],
                article: data.article || data.editorial || {},
                articleLink: data.articleLink || data.editorialLink || null,
                createdBy: data.createdBy
            }
        });
    }

    static async findById(idOrSlug) {
        let quiz = null;
        try { quiz = await prisma.quiz.findUnique({ where: { id: idOrSlug } }); } catch (e) {}
        if (!quiz) { quiz = await prisma.quiz.findUnique({ where: { slug: idOrSlug } }); }
        return quiz;
    }

    static async findByIds(ids) {
        if (!ids || ids.length === 0) return [];
        const cleanIds = ids.map(p => typeof p === 'string' ? p : (p.id || p._id || (typeof p === 'object' && p !== null ? String(p) : p))).filter(id => id && typeof id === 'string');
        if (cleanIds.length === 0) return [];
        return await prisma.quiz.findMany({
            where: { id: { in: cleanIds } }
        });
    }

    static async findAll() {
        return await prisma.quiz.findMany({
            orderBy: [{ section: 'asc' }, { createdAt: 'desc' }]
        });
    }

    static async findAllSummary() {
        return await prisma.quiz.findMany({
            select: {
                id: true,
                slug: true,
                title: true,
                section: true,
                difficulty: true,
                points: true,
                createdAt: true
            },
            orderBy: [{ section: 'asc' }, { createdAt: 'desc' }]
        });
    }

    static async update(idOrSlug, updateData) {
        const quiz = await this.findById(idOrSlug);
        if (!quiz) return null;
        const { id, _id, createdAt, updatedAt, isSolved, isCompleted, type, ...validData } = updateData;
        
        if (validData.editorial) { validData.article = validData.editorial; delete validData.editorial; }
        if (validData.editorialLink) { validData.articleLink = validData.editorialLink; delete validData.editorialLink; }

        return await prisma.quiz.update({
            where: { id: quiz.id },
            data: validData
        });
    }

    static async delete(idOrSlug) {
        const quiz = await this.findById(idOrSlug);
        if (!quiz) return null;

        const Progress = require('./Progress');
        await Progress.deleteByContent(quiz.id, 'quiz');

        return await prisma.quiz.delete({ where: { id: quiz.id } });
    }

    static async count() {
        return await prisma.quiz.count({ where: { isContestProblem: false } });
    }
}

module.exports = Quiz;
