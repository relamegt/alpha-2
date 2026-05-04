const prisma = require('../config/db');

class UserBatch {
    static async create(data) {
        return await prisma.userBatch.create({
            data
        });
    }

    static async findByUserId(userId) {
        return await prisma.userBatch.findMany({
            where: { userId },
            include: {
                batch: true,
                course: true
            }
        });
    }

    static async findActiveByUserId(userId) {
        return await prisma.userBatch.findMany({
            where: {
                userId,
                OR: [
                    { accessExpiresAt: null },
                    { accessExpiresAt: { gt: new Date() } }
                ]
            },
            include: {
                course: true
            }
        });
    }

    static async findByUserIdAndBatchId(userId, batchId) {
        return await prisma.userBatch.findUnique({
            where: {
                userId_batchId: { userId, batchId }
            }
        });
    }
}

module.exports = UserBatch;
