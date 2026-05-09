const cron = require('node-cron');
const prisma = require('../config/db');

/**
 * Daily usage reset cron job
 * Runs every day at midnight (00:00)
 */
const initUsageResetCron = () => {
    // Schedule to run at 00:00 every day
    cron.schedule('0 0 * * *', async () => {
        console.log('[CRON] Starting daily usage reset...');
        try {
            const result = await prisma.user.updateMany({
                data: {
                    dailyAiTokensUsed: 0,
                    dailyCompilerUsed: 0,
                    dailySubmissionsUsed: 0,
                    lastUsageReset: new Date()
                }
            });
            console.log(`[CRON] Successfully reset usage for ${result.count} users.`);
        } catch (error) {
            console.error('[CRON] Error resetting daily usage:', error);
        }
    });

    /**
     * Optional: Run a check for expired subscriptions once a day as well
     */
    cron.schedule('0 1 * * *', async () => {
        console.log('[CRON] Checking for expired subscriptions...');
        try {
            const now = new Date();
            const result = await prisma.user.updateMany({
                where: {
                    plan: { not: 'FREE' },
                    subscriptionExpiresAt: { lt: now }
                },
                data: {
                    plan: 'FREE'
                }
            });
            console.log(`[CRON] Downgraded ${result.count} users with expired subscriptions.`);
        } catch (error) {
            console.error('[CRON] Error checking subscription expiry:', error);
        }
    });
};

module.exports = initUsageResetCron;
