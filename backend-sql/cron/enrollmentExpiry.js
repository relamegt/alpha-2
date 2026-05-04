const cron = require('node-cron');
const prisma = require('../config/db');
const { Queue } = require('bullmq');
const { getNewRedisClient } = require('../config/redis');

let expiryQueue;
try {
    expiryQueue = new Queue('enrollment-expiry-reminder', {
        connection: getNewRedisClient()
    });
} catch (e) {
    console.warn('[Cron] Failed to initialize expiry queue (Redis might be down)');
}

const enrollmentExpiryJob = cron.schedule('0 4 * * *', async () => {
    console.log('🕐 Running enrollment expiry reminder job at 4:00 AM IST...');
    
    if (!expiryQueue) {
        console.error('❌ Expiry queue not initialized, skipping job.');
        return;
    }

    try {
        const now = new Date();
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(now.getDate() + 7);

        // Find enrollments expiring in the next 7 days that haven't expired yet
        const expiringEnrollments = await prisma.userBatch.findMany({
            where: {
                accessExpiresAt: {
                    gt: now,
                    lte: sevenDaysFromNow
                },
                paymentStatus: 'COMPLETED'
            },
            select: { id: true }
        });

        console.log(`[Cron] Found ${expiringEnrollments.length} enrollments expiring within 7 days.`);

        for (const enrollment of expiringEnrollments) {
            await expiryQueue.add(`remind_${enrollment.id}`, 
                { enrollmentId: enrollment.id },
                { 
                    removeOnComplete: true,
                    removeOnFail: { age: 24 * 3600 } // Keep failed jobs for a day
                }
            );
        }

        console.log(`✅ Successfully queued ${expiringEnrollments.length} expiry reminders`);
    } catch (error) {
        console.error('❌ Enrollment expiry job error:', error);
    }
}, {
    timezone: "Asia/Kolkata"
});

const startEnrollmentExpiryJob = () => {
    enrollmentExpiryJob.start();
    console.log('✅ Enrollment expiry cron job started (Daily at 4:00 AM IST)');
};

module.exports = { startEnrollmentExpiryJob };
