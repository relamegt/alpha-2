const prisma = require('../config/db');

const slugify = text => text ? text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') : 'article';

async function uniqueSlug(title) {
    const base = slugify(title) || 'article';
    let candidate = base;
    let counter = 2;
    while (counter <= 100) {
        const existing = await prisma.publicArticle.findUnique({ where: { slug: candidate } });
        if (!existing) return candidate;
        candidate = `${base}-${counter}`;
        counter++;
    }
    return `${base}-${Date.now()}`;
}

class PublicArticle {
    static async create(data) {
        const slug = await uniqueSlug(data.title);
        return await prisma.publicArticle.create({
            data: {
                slug,
                title: data.title,
                description: data.description,
                thumbnail: data.thumbnail || null,
                githubUrl: data.githubUrl,
                youtubeUrl: data.youtubeUrl || null,
                category: data.category || 'General',
                readTime: data.readTime || '1 min read',
                publishedAt: data.publishedAt || new Date(),
                authorId: data.authorId || null,
            }
        });
    }

    static async findAll(filters = {}, userId = null) {
        const { category, search } = filters;
        const where = {};
        
        if (category && category !== 'All Articles') {
            where.category = category;
        }
        
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        const articles = await prisma.publicArticle.findMany({
            where,
            include: {
                author: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        profileImage: true,
                    }
                },
                _count: {
                    select: { savedByUsers: true }
                }
            },
            orderBy: { publishedAt: 'desc' },
            take: filters.limit ? parseInt(filters.limit) : undefined,
        });

        if (userId) {
            const savedIds = await prisma.publicArticleSave.findMany({
                where: { userId },
                select: { articleId: true }
            });
            const savedSet = new Set(savedIds.map(s => s.articleId));
            return articles.map(a => ({
                ...a,
                isSaved: savedSet.has(a.id)
            }));
        }

        return articles;
    }

    static async findBySlug(slug, userId = null) {
        const article = await prisma.publicArticle.findUnique({
            where: { slug },
            include: {
                author: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        profileImage: true,
                    }
                }
            }
        });

        if (article && userId) {
            const saved = await prisma.publicArticleSave.findUnique({
                where: {
                    userId_articleId: { userId, articleId: article.id }
                }
            });
            article.isSaved = !!saved;
        }

        return article;
    }

    static async getCategories() {
        const categories = await prisma.publicArticle.groupBy({
            by: ['category'],
            _count: {
                category: true
            }
        });
        // Filter out empty or null categories and return just the names
        return categories
            .filter(c => c.category)
            .map(c => c.category);
    }

    static async toggleSave(userId, articleId) {
        const existing = await prisma.publicArticleSave.findUnique({
            where: {
                userId_articleId: { userId, articleId }
            }
        });

        if (existing) {
            await prisma.publicArticleSave.delete({
                where: { id: existing.id }
            });
            return { saved: false };
        } else {
            await prisma.publicArticleSave.create({
                data: { userId, articleId }
            });
            return { saved: true };
        }
    }

    static async getSaved(userId) {
        const saves = await prisma.publicArticleSave.findMany({
            where: { userId },
            include: {
                article: {
                    include: {
                        author: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                profileImage: true,
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return saves.map(s => ({ ...s.article, isSaved: true }));
    }

    static async update(id, data) {
        return await prisma.publicArticle.update({
            where: { id },
            data
        });
    }

    static async delete(id) {
        return await prisma.publicArticle.delete({
            where: { id }
        });
    }
}

module.exports = PublicArticle;
