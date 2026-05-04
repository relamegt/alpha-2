const prisma = require('../config/db');

async function uniqueBatchSlug(name) {
    const base = (name || 'batch').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    let candidate = base;
    let counter = 2;
    while (true) {
        const existing = await prisma.batch.findUnique({ where: { slug: candidate } });
        if (!existing) return candidate;
        candidate = `${base}-${counter}`;
        counter++;
    }
}

class Batch {
    static async create(batchData) {
        const endYear = new Date(batchData.endDate).getFullYear();
        const deleteOn = new Date(endYear + 1, 0, 1);

        const slug = await uniqueBatchSlug(batchData.name);

        // Robust parsing for JSON fields if they arrive as strings
        const parseJson = (val) => {
            if (Array.isArray(val)) return val;
            if (typeof val === 'string') {
                try { return JSON.parse(val); } catch (e) { return []; }
            }
            return [];
        };

        return await prisma.batch.create({
            data: {
                slug,
                name: batchData.name,
                startDate: new Date(batchData.startDate),
                endDate: new Date(batchData.endDate),
                deleteOn: deleteOn,
                status: 'active',
                description: batchData.description || '',
                education: batchData.education || {},
                branches: parseJson(batchData.branches),
                assignedCourses: parseJson(batchData.assignedCourses),
                createdBy: batchData.createdBy,
            }
        });
    }

    static async findById(batchId) {
        const batch = await prisma.batch.findUnique({
            where: { id: batchId },
            include: {
                users: true,
                userBatches: {
                    include: {
                        user: true
                    }
                }
            }
        });
        if (!batch) return null;

        // Add isOnline helper for frontend
        batch.isOnline = batch.type === 'ONLINE';
        
        // Merge users from both relations (one-to-many and many-to-many)
        const studentMap = new Map();
        if (batch.users) batch.users.forEach(u => studentMap.set(u.id, u));
        if (batch.userBatches) batch.userBatches.forEach(ub => {
            if (ub.user) studentMap.set(ub.user.id, ub.user);
        });
        batch.users = Array.from(studentMap.values());
        
        // Fetch instructors manually since we use scalar lists in User record
        const instructors = await prisma.user.findMany({
            where: {
                role: 'instructor',
                OR: [
                    { batchId: batchId },
                    {
                        assignedBatchIds: {
                            array_contains: batchId
                        }
                    }
                ]
            }
        });
        batch.instructors = instructors;
        return batch;
    }

    static async findAll() {
        const batches = await prisma.batch.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return batches.map(b => ({
            ...b,
            isOnline: b.type === 'ONLINE'
        }));
    }

    static async update(batchId, updateData) {
        // Fetch current batch to get existing education JSON if needed
        const currentBatch = await prisma.batch.findUnique({
            where: { id: batchId },
            select: { education: true }
        });

        if (!currentBatch) throw new Error('Batch not found');

        const { id, _id, ...validData } = updateData;
        const education = typeof currentBatch.education === 'object' && currentBatch.education !== null ? { ...currentBatch.education } : {};

        // Handle dot-notation or partial objects for education
        const finalUpdate = {};
        Object.keys(validData).forEach(key => {
            if (key.startsWith('education.')) {
                const subKey = key.split('.')[1];
                education[subKey] = validData[key];
            } else if (key === 'education' && typeof validData[key] === 'object') {
                // Merge if it's an object
                Object.assign(education, validData[key]);
            } else if (key === 'startDate' || key === 'endDate') {
                finalUpdate[key] = new Date(validData[key]);
                if (key === 'endDate') {
                    const endYear = finalUpdate[key].getFullYear();
                    finalUpdate.deleteOn = new Date(endYear + 1, 0, 1);
                }
            } else {
                finalUpdate[key] = validData[key];
            }
        });

        if (Object.keys(education).length > 0) finalUpdate.education = education;

        return await prisma.batch.update({
            where: { id: batchId },
            data: finalUpdate
        });
    }

    static async incrementStudentCount(batchId) {
        return await prisma.batch.update({
            where: { id: batchId },
            data: { studentCount: { increment: 1 } }
        });
    }

    static async decrementStudentCount(batchId) {
        return await prisma.batch.update({
            where: { id: batchId },
            data: { studentCount: { decrement: 1 } }
        });
    }

    static async delete(batchId) {
        // Cascade delete handled by logic or DB constraints
        // In this case, we'll use a transaction
        return await prisma.$transaction([
            prisma.user.updateMany({
                where: { batchId: batchId },
                data: { batchId: null }
            }),
            prisma.contest.deleteMany({ where: { batchId: batchId } }),
            prisma.batch.delete({ where: { id: batchId } })
        ]);
    }

    // --- Added Missing Methods for Parity ---

    static async findByIds(batchIds) {
        if (!batchIds || batchIds.length === 0) return [];
        const ids = batchIds.map(id => typeof id === 'string' ? id : String(id));
        return await prisma.batch.findMany({ where: { id: { in: ids } } });
    }

    static async findActive() {
        const now = new Date();
        return await prisma.batch.findMany({
            where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
            orderBy: { createdAt: 'desc' }
        });
    }

    static async extendExpiry(batchId, extraDays) {
        const batch = await this.findById(batchId);
        if (!batch) return null;
        const newEndDate = new Date(batch.endDate);
        newEndDate.setDate(newEndDate.getDate() + parseInt(extraDays));
        return await prisma.batch.update({
            where: { id: batchId },
            data: { endDate: newEndDate }
        });
    }

    static async markAsExpired(batchId) {
        return await prisma.batch.update({
            where: { id: batchId },
            data: { isActive: false }
        });
    }

    static async updateStudentCount(batchId) {
        const count = await prisma.user.count({
            where: {
                OR: [
                    { batchId: String(batchId) },
                    { userBatches: { some: { batchId: String(batchId) } } }
                ],
                role: 'student'
            }
        });
        return await prisma.batch.update({
            where: { id: String(batchId) },
            data: { studentCount: count }
        });
    }

    static async findExpiringBatches(daysThreshold = 7) {
        const now = new Date();
        const future = new Date();
        future.setDate(future.getDate() + daysThreshold);
        return await prisma.batch.findMany({
            where: { isActive: true, endDate: { gt: now, lte: future } }
        });
    }

    static async findExpiredBatches() {
        return await prisma.batch.findMany({
            where: { isActive: true, endDate: { lt: new Date() } }
        });
    }

    static async getStatistics() {
        const [total, active] = await Promise.all([
            prisma.batch.count(),
            prisma.batch.count({ where: { isActive: true } })
        ]);
        return { total, active };
    }
}

module.exports = Batch;
