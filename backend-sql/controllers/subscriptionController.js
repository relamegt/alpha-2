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
        const { planId, couponCode, userDetails, selectedDuration } = req.body;
        const userId = req.user.userId;

        // 1. Update user details if provided (Contact Details step)
        if (userDetails) {
            const { firstName, lastName, institution, phone, endYear, branch, rollNumber } = userDetails;
            await prisma.user.update({
                where: { id: userId },
                data: {
                    firstName: firstName || undefined,
                    lastName: lastName || undefined,
                    institution: institution || undefined,
                    phone: phone || undefined,
                    endYear: endYear ? parseInt(endYear) : undefined,
                    branch: branch || undefined,
                    rollNumber: rollNumber || undefined,
                    profileCompleted: true
                }
            });
        }

        // 2. Fetch Plan from Database
        let plan = await prisma.subscriptionPlan.findUnique({
            where: { id: planId }
        });

        // Fallback for legacy plan IDs if they are strings (BASIC, PLUS, PRO)
        if (!plan) {
            const legacyPlan = PLANS[planId];
            if (!legacyPlan || planId === 'FREE') {
                return res.status(400).json({ message: 'Invalid plan selected' });
            }
            plan = {
                id: legacyPlan.id,
                name: legacyPlan.name,
                price: legacyPlan.price,
                durationInDays: legacyPlan.durationMonths * 30 || 30,
                gstEnabled: false
            };
        }

        let amount = plan.price;
        let duration = plan.durationInDays;

        // 2.5 Handle Pricing Options (Multiple Durations)
        if (selectedDuration && plan.pricingOptions && Array.isArray(plan.pricingOptions)) {
            const selectedOption = plan.pricingOptions.find(opt => opt.duration === parseInt(selectedDuration));
            if (selectedOption) {
                amount = selectedOption.price;
                duration = selectedOption.duration;
            }
        }

        // 2.7 Handle Upgrades: Subtract current plan price if applicable
        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { plan: true, planInstance: true }
        });

        if (currentUser && currentUser.plan !== 'FREE' && currentUser.planInstance) {
            const currentPrice = currentUser.planInstance.price || 0;
            // Only subtract if it's an upgrade (new price > old price)
            if (amount > currentPrice) {
                amount = Math.max(0, amount - currentPrice);
            }
        }

        let discountAmount = 0;

        // 3. Apply coupon if provided
        if (couponCode) {
            const coupon = await prisma.coupon.findUnique({
                where: { code: couponCode.toUpperCase() }
            });

            if (coupon && coupon.isActive && new Date(coupon.expiryDate) > new Date()) {
                if (coupon.minPurchase && amount < coupon.minPurchase) {
                    // Skip
                } else {
                    if (coupon.discountPercent) {
                        discountAmount = (amount * coupon.discountPercent) / 100;
                    } else if (coupon.discountAmount) {
                        discountAmount = coupon.discountAmount;
                    }
                    amount = Math.max(0, amount - discountAmount);
                }
            }
        }

        // 3.5 Calculate GST if enabled (18%)
        let gstAmount = 0;
        if (plan.gstEnabled) {
            gstAmount = Math.round(amount * 0.18);
            amount += gstAmount;
        }

        // 4. Handle Free Orders (Zero Amount)
        if (amount <= 0) {
            const freeOrder = await prisma.subscriptionOrder.create({
                data: {
                    userId,
                    planId: plan.id.length > 10 ? plan.id : null,
                    planType: plan.id.length <= 10 ? plan.id : 'PRO',
                    razorpayOrderId: `free_${Date.now()}_${userId.toString().slice(0, 8)}`,
                    amount: 0,
                    discountAmount,
                    couponCode: couponCode || null,
                    status: 'COMPLETED',
                    durationInDays: duration
                }
            });

            let expiryDate = new Date();
            if (duration >= 360000) {
                expiryDate = new Date('9999-12-31');
            } else {
                expiryDate.setDate(expiryDate.getDate() + duration);
            }

            await prisma.user.update({
                where: { id: userId },
                data: {
                    planId: freeOrder.planId,
                    plan: freeOrder.planType || 'PRO',
                    subscriptionExpiresAt: expiryDate,
                }
            });

            return res.json({ success: true, isFree: true, message: 'Subscribed successfully for free!' });
        }

        // 5. Create Razorpay Order
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
                    planId: plan.id.length > 10 ? plan.id : null,
                    planType: plan.id.length <= 10 ? plan.id : 'PRO',
                    razorpayOrderId: order.id,
                    amount,
                    discountAmount,
                    couponCode: couponCode || null,
                    status: 'PENDING',
                    durationInDays: duration
                }
            });

            res.json({ success: true, order, plan, gstAmount });
        } catch (razorpayError) {
            console.error('❌ Razorpay Error:', razorpayError);
            return res.status(500).json({
                success: false,
                message: 'Payment Gateway Error: ' + (razorpayError.error?.description || razorpayError.message || 'Authentication failed'),
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

        // Fetch plan details for duration
        let durationInDays = 30;
        let planName = 'Premium';
        
        if (order.planId) {
            const plan = await prisma.subscriptionPlan.findUnique({ where: { id: order.planId } });
            if (plan) {
                durationInDays = plan.durationInDays;
                planName = plan.name;
            }
        } else if (order.planType) {
            const legacyPlan = PLANS[order.planType];
            if (legacyPlan) {
                durationInDays = legacyPlan.durationMonths * 30;
                planName = legacyPlan.name;
            }
        }

        // Use duration from order if available (priority)
        if (order.durationInDays) {
            durationInDays = order.durationInDays;
        }

        await prisma.subscriptionOrder.update({
            where: { id: order.id },
            data: { status: 'COMPLETED' }
        });

        let expiryDate = new Date();
        if (durationInDays >= 360000) {
            expiryDate = new Date('9999-12-31');
        } else {
            expiryDate.setDate(expiryDate.getDate() + durationInDays);
        }

        // Map plan name to PlanType enum
        let planType = order.planType || 'PRO';
        if (planName.toUpperCase().includes('BASIC')) planType = 'BASIC';
        else if (planName.toUpperCase().includes('PLUS')) planType = 'PLUS';
        else if (planName.toUpperCase().includes('PRO')) planType = 'PRO';

        await prisma.user.update({
            where: { id: userId },
            data: {
                planId: order.planId,
                plan: planType,
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

        res.json({ success: true, message: `Successfully subscribed to ${planName}`, plan: order.planType });
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
                planId: true,
                planInstance: true,
                subscriptionExpiresAt: true,
                dailyAiTokensUsed: true,
                dailyCompilerUsed: true,
                dailySubmissionsUsed: true,
                dailyAiInterviewsUsed: true
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
        
        // Effective limits combining DB instance and global defaults
        const dbInstance = user.planInstance || {};
        const globalDefaults = planDetails.features || {};
        const effectiveLimits = {
            aiTokensLimit: dbInstance.aiTokensLimit ?? globalDefaults.aiTokensPerDay ?? 5000,
            compilerLimit: dbInstance.compilerLimit ?? globalDefaults.compilerPerDay ?? 20,
            submissionsLimit: dbInstance.submissionsLimit ?? globalDefaults.submissionsPerDay ?? 20,
            aiInterviewsLimit: dbInstance.aiInterviewsLimit ?? globalDefaults.aiInterviewsLimit ?? 0
        };

        res.json({ 
            success: true, 
            plan: currentPlan, 
            planId: user.planId,
            planDetails: user.planInstance,
            effectiveLimits,
            details: planDetails, 
            expiresAt: user.subscriptionExpiresAt, 
            usage: {
                aiTokens: user.dailyAiTokensUsed || 0,
                compiler: user.dailyCompilerUsed || 0,
                submissions: user.dailySubmissionsUsed || 0,
                aiInterviews: user.dailyAiInterviewsUsed || 0
            }
        });
    } catch (error) {
        next(error);
    }
};
