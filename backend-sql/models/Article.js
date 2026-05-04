const prisma = require('../config/db');

const slugify = text => text ? text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') : 'article';

async function uniqueSlug(title) {
    const base = slugify(title) || 'article';
    let candidate = base;
    let counter = 2;
    // BUG FIX: added hard limit to prevent infinite loop
    while (counter <= 100) {
        const existing = await prisma.article.findUnique({ where: { slug: candidate } });
        if (!existing) return candidate;
        candidate = `${base}-${counter}`;
        counter++;
    }
    return `${base}-${Date.now()}`;
}

class Article {
    static async create(data) {
        const slug = await uniqueSlug(data.title);
        return await prisma.article.create({
            data: {
                slug,
                title: data.title,
                section: data.section,
                difficulty: data.difficulty ? (data.difficulty.charAt(0).toUpperCase() + data.difficulty.slice(1).toLowerCase()) : 'Easy',
                points: data.points || 0,
                description: data.description || '',
                article: data.article || data.editorial || {},
                articleLink: data.articleLink || data.editorialLink || null,
                createdBy: data.createdBy
            }
        });
    }

    static async findById(idOrSlug) {
        let article = null;
        try { article = await prisma.article.findUnique({ where: { id: idOrSlug } }); } catch (e) {}
        if (!article) { article = await prisma.article.findUnique({ where: { slug: idOrSlug } }); }
        return article;
    }

    static async findByIds(ids) {
        if (!ids || ids.length === 0) return [];
        const cleanIds = ids.map(p => typeof p === 'string' ? p : (p.id || p._id || (typeof p === 'object' && p !== null ? String(p) : p))).filter(id => id && typeof id === 'string');
        if (cleanIds.length === 0) return [];
        return await prisma.article.findMany({
            where: { id: { in: cleanIds } }
        });
    }

    static async findAll() {
        return await prisma.article.findMany({
            orderBy: [{ section: 'asc' }, { createdAt: 'desc' }]
        });
    }

    static async findAllSummary() {
        return await prisma.article.findMany({
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
        const article = await this.findById(idOrSlug);
        if (!article) return null;
        const { _id, id, createdAt, updatedAt, isSolved, isCompleted, type, status, ...validData } = updateData;
        
        if (validData.editorial) { validData.article = validData.editorial; delete validData.editorial; }
        if (validData.editorialLink) { validData.articleLink = validData.editorialLink; delete validData.editorialLink; }

        return await prisma.article.update({
            where: { id: article.id },
            data: validData
        });
    }

    static async delete(idOrSlug) {
        const article = await this.findById(idOrSlug);
        if (!article) return null;

        const Progress = require('./Progress');
        await Progress.deleteByContent(article.id, 'article');

        return await prisma.article.delete({ where: { id: article.id } });
    }

    static async count() {
        return await prisma.article.count({ where: { isContestProblem: false } });
    }
}

module.exports = Article;
