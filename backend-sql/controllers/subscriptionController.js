const Razorpay = require('razorpay');
const crypto = require('crypto');
const prisma = require('../config/db');
const { PLANS } = require('../config/plans');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'dummy_key',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret',
});

exports.createSubscriptionOrder = async (req, res, next) => {
    try {
        const { planId, couponCode } = req.body;
        const userId = req.user.userId;

        const plan = PLANS[planId];
        if (!plan || planId === 'FREE') {
            return res.status(400).json({ message: 'Invalid plan selected' });
        }

        let amount = plan.price;
        let discountAmount = 0;

        // Apply coupon if provided
        if (couponCode) {
            const coupon = await prisma.coupon.findUnique({
                where: { code: couponCode }
            });

            if (coupon && coupon.isActive && new Date(coupon.expiryDate) > new Date()) {
                if (coupon.discountPercent) {
                    discountAmount = (amount * coupon.discountPercent) / 100;
                } else if (coupon.discountAmount) {
                    discountAmount = coupon.discountAmount;
                }
                amount = Math.max(0, amount - discountAmount);
            }
        }

        // Handle Upgrade Logic
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user.plan === 'PLUS' && planId === 'PRO') {
            if (user.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) > new Date()) {
                amount = 2000; // Special upgrade price
            }
        }

        const options = {
            amount: Math.round(amount * 100),
            currency: 'INR',
            receipt: `sub_${Date.now()}_${userId.toString().slice(0, 8)}`,
        };

        try {
            const order = await razorpay.orders.create(options);

            await prisma.subscriptionOrder.create({
                data: {
                    userId,
                    planType: planId,
                    razorpayOrderId: order.id,
                    amount,
                    discountAmount,
                    couponCode: couponCode || null,
                    status: 'PENDING'
                }
            });

            res.json({ success: true, order, plan });
        } catch (razorpayError) {
            console.error('❌ Razorpay Error:', razorpayError);
            return res.status(500).json({
                success: false,
                message: 'Payment Gateway Error: ' + (razorpayError.error?.description || razorpayError.message || 'Authentication failed'),
                details: 'Please ensure your RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are correct in the backend .env file.'
            });
        }
    } catch (error) {
        next(error);
    }
};

exports.verifySubscriptionPayment = async (req, res, next) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const userId = req.user.userId;

        const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'dummy_secret');
        hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
        const generatedSignature = hmac.digest('hex');

        if (generatedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Invalid signature' });
        }

        const order = await prisma.subscriptionOrder.findUnique({
            where: { razorpayOrderId: razorpay_order_id }
        });

        if (!order) return res.status(404).json({ message: 'Order not found' });

        await prisma.subscriptionOrder.update({
            where: { id: order.id },
            data: { status: 'COMPLETED' }
        });

        const plan = PLANS[order.planType];
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + plan.durationMonths);

        await prisma.user.update({
            where: { id: userId },
            data: {
                plan: order.planType,
                subscriptionExpiresAt: expiryDate,
                razorpaySubscriptionId: razorpay_payment_id
            }
        });

        if (order.couponCode) {
            await prisma.coupon.update({
                where: { code: order.couponCode },
                data: { usedCount: { increment: 1 } }
            });
        }

        res.json({ success: true, message: `Successfully subscribed to ${plan.name}`, plan: order.planType });
    } catch (error) {
        next(error);
    }
};

exports.getCurrentPlan = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
            select: {
                plan: true,
                subscriptionExpiresAt: true,
                dailyAiTokensUsed: true,
                dailyCompilerUsed: true,
                dailySubmissionsUsed: true
            }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        let currentPlan = user.plan || 'FREE';
        if (currentPlan !== 'FREE' && user.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) < new Date()) {
            await prisma.user.update({
                where: { id: req.user.userId },
                data: { plan: 'FREE' }
            });
            currentPlan = 'FREE';
        }

        const planDetails = PLANS[currentPlan] || PLANS['FREE'];
        res.json({ 
            success: true, 
            plan: currentPlan, 
            details: planDetails, 
            expiresAt: user.subscriptionExpiresAt, 
            usage: {
                aiTokens: user.dailyAiTokensUsed || 0,
                compiler: user.dailyCompilerUsed || 0,
                submissions: user.dailySubmissionsUsed || 0
            }
        });
    } catch (error) {
        next(error);
    }
};
