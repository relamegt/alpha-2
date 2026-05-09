const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const prisma = require('./config/db');
const { errorHandler, notFoundHandler } = require('./utils/errorHandler');
const { initWebSocket } = require('./config/websocket');
const { initRedis, getRedis } = require('./config/redis');

// Remove unnecessary console logs in production
if (process.env.NODE_ENV === 'production') {
    console.log = () => { };
    console.info = () => { };
    console.debug = () => { };
}

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Enable Gzip compression
app.use(compression());

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

// Rate limiting — backed by Redis so limits hold across multiple server instances
let rateLimit, RedisStore;
try {
    rateLimit = require('express-rate-limit');
    RedisStore = require('rate-limit-redis').RedisStore;
} catch (e) {
    console.warn('[Server] express-rate-limit or rate-limit-redis not installed, skipping rate limiting');
}

const buildRateLimitStore = (prefix) => {
    if (!RedisStore) return undefined;
    try {
        const redis = getRedis();
        return new RedisStore({
            sendCommand: (...args) => redis.call(...args),
            prefix
        });
    } catch (e) {
        console.warn('[RateLimit] Redis store init failed, using in-memory store:', e.message);
        return undefined;
    }
};

if (rateLimit) {
    // General API limiter
    const apiLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 10000,
        standardHeaders: true,
        legacyHeaders: false,
        store: buildRateLimitStore('rl:api:'),
        skip: (req) => {
            return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV || req.path.startsWith('/auth');
        },
        message: { success: false, message: 'Too many requests, please try again later.' }
    });

    // Auth-specific limiter
    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 500,
        standardHeaders: true,
        legacyHeaders: false,
        store: buildRateLimitStore('rl:auth:'),
        skip: (req) => {
            return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
        },
        message: { success: false, message: 'Too many login attempts, please try again in 15 minutes.' }
    });

    app.use('/api', apiLimiter);
    app.use('/api/auth', authLimiter);
}

