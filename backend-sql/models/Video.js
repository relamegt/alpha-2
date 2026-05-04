const prisma = require('../config/db');

const slugify = text => text ? text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') : 'video';

async function uniqueSlug(title) {
    const base = slugify(title) || 'video';
    let candidate = base;
    let counter = 2;
    // BUG FIX: added hard limit to prevent infinite loop
    while (counter <= 100) {
        const existing = await prisma.video.findUnique({ where: { slug: candidate } });
        if (!existing) return candidate;
        candidate = `${base}-${counter}`;
        counter++;
    }
    return `${base}-${Date.now()}`;
}

class Video {
    static async create(data) {
        const slug = await uniqueSlug(data.title);
        let points = 0; // Usually 0 or fixed for videos

        return await prisma.video.create({
            data: {
                slug,
                title: data.title,
                section: data.section,
                difficulty: data.difficulty ? (data.difficulty.charAt(0).toUpperCase() + data.difficulty.slice(1).toLowerCase()) : 'Easy',
                points: data.points || 0,
                description: data.description || '',
                videoUrl: data.videoUrl,
                summary: data.summary || data.article || data.editorial || {},
                summaryLink: data.summaryLink || data.articleLink || data.editorialLink || null,
                resources: data.resources || [],
                quizQuestions: data.quizQuestions || [],
                createdBy: data.createdBy
            }
        });
    }

    static async findById(idOrSlug) {
        let video = null;
        try { video = await prisma.video.findUnique({ where: { id: idOrSlug } }); } catch (e) {}
        if (!video) { video = await prisma.video.findUnique({ where: { slug: idOrSlug } }); }
        return video;
    }

    static async findByIds(ids) {
        if (!ids || ids.length === 0) return [];
        const cleanIds = ids.map(p => typeof p === 'string' ? p : (p.id || p._id || (typeof p === 'object' && p !== null ? String(p) : p))).filter(id => id && typeof id === 'string');
        if (cleanIds.length === 0) return [];
        return await prisma.video.findMany({
            where: { id: { in: cleanIds } }
        });
    }

    static async findAll() {
        return await prisma.video.findMany({
            orderBy: [{ section: 'asc' }, { createdAt: 'desc' }]
        });
    }

    static async findAllSummary() {
        return await prisma.video.findMany({
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
        const video = await this.findById(idOrSlug);
        if (!video) return null;
        const { id, _id, createdAt, updatedAt, isSolved, isCompleted, type, ...validData } = updateData;
        
        if (validData.editorial) { validData.summary = validData.editorial; delete validData.editorial; }
        if (validData.article) { validData.summary = validData.article; delete validData.article; }
        if (validData.editorialLink) { validData.summaryLink = validData.editorialLink; delete validData.editorialLink; }
        if (validData.articleLink) { validData.summaryLink = validData.articleLink; delete validData.articleLink; }

        return await prisma.video.update({
            where: { id: video.id },
            data: validData
        });
    }

    static async delete(idOrSlug) {
        const video = await this.findById(idOrSlug);
        if (!video) return null;

        const Progress = require('./Progress');
        await Progress.deleteByContent(video.id, 'video');

        return await prisma.video.delete({ where: { id: video.id } });
    }

    static async count() {
        return await prisma.video.count({ where: { isContestProblem: false } });
    }
}

module.exports = Video;
