const prisma = require('../config/db');

class Assignment {
    static async findById(id) {
        try {
            return await prisma.assignment.findUnique({
                where: { id }
            });
        } catch (e) {
            console.warn(`[Assignment Model] findById failed for ${id}:`, e.message);
            return null;
        }
    }

    static async findByIds(ids) {
        if (!ids || ids.length === 0) return [];
        return await prisma.assignment.findMany({
            where: { id: { in: ids.map(String) } }
        });
    }

    static async findAll() {
        return await prisma.assignment.findMany({
            orderBy: { createdAt: 'desc' }
        });
    }

    static async findByCourse(courseId) {
        return await prisma.assignment.findMany({
            where: { courseId }
        });
    }

    static async update(id, data) {
        return await prisma.assignment.update({
            where: { id },
            data
        });
    }

    static async delete(id) {
        return await prisma.assignment.delete({
            where: { id }
        });
    }
}

module.exports = Assignment;