// Body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS - Support multiple origins via allowlist
const corsOptions = {
    origin: (origin, callback) => {
        const allowed = [
            process.env.FRONTEND_URL
        ];
        if (process.env.ALLOWED_ORIGINS) {
            allowed.push(...process.env.ALLOWED_ORIGINS.split(','));
        }
        if (!origin || allowed.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`[CORS] Rejected origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Trust proxy (for rate limiting with correct IP)
app.set('trust proxy', 1);

// Health check
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'AlphaKnowledge SQL API is running',
        database: 'PostgreSQL (Supabase)',
        timestamp: new Date().toISOString(),
        websocket: 'enabled',
        compression: 'enabled'
    });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/courses', require('./routes/course'));
app.use('/api/problem', require('./routes/problem'));
app.use('/api/student', require('./routes/student'));
app.use('/api/instructor', require('./routes/instructor'));
app.use('/api/contest', require('./routes/contest'));
app.use('/api/course-contests', require('./routes/courseContest'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/reports', require('./routes/report'));
app.use('/api/sql-problems', require('./routes/sqlProblem'));
app.use('/api/videos', require('./routes/video'));
app.use('/api/quizzes', require('./routes/quiz'));
app.use('/api/private-articles', require('./routes/article'));
app.use('/api/public-articles', require('./routes/publicArticle'));
app.use('/api/content', require('./routes/content'));
app.use('/api/public', require('./routes/public'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/enroll', require('./routes/enroll'));
app.use('/api/batches', require('./routes/batch'));
app.use('/api/sheets', require('./routes/sheetRoutes'));
app.use('/api/jobs', require('./routes/jobRoutes'));
app.use('/api/announcements', require('./routes/announcementRoutes'));
app.use('/api/interview-experiences', require('./routes/interviewExperienceRoutes'));
app.use('/api/interview', require('./routes/interview'));
app.use('/api/assignments', require('./routes/assignments'));
app.use('/api/subscriptions', require('./routes/subscriptionRoutes'));
app.use('/api/coupons', require('./routes/couponRoutes'));
app.use('/api/plans', require('./routes/planRoutes'));
app.use('/api/sales', require('./routes/saleRoutes'));

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
app.post('/api/assignments/:id/submit/ide',
    require('./middleware/auth').protect,
    upload.single('file'),
    require('./controllers/assignmentController').submitIDE
);

app.use('/api/ai', require('./middleware/auth').protect, require('./routes/aiAssistant'));

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const workers = [];

const startServer = async () => {
    try {
        // 0. Initialize Redis first (needed for Queues & Cache)
        console.warn('🔌 Connecting to Redis...');
        initRedis();

        // 1. Start Background Workers
        try {
            const { startScoreWorker } = require('./workers/scoreWorker');
            const { startCodeExecutionWorker } = require('./workers/codeExecutionWorker');
            const { startEnrollmentExpiryWorker } = require('./workers/enrollmentExpiryWorker');
            const { startAiCreditResetWorker } = require('./workers/aiCreditResetWorker');
            console.warn('👷 Starting background workers...');
            workers.push(startScoreWorker());
            workers.push(startCodeExecutionWorker());
            workers.push(startEnrollmentExpiryWorker());
            workers.push(startAiCreditResetWorker());
        } catch (workerErr) {
            console.warn('⚠️  Workers not available (non-fatal):', workerErr.message);
        }

        // 2. Connect to database (Prisma)
        console.warn('🔌 Connecting to PostgreSQL via Prisma...');
        await prisma.$connect();
        console.log('✅ PostgreSQL Connected via Prisma');

        // 2.5 Rebuild Global Leaderboard ZSET (Sync Redis with DB)
        try {
            const Leaderboard = require('./models/Leaderboard');
            await Leaderboard.rebuildGlobalZSet();
        } catch (lbErr) {
            console.warn('⚠️  Leaderboard rebuild failed (non-fatal):', lbErr.message);
        }

        // 3. Verify email configuration
        try {
            const { verifyEmailConfig } = require('./config/nodemailer');
            if (verifyEmailConfig) {
                console.warn('📧 Verifying email service...');
                await verifyEmailConfig();
            }
        } catch (emailErr) {
            console.warn('⚠️  Email verification skipped (non-fatal):', emailErr.message);
        }

        // 4. Initialize WebSocket
        console.warn('🔌 Initializing WebSocket server...');
        initWebSocket(server);

        // 5. Start cron jobs
        if (process.env.ENABLE_CRON_JOBS === 'true') {
            try {
                const { startBatchExpiryJob } = require('./cron/batchExpiry');
                const { startProfileSyncJob } = require('./cron/profileSync');
                const { startEnrollmentExpiryJob } = require('./cron/enrollmentExpiry');
                const initUsageResetCron = require('./cron/usageReset');
                console.warn('⏰ Starting cron jobs...');
                startBatchExpiryJob();
                startProfileSyncJob();
                startEnrollmentExpiryJob();
                initUsageResetCron();
            } catch (cronErr) {
                console.warn('⚠️  Cron jobs not available (non-fatal):', cronErr.message);
            }
        }

        // Start HTTP server
        server.listen(PORT, () => {
            const logger = process.env.NODE_ENV === 'production' ? console.info : console.log;
            logger('');
            logger('✅ ═══════════════════════════════════════════════════');
            logger(`✅ AlphaLearn SQL Backend running on port ${PORT}`);
            logger(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
            logger(`✅ Database: Supabase PostgreSQL`);
            logger(`✅ Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
            logger(`✅ WebSocket: Enabled on ws://localhost:${PORT}/ws`);
            logger('✅ ═══════════════════════════════════════════════════');
            logger('');
        });
    } catch (error) {
        console.error('❌ Server startup error:', error);
        process.exit(1);
    }
};

// Graceful shutdown
const shutdown = () => {
    console.log('⚠️ Shutdown signal received: closing HTTP server...');
    server.close(async () => {
        console.log('✅ HTTP server closed');
        
        // Close workers
        console.warn('👷 Closing background workers...');
        for (const worker of workers) {
            try {
                if (worker) await worker.close();
            } catch (err) {
                console.error('❌ Error closing worker:', err.message);
            }
        }
        
        await prisma.$disconnect();
        process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
        console.error('⚠️ Forcefully shutting down...');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    if (error && error.message && error.message.includes('max number of clients')) {
        console.warn('⚠️  Soft-caught Uncaught Exception (Redis Limit):', error.message);
        return;
    }
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    // If reason is an error with http_code 400 or status 400, it's a client-side/service-level error
    if (reason && (reason.http_code === 400 || reason.status === 400)) {
        console.warn('⚠️  Soft-caught Unhandled Rejection (Client/Service Error):', reason.message || reason);
        return;
    }

    // Handle Redis max clients error without crashing
    if (reason && reason.message && reason.message.includes('max number of clients')) {
        console.warn('⚠️  Soft-caught Unhandled Rejection (Redis Limit):', reason.message);
        return;
    }

    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

startServer();

module.exports = app;
