const prisma = require('../config/db');

class PracticalExercise {
    static async findById(id) {
        if (!prisma.practical_exercises) return null;
        return await prisma.practical_exercises.findUnique({
            where: { id }
        });
    }

    static async findAllSummary() {
        if (!prisma.practical_exercises) return [];
        return await prisma.practical_exercises.findMany({
            select: {
                id: true,
                title: true,
                phaseType: true,
                points: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    static async delete(id) {
        if (!prisma.practical_exercises) return null;
        // Clean up submissions and drafts
        await Promise.all([
            prisma.practical_submissions ? prisma.practical_submissions.deleteMany({ where: { exerciseId: id } }) : Promise.resolve(),
            prisma.student_exercise_drafts ? prisma.student_exercise_drafts.deleteMany({ where: { exerciseId: id } }) : Promise.resolve()
        ]);

        return await prisma.practical_exercises.delete({
            where: { id }
        });
    }
}

module.exports = PracticalExercise;
