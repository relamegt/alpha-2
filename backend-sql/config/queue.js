const { Queue } = require('bullmq');
const { getNewRedisClient } = require('./redis');

let scoreQueue = null;
let executionQueue = null;

const getScoreQueue = () => {
    if (!scoreQueue) {
        scoreQueue = new Queue('score-recalculation', {
            connection: getNewRedisClient()
        });
    }
    return scoreQueue;
};

const addScoreJob = async (studentId) => {
    try {
        await getScoreQueue().add('recalculate', { studentId }, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 1000
            },
            removeOnComplete: true,
            removeOnFail: 100
        });
        console.log(`[Queue] Added score recalculation job for user: ${studentId}`);
    } catch (error) {
        console.error('[Queue] Failed to add job:', error);
    }
};

const getExecutionQueue = () => {
    if (!executionQueue) {
        const qName = process.env.NODE_ENV === 'production' ? 'code-execution' : 'code-execution-dev';
        executionQueue = new Queue(qName, {
            connection: getNewRedisClient()
        });
    }
    return executionQueue;
};

const addExecutionJob = async (jobData) => {
    try {
        await getExecutionQueue().add('execute', jobData, {
            attempts: 1,
            removeOnComplete: true,
            removeOnFail: 100
        });
        console.log(`[Queue] Added execution job for user: ${jobData.studentId}, problem: ${jobData.problemId}`);
    } catch (error) {
        console.error('[Queue] Failed to add execution job:', error);
    }
};

module.exports = {
    getScoreQueue,
    addScoreJob,
    getExecutionQueue,
    addExecutionJob
};
