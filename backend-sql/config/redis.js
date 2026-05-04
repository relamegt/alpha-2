const Redis = require('ioredis');

let redis = null;

const getRedisOptions = () => {
    const options = {
        maxRetriesPerRequest: null,
        retryStrategy(times) {
            return Math.min(times * 100, 3000);
        }
    };
    if (process.env.REDIS_URL && (process.env.REDIS_URL.startsWith('rediss://') || process.env.REDIS_URL.includes('upstash'))) {
        options.tls = { rejectUnauthorized: false };
    }
    return options;
};

const initRedis = () => {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', getRedisOptions());
    redis.on('connect', async () => {
        console.log('✅ Redis Connected');
        try {
            // Force noeviction policy as required
            await redis.config('SET', 'maxmemory-policy', 'noeviction');
            console.log('✅ Redis Eviction Policy set to noeviction');
        } catch (err) {
            console.warn('⚠️ [Action Required] Could not set Redis noeviction policy via code.');
            console.warn('⚠️ Please manually set "maxmemory-policy" to "noeviction" in your Redis dashboard (e.g. Upstash).');
        }
    });
    redis.on('error', (err) => console.error('❌ Redis Error:', err.message));
    return redis;
};

const getRedis = () => {
    if (!redis) return initRedis();
    return redis;
};

const getNewRedisClient = () => {
    const client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', getRedisOptions());
    client.on('error', (err) => console.error('❌ Redis New Client Error:', err.message));
    return client;
};

module.exports = { initRedis, getRedis, getNewRedisClient };
