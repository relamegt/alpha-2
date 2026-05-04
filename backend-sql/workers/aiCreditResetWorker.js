const { Worker, Queue } = require('bullmq');
const prisma = require('../config/db');
const { getNewRedisClient } = require('../config/redis');

// Name of our queue
const QUEUE_NAME = 'aiCreditReset';

// Exported Queue instance (so we can add the repeatable job)
const aiCreditResetQueue = new Queue(QUEUE_NAME, {
    connection: getNewRedisClient()
});

/**
 * Worker to handle credit resets
 */
const startAiCreditResetWorker = async () => {
    // 1. Add repeatable job (runs at 00:00 on 1st of every month)
    await aiCreditResetQueue.add('monthly-reset', {}, {
        repeat: {
            pattern: '0 0 1 * *'
        },
        removeOnComplete: true,
        removeOnFail: true
    });

    console.log('⏰ Repeatable AI Credit Reset job scheduled (cron: 0 0 1 * *)');

    // 2. Define the worker logic
    const worker = new Worker(QUEUE_NAME, async (job) => {
        console.log('[Worker] Running monthly AI credits reset...');

        try {
            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            nextMonth.setDate(1);
            nextMonth.setHours(0, 0, 0, 0);

            const result = await prisma.aiCredits.updateMany({
                data: {
                    credits: 30,
                    resetAt: nextMonth
                }
            });

            console.log(`[Worker] Reset successful. Updated ${result.count} users.`);
            return { count: result.count };
        } catch (error) {
            console.error('[Worker] Monthly reset failed:', error);
            throw error;
        }
    }, {
        connection: getNewRedisClient(),
        concurrency: 1
    });

    worker.on('completed', (job) => {
        console.log(`[Worker] AI Reset Job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
        console.error(`[Worker] AI Reset Job ${job?.id} failed:`, err.message);
    });

    console.log('👷 AI Credit Reset Worker started');
    return worker;
};

module.exports = { startAiCreditResetWorker, aiCreditResetQueue };
