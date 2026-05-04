const prisma = require('../config/db');

class SheetProblem {
  static async create(data) {
    return await prisma.sheetProblem.create({
      data: {
        title: data.title,
        practiceLink: data.practiceLink || "",
        platform: data.platform || "",
        youtubeLink: data.youtubeLink || "",
        editorialLink: data.editorialLink || "",
        notesLink: data.notesLink || "",
        difficulty: data.difficulty || "Medium",
        tags: data.tags || [],
        createdBy: data.createdBy,
        subsectionId: data.subsectionId || null
      }
    });
  }

  static async findById(id) {
    return await prisma.sheetProblem.findUnique({
      where: { id }
    });
  }

  static async findAll() {
    return await prisma.sheetProblem.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  static async update(id, data) {
    return await prisma.sheetProblem.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });
  }

  static async delete(id) {
    return await prisma.sheetProblem.delete({
      where: { id }
    });
  }

  static async addToSubsection(problemId, subsectionId) {
    return await prisma.sheetProblem.update({
      where: { id: problemId },
      data: { subsectionId }
    });
  }

  static async removeFromSubsection(problemId) {
    return await prisma.sheetProblem.update({
      where: { id: problemId },
      data: { subsectionId: null }
    });
  }

  static async search(query, limit = 20) {
    return await prisma.sheetProblem.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { platform: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getBatch(ids) {
    if (!ids || ids.length === 0) return [];
    return await prisma.sheetProblem.findMany({
      where: {
        id: { in: ids }
      }
    });
  }
}

module.exports = SheetProblem;
