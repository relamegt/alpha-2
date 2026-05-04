const prisma = require('../config/db');

class SheetProgress {
  // Toggle completion status
  static async toggleCompletion(data) {
    const { userId, sheetProblemId, sheetId, sectionId, subsectionId, completed } = data;
    return await prisma.sheetProgress.upsert({
      where: {
        userId_sheetProblemId_sheetId_sectionId_subsectionId: {
          userId,
          sheetProblemId,
          sheetId,
          sectionId,
          subsectionId
        }
      },
      update: {
        completed,
        completedAt: completed ? new Date() : null
      },
      create: {
        userId,
        sheetProblemId,
        sheetId,
        sectionId,
        subsectionId,
        completed,
        completedAt: completed ? new Date() : null
      }
    });
  }

  // Toggle revision status
  static async toggleRevision(data) {
    const { userId, sheetProblemId, sheetId, sectionId, subsectionId, markedForRevision } = data;
    return await prisma.sheetProgress.upsert({
      where: {
        userId_sheetProblemId_sheetId_sectionId_subsectionId: {
          userId,
          sheetProblemId,
          sheetId,
          sectionId,
          subsectionId
        }
      },
      update: {
        markedForRevision,
        revisionMarkedAt: markedForRevision ? new Date() : null
      },
      create: {
        userId,
        sheetProblemId,
        sheetId,
        sectionId,
        subsectionId,
        markedForRevision,
        revisionMarkedAt: markedForRevision ? new Date() : null
      }
    });
  }

  // Get progress for a specific user and sheet
  static async findByUserAndSheet(userId, sheetId) {
    return await prisma.sheetProgress.findMany({
      where: { userId, sheetId }
    });
  }

  // Get summary stats for a user
  static async getUserStats(userId) {
    const progress = await prisma.sheetProgress.findMany({
      where: { userId }
    });
    
    const completed = progress.filter(p => p.completed);
    const revision = progress.filter(p => p.markedForRevision);

    const subsectionStats = completed.reduce((acc, p) => {
      acc[p.subsectionId] = (acc[p.subsectionId] || 0) + 1;
      return acc;
    }, {});

    const sectionStats = completed.reduce((acc, p) => {
      acc[p.sectionId] = (acc[p.sectionId] || 0) + 1;
      return acc;
    }, {});

    return {
      totalCompleted: new Set(completed.map(p => p.sheetProblemId)).size,
      totalMarkedForRevision: new Set(revision.map(p => p.sheetProblemId)).size,
      completedProblems: Array.from(new Set(completed.map(p => p.sheetProblemId))),
      markedForRevisionIds: Array.from(new Set(revision.map(p => p.sheetProblemId))),
      sheetStats: completed.reduce((acc, p) => {
        acc[p.sheetId] = (acc[p.sheetId] || 0) + 1;
        return acc;
      }, {}),
      subsectionStats,
      sectionStats,
      recentActivity: completed.sort((a, b) => b.completedAt - a.completedAt).slice(0, 10)
    };
  }
}

module.exports = SheetProgress;
