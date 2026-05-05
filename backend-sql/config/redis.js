const Redis = require('ioredis');

let redis = null;

const getRedisOptions = () => {
    const options = {
        // maxRetriesPerRequest: null is required for Bull queues, 
        // but for general use it allows infinite retries for commands.
        maxRetriesPerRequest: null, 
        retryStrategy(times) {
            // Exponential backoff with a cap at 10 seconds
            const delay = Math.min(times * 200, 10000);
            return delay;
        },
        reconnectOnError(err) {
            const targetError = 'ERR max number of clients reached';
            if (err.message.includes(targetError)) {
                console.warn(`⚠️  [Redis] Max clients reached. Reconnecting in 5s...`);
                return true; // Reconnect
            }
            return false;
        }
    };
    if (process.env.REDIS_URL && (process.env.REDIS_URL.startsWith('rediss://') || process.env.REDIS_URL.includes('upstash'))) {
        options.tls = { rejectUnauthorized: false };
    }
    return options;
};

const initRedis = () => {
    if (redis) return redis;

    console.log('🔌 Initializing Redis connection...');
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', getRedisOptions());
    
    redis.on('connect', async () => {
        console.log('✅ Redis Connected');
        try {
            // Force noeviction policy as required
            await redis.config('SET', 'maxmemory-policy', 'noeviction');
            console.log('✅ Redis Eviction Policy set to noeviction');
        } catch (err) {
            // Only warn if it's not a connection error (which will be handled by 'error' listener)
            if (!err.message.includes('max number of clients')) {
                console.warn('⚠️  [Action Required] Could not set Redis noeviction policy via code.');
                console.warn('⚠️  Please manually set "maxmemory-policy" to "noeviction" in your Redis dashboard.');
            }
        }
    });

    redis.on('error', (err) => {
        if (err.message.includes('ERR max number of clients reached')) {
            console.error('❌ [Redis] CRITICAL: Max number of clients reached. System will retry...');
        } else {
            console.error('❌ Redis Error:', err.message);
        }
    });

    return redis;
};

const getRedis = () => {
    if (!redis) return initRedis();
    return redis;
};

const getNewRedisClient = () => {
    const client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', getRedisOptions());
    client.on('error', (err) => {
        if (err.message.includes('ERR max number of clients reached')) {
            console.error('❌ [Redis New Client] Max number of clients reached. Retrying...');
        } else {
            console.error('❌ Redis New Client Error:', err.message);
        }
    });
    return client;
};

module.exports = { initRedis, getRedis, getNewRedisClient };
