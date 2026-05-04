const Razorpay = require('razorpay');
const crypto = require('crypto');
const prisma = require('../config/db');
const Course = require('../models/Course');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'dummy_key',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret',
});

exports.enrollFree = async (req, res, next) => {
    try {
        const { courseId } = req.body;
        const userId = req.user.userId;

        const course = await prisma.course.findUnique({
            where: { id: courseId },
            include: { onlineBatch: true }
        });

        if (!course || !course.isPublished) {
            return res.status(404).json({ message: 'Course not available' });
        }

        if (course.isPaid) {
            return res.status(400).json({ message: 'This course is not free' });
        }

        let onlineBatchId = course.onlineBatchId;
        if (!onlineBatchId) {
            const batch = await Course.ensureOnlineBatch(courseId);
            onlineBatchId = batch.id;
        }

        // Calculate expiry
        let accessExpiresAt = null;
        if (course.accessYears) {
            accessExpiresAt = new Date();
            accessExpiresAt.setFullYear(accessExpiresAt.getFullYear() + course.accessYears);
        }

        const enrollment = await prisma.userBatch.upsert({
            where: {
                userId_batchId: {
                    userId,
                    batchId: onlineBatchId
                }
            },
            update: {
                accessExpiresAt,
                paymentStatus: 'COMPLETED',
                courseId: course.id
            },
            create: {
                userId,
                batchId: onlineBatchId,
                courseId: course.id,
                accessExpiresAt,
                paymentStatus: 'COMPLETED'
            }
        });

        res.json({ success: true, message: 'Enrolled successfully', enrollment });
    } catch (error) {
        next(error);
    }
};

exports.createOrder = async (req, res, next) => {
    try {
        const { courseId } = req.body;
        const userId = req.user.userId;

        if (!courseId) {
            return res.status(400).json({ message: 'Course ID is required' });
        }

        const course = await prisma.course.findUnique({
            where: { id: courseId }
        });

        if (!course || !course.isPublished || !course.isPaid) {
            return res.status(400).json({ message: 'Invalid course for purchase' });
        }

        const options = {
            amount: Math.round(course.price * 100), // Razorpay expects paise
            currency: course.currency || 'INR',
            receipt: `receipt_${Date.now()}_${userId}`,
        };

        const order = await razorpay.orders.create(options);

        // Store order
        await prisma.courseOrder.create({
            data: {
                userId,
                courseId: course.id,
                razorpayOrderId: order.id,
                amount: course.price,
                currency: course.currency || 'INR',
                status: 'PENDING'
            }
        });

        res.json({ success: true, order });
    } catch (error) {
        console.error('Create Razorpay Order Error:', error);
        res.status(500).json({ success: false, message: 'Failed to create order' });
    }
};

exports.verifyPayment = async (req, res, next) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const userId = req.user.userId;

        const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'dummy_secret');
        hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
        const generatedSignature = hmac.digest('hex');

        if (generatedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Invalid payment signature' });
        }

        // Find order
        const order = await prisma.courseOrder.findUnique({
            where: { razorpayOrderId: razorpay_order_id },
            include: { course: true }
        });

        if (!order) {
            return res.status(404).json({ message: 'Order info not found' });
        }

        // Update order
        await prisma.courseOrder.update({
            where: { id: order.id },
            data: { status: 'COMPLETED' }
        });

        const course = order.course;
        let onlineBatchId = course.onlineBatchId;
        if (!onlineBatchId) {
             const batch = await Course.ensureOnlineBatch(course.id);
             onlineBatchId = batch.id;
        }

        // Calculate expiry
        let accessExpiresAt = null;
        if (course.accessYears) {
            accessExpiresAt = new Date();
            accessExpiresAt.setFullYear(accessExpiresAt.getFullYear() + course.accessYears);
        }

        // Enroll user
        await prisma.userBatch.upsert({
            where: {
                userId_batchId: {
                    userId,
                    batchId: onlineBatchId
                }
            },
            update: {
                accessExpiresAt,
                paymentStatus: 'COMPLETED',
                paymentId: razorpay_payment_id,
                amountPaid: order.amount,
                courseId: course.id
            },
            create: {
                userId,
                batchId: onlineBatchId,
                courseId: course.id,
                accessExpiresAt,
                paymentStatus: 'COMPLETED',
                paymentId: razorpay_payment_id,
                amountPaid: order.amount
            }
        });

        res.json({ success: true, message: 'Payment verified and enrollment completed' });
    } catch (error) {
        next(error);
    }
};
