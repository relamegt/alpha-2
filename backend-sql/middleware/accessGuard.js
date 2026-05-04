const prisma = require('../config/db');

const courseAccessGuard = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        const { courseId } = req.params;

        if (!userId) return res.status(401).json({ message: 'Unauthorized' });
        
        // If courseId is not in params, check if it's in body or query (rare but possible)
        const finalCourseId = courseId || req.body.courseId || req.query.courseId;
        
        if (!finalCourseId) return next();

        // Admins and instructors typically have full access
        if (req.user.role === 'admin' || req.user.role === 'instructor') {
            return next();
        }

        // 1. Check Offline Batch access
        // We fetch the user's active batches and check if ANY of them are OFFLINE and include this course
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { batchId: true, assignedBatchIds: true }
        });

        if (!user) return res.status(404).json({ message: 'User not found' });

        const activeBatchIds = [user.batchId];
        if (user.assignedBatchIds && Array.isArray(user.assignedBatchIds)) {
            activeBatchIds.push(...user.assignedBatchIds);
        }
        const filteredBatchIds = activeBatchIds.filter(Boolean);

        if (filteredBatchIds.length > 0) {
            const batches = await prisma.batch.findMany({
                where: {
                    id: { in: filteredBatchIds },
                    type: 'OFFLINE'
                },
                select: { assignedCourses: true }
            });

            const hasOfflineAccess = batches.some(batch => {
                const courses = Array.isArray(batch.assignedCourses) 
                    ? batch.assignedCourses 
                    : (typeof batch.assignedCourses === 'string' ? JSON.parse(batch.assignedCourses) : []);
                return courses.includes(finalCourseId);
            });

            if (hasOfflineAccess) return next();
        }

        // 2. Check Online Enrollment
        const enrollment = await prisma.userBatch.findFirst({
            where: {
                userId,
                courseId: finalCourseId,
                paymentStatus: 'COMPLETED'
            }
        });

        if (!enrollment) {
            return res.status(403).json({ 
                success: false, 
                code: 'ENROLLMENT_REQUIRED',
                message: 'You are not enrolled in this course.' 
            });
        }

        // Check expiry for online enrollment
        if (enrollment.accessExpiresAt && new Date(enrollment.accessExpiresAt) < new Date()) {
            return res.status(403).json({ 
                success: false, 
                code: 'ACCESS_EXPIRED',
                message: 'Your access to this course has expired.',
                expiryDate: enrollment.accessExpiresAt
            });
        }

        next();
    } catch (error) {
        console.error('Access Guard Error:', error);
        res.status(500).json({ message: 'Error checking course access' });
    }
};

module.exports = courseAccessGuard;
