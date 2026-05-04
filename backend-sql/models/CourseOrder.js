const prisma = require('../config/db');

class CourseOrder {
    static async create(data) {
        return await prisma.courseOrder.create({
            data
        });
    }

    static async findByRazorpayId(razorpayOrderId) {
        return await prisma.courseOrder.findUnique({
            where: { razorpayOrderId },
            include: {
                user: true,
                course: true
            }
        });
    }

    static async updateStatus(razorpayOrderId, status) {
        return await prisma.courseOrder.update({
            where: { razorpayOrderId },
            data: { status }
        });
    }

    static async findPendingByUserIdAndCourseId(userId, courseId) {
        return await prisma.courseOrder.findFirst({
            where: {
                userId,
                courseId,
                status: 'PENDING'
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
    }
}

module.exports = CourseOrder;
