const prisma = require('../config/db');

exports.validateCoupon = async (req, res, next) => {
    try {
        const { code, amount } = req.body;
        const normalizedCode = (code || "").trim().toUpperCase();
        
        const coupon = await prisma.coupon.findUnique({
            where: { code: normalizedCode }
        });

        if (!coupon) {
            return res.status(404).json({ success: false, message: 'Invalid coupon code' });
        }

        if (!coupon.isActive) {
            return res.status(400).json({ success: false, message: 'Coupon is inactive' });
        }

        if (new Date(coupon.expiryDate) < new Date()) {
            return res.status(400).json({ success: false, message: 'Coupon has expired' });
        }

        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
            return res.status(400).json({ success: false, message: 'Coupon usage limit reached' });
        }

        if (amount < (coupon.minPurchase || 0)) {
            return res.status(400).json({ success: false, message: `Minimum purchase amount for this coupon is ₹${coupon.minPurchase}` });
        }

        let discount = 0;
        if (coupon.discountPercent) {
            discount = (amount * coupon.discountPercent) / 100;
        } else if (coupon.discountAmount) {
            discount = coupon.discountAmount;
        }

        res.json({ 
            success: true, 
            discount, 
            finalAmount: Math.max(0, amount - discount),
            coupon: {
                code: coupon.code,
                discountPercent: coupon.discountPercent,
                discountAmount: coupon.discountAmount
            }
        });
    } catch (error) {
        next(error);
    }
};

// Admin only
exports.createCoupon = async (req, res, next) => {
    try {
        const { code, discountPercent, discountAmount, minPurchase, expiryDate, usageLimit, isActive, isSaleRelated, isPromoted } = req.body;

        const coupon = await prisma.coupon.create({
            data: {
                code: code.toUpperCase(),
                discountPercent: discountPercent || 0,
                discountAmount: discountAmount || null,
                minPurchase: minPurchase || 0,
                expiryDate: new Date(expiryDate),
                usageLimit: usageLimit || null,
                isActive: isActive !== undefined ? isActive : true,
                isSaleRelated: isSaleRelated || false,
                isPromoted: isPromoted || false
            }
        });

        res.json({ success: true, coupon });
    } catch (error) {
        next(error);
    }
};

exports.updateCoupon = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { code, discountPercent, discountAmount, minPurchase, expiryDate, usageLimit, isActive, isSaleRelated, isPromoted } = req.body;

        const coupon = await prisma.coupon.update({
            where: { id },
            data: {
                code: code ? code.toUpperCase() : undefined,
                discountPercent: discountPercent !== undefined ? discountPercent : undefined,
                discountAmount: discountAmount !== undefined ? discountAmount : undefined,
                minPurchase: minPurchase !== undefined ? minPurchase : undefined,
                expiryDate: expiryDate ? new Date(expiryDate) : undefined,
                usageLimit: usageLimit !== undefined ? usageLimit : undefined,
                isActive: isActive !== undefined ? isActive : undefined,
                isSaleRelated: isSaleRelated !== undefined ? isSaleRelated : undefined,
                isPromoted: isPromoted !== undefined ? isPromoted : undefined
            }
        });

        res.json({ success: true, coupon });
    } catch (error) {
        next(error);
    }
};

exports.deleteCoupon = async (req, res, next) => {
    try {
        const { id } = req.params;
        await prisma.coupon.delete({ where: { id } });
        res.json({ success: true, message: 'Coupon deleted successfully' });
    } catch (error) {
        next(error);
    }
};

exports.getAllCoupons = async (req, res, next) => {
    try {
        const coupons = await prisma.coupon.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, coupons });
    } catch (error) {
        next(error);
    }
};

exports.getAvailablePromoCodes = async (req, res, next) => {
    try {
        const coupons = await prisma.coupon.findMany({
            where: {
                isActive: true,
                isSaleRelated: true,
                expiryDate: { gt: new Date() }
            },
            select: {
                code: true,
                discountPercent: true,
                discountAmount: true,
                usageLimit: true,
                usedCount: true
            },
            orderBy: { discountPercent: 'desc' }
        });

        // Filter out those that exceeded usage limit if limit exists
        const availableCoupons = coupons.filter(c => !c.usageLimit || c.usedCount < c.usageLimit)
            .map(c => ({
                code: c.code,
                discountPercent: c.discountPercent,
                discountAmount: c.discountAmount
            }));

        res.json({ success: true, coupons: availableCoupons });
    } catch (error) {
        next(error);
    }
};
