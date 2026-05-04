const { Worker } = require('bullmq');
const prisma = require('../config/db');
const { getNewRedisClient } = require('../config/redis');
const { sendCourseExpiryReminder } = require('../services/emailService');

const startEnrollmentExpiryWorker = () => {
    // Each BullMQ Worker needs its own dedicated connection
    const worker = new Worker('enrollment-expiry-reminder', async (job) => {
        const { enrollmentId } = job.data;
        console.log(`[Worker] Processing expiry reminder for enrollment: ${enrollmentId}`);

        try {
            const enrollment = await prisma.userBatch.findUnique({
                where: { id: enrollmentId },
                include: { user: true, course: true }
            });

            if (!enrollment || !enrollment.user || !enrollment.course) {
                console.warn(`[Worker] Enrollment ${enrollmentId} or related data not found, skipping.`);
                return;
            }

            const userName = enrollment.user.firstName || enrollment.user.username || 'Student';
            
            await sendCourseExpiryReminder(
                enrollment.user.email,
                userName,
                enrollment.course.title,
                enrollment.accessExpiresAt
            );

            console.log(`[Worker] Successfully sent expiry reminder to: ${enrollment.user.email}`);
        } catch (error) {
            console.error(`[Worker] Error sending expiry reminder for ${enrollmentId}:`, error);
            throw error; // Let BullMQ handle retry
        }
    }, {
        connection: getNewRedisClient(),
        concurrency: 2
    });

    worker.on('completed', (job) => {
        console.log(`[Worker] Expiry reminder job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
        console.error(`[Worker] Expiry reminder job ${job?.id} failed:`, err.message);
    });

    console.log('👷 Enrollment Expiry Reminder Worker started');
    return worker;
};

module.exports = { startEnrollmentExpiryWorker };
