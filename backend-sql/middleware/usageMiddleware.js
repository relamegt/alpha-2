const prisma = require('../config/db');
const { PLANS } = require('../config/plans');

/**
 * Core logic to check and enforce limits
 */
const checkLimit = async (userId, type, tokensRequested = 1000) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            plan: true,
            planId: true,
            subscriptionExpiresAt: true,
            dailyAiTokensUsed: true,
            dailyCompilerUsed: true,
            dailySubmissionsUsed: true,
            dailyAiInterviewsUsed: true,
            lastUsageReset: true
        }
    });

    if (!user) throw new Error('User not found');

    // 1. Handle daily reset if last reset was not today
    const now = new Date();
    const lastReset = new Date(user.lastUsageReset);
    if (now.toDateString() !== lastReset.toDateString()) {
        await prisma.user.update({
            where: { id: userId },
            data: {
                dailyAiTokensUsed: 0,
                dailyCompilerUsed: 0,
                dailySubmissionsUsed: 0,
                dailyAiInterviewsUsed: 0,
                lastUsageReset: now
            }
        });
        user.dailyAiTokensUsed = 0;
        user.dailyCompilerUsed = 0;
        user.dailySubmissionsUsed = 0;
        user.dailyAiInterviewsUsed = 0;
    }

    // 2. Determine active plan (check for expiry)
    let currentPlan = user.plan;
    if (currentPlan !== 'FREE' && user.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) < now) {
        await prisma.user.update({
            where: { id: userId },
            data: { plan: 'FREE', planId: null }
        });
        currentPlan = 'FREE';
        user.planId = null;
    }

    // 3. Fetch limits from DB (SubscriptionPlan)
    let limits = {
        aiTokensPerDay: 5000,
        compilerPerDay: 20,
        submissionsPerDay: 20
    };

    const planDetails = PLANS[currentPlan] || PLANS.FREE;
    const globalDefaults = planDetails.features || {};

    if (user.planId) {
        const plan = await prisma.subscriptionPlan.findUnique({
            where: { id: user.planId }
        });
        if (plan) {
            limits = {
                aiTokensPerDay: plan.aiTokensLimit ?? globalDefaults.aiTokensPerDay ?? 5000,
                compilerPerDay: plan.compilerLimit ?? globalDefaults.compilerPerDay ?? 20,
                submissionsPerDay: plan.submissionsLimit ?? globalDefaults.submissionsPerDay ?? 20,
                aiInterviewsPerDay: plan.aiInterviewsLimit ?? globalDefaults.aiInterviewsLimit ?? 0
            };
        } else {
            limits = {
                aiTokensPerDay: globalDefaults.aiTokensPerDay ?? 5000,
                compilerPerDay: globalDefaults.compilerPerDay ?? 20,
                submissionsPerDay: globalDefaults.submissionsPerDay ?? 20,
                aiInterviewsPerDay: globalDefaults.aiInterviewsLimit ?? 0
            };
        }
    } else {
        limits = {
            aiTokensPerDay: globalDefaults.aiTokensPerDay ?? 5000,
            compilerPerDay: globalDefaults.compilerPerDay ?? 20,
            submissionsPerDay: globalDefaults.submissionsPerDay ?? 20,
            aiInterviewsPerDay: globalDefaults.aiInterviewsLimit ?? 0
        };
    }

    if (type === 'ai') {
        if (user.dailyAiTokensUsed + tokensRequested > limits.aiTokensPerDay) {
            return { allowed: false, message: 'Daily AI token limit reached. Upgrade your plan for more.' };
        }
    } else if (type === 'compiler') {
        if (user.dailyCompilerUsed >= limits.compilerPerDay) {
            return { allowed: false, message: 'Daily compiler limit reached. Upgrade your plan for more.' };
        }
        await prisma.user.update({
            where: { id: userId },
            data: { dailyCompilerUsed: { increment: 1 } }
        });
    } else if (type === 'submission') {
        if (user.dailySubmissionsUsed >= limits.submissionsPerDay) {
            return { allowed: false, message: 'Daily submission limit reached. Upgrade your plan for more.' };
        }
        await prisma.user.update({
            where: { id: userId },
            data: { dailySubmissionsUsed: { increment: 1 } }
        });
    }

    return { allowed: true };
};

// Specific middleware functions as requested by existing routes
const checkAiLimit = async (req, res, next) => {
    const result = await checkLimit(req.user.userId, 'ai');
    if (!result.allowed) return res.status(403).json({ success: false, message: result.message, limitReached: true, type: 'ai' });
    next();
};

const checkCompilerLimit = async (req, res, next) => {
    const result = await checkLimit(req.user.userId, 'compiler');
    if (!result.allowed) return res.status(403).json({ success: false, message: result.message, limitReached: true, type: 'compiler' });
    next();
};

const checkSubmissionLimit = async (req, res, next) => {
    const result = await checkLimit(req.user.userId, 'submission');
    if (!result.allowed) return res.status(403).json({ success: false, message: result.message, limitReached: true, type: 'submission' });
    next();
};

module.exports = {
    checkAiLimit,
    checkCompilerLimit,
    checkSubmissionLimit
};
