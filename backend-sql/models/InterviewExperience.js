const prisma = require('../config/db');

class InterviewExperience {
  static async create(data) {
    return await prisma.interviewExperience.create({
      data: {
        authorId: data.authorId,
        companyName: data.companyName,
        jobPosition: data.jobPosition,
        experienceLevel: data.experienceLevel || "0-1 years",
        difficulty: data.difficulty || "Medium",
        timeline: data.timeline || "1-2 Weeks",
        applyMethod: data.applyMethod || "Job Portal",
        interviewMode: data.interviewMode || "Remote",
        salaryRange: data.salaryRange,
        outcome: data.outcome || "Selected",
        preparationTips: data.preparationTips,
        additionalFeedback: data.additionalFeedback,
        isAnonymous: data.isAnonymous || false,
        rounds: data.rounds || []
      }
    });
  }

  static async findById(id, userId = null) {
    const experience = await prisma.interviewExperience.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            profileImage: true
          }
        }
      }
    });

    if (!experience) return null;

    let isUpvoted = false;
    if (userId && Array.isArray(experience.upvotedBy)) {
      isUpvoted = experience.upvotedBy.includes(userId);
    }

    return { ...experience, isUpvoted };
  }

  static async findAll(filters = {}, userId = null) {
    const where = {};
    if (filters.companyName) where.companyName = { contains: filters.companyName, mode: 'insensitive' };
    if (filters.difficulty && filters.difficulty !== 'All') where.difficulty = filters.difficulty;
    if (filters.outcome && filters.outcome !== 'All') where.outcome = filters.outcome;

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    const skip = (page - 1) * limit;

    let orderBy = [{ createdAt: 'desc' }];
    if (filters.sortBy === 'Most Upvoted') {
      orderBy = [{ upvotes: 'desc' }, { createdAt: 'desc' }];
    }

    const [experiences, total] = await Promise.all([
      prisma.interviewExperience.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
              profileImage: true
            }
          }
        },
        orderBy,
        skip,
        take: limit
      }),
      prisma.interviewExperience.count({ where })
    ]);

    const experiencesWithUpvote = experiences.map(exp => ({
      ...exp,
      isUpvoted: userId && Array.isArray(exp.upvotedBy) ? exp.upvotedBy.includes(userId) : false
    }));

    return {
      experiences: experiencesWithUpvote,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async toggleUpvote(experienceId, userId) {
    const experience = await prisma.interviewExperience.findUnique({
      where: { id: experienceId }
    });

    if (!experience) throw new Error('Experience not found');

    let upvotedBy = Array.isArray(experience.upvotedBy) ? experience.upvotedBy : [];
    const index = upvotedBy.indexOf(userId);

    if (index > -1) {
      // Remove upvote
      upvotedBy.splice(index, 1);
      return await prisma.interviewExperience.update({
        where: { id: experienceId },
        data: { 
          upvotes: { decrement: 1 },
          upvotedBy: upvotedBy
        }
      });
    } else {
      // Add upvote
      upvotedBy.push(userId);
      return await prisma.interviewExperience.update({
        where: { id: experienceId },
        data: { 
          upvotes: { increment: 1 },
          upvotedBy: upvotedBy
        }
      });
    }
  }

  static async getPopularCompanies() {
    const companies = await prisma.interviewExperience.groupBy({
      by: ['companyName'],
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 10
    });

    // Logo mapping helper
    const getLogo = (name) => {
      const lower = name.toLowerCase();
      if (lower.includes('google')) return 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_Logo.png';
      if (lower.includes('amazon')) return 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Amazon_icon.svg';
      if (lower.includes('microsoft')) return 'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg';
      if (lower.includes('oracle')) return 'https://upload.wikimedia.org/wikipedia/commons/5/50/Oracle_logo.svg';
      if (lower.includes('uber')) return 'https://upload.wikimedia.org/wikipedia/commons/c/cc/Uber_logo_2018.png';
      if (lower.includes('meta') || lower.includes('facebook')) return 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg';
      if (lower.includes('netflix')) return 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg';
      if (lower.includes('apple')) return 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg';
      return null;
    };

    return companies.map(c => ({
      name: c.companyName,
      count: c._count.id,
      logo: getLogo(c.companyName)
    }));
  }

  static async update(id, data) {
    const { authorId, id: _, createdAt, updatedAt, ...validData } = data;
    return await prisma.interviewExperience.update({
      where: { id },
      data: validData
    });
  }

  static async delete(id) {
    return await prisma.interviewExperience.delete({
      where: { id }
    });
  }
}

module.exports = InterviewExperience;
