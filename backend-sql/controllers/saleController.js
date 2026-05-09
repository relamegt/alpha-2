const prisma = require('../config/db');

// Admin: Create or update sale banner
exports.upsertSaleBanner = async (req, res, next) => {
    try {
        const { 
            id, title, subtitle, couponCode, discountText, 
            buttonText, buttonLink, endTime, isActive, 
            backgroundColor, textColor 
        } = req.body;

        let banner;
        if (id) {
            banner = await prisma.saleBanner.update({
                where: { id },
                data: {
                    title, subtitle, couponCode, discountText,
                    buttonText, buttonLink, 
                    endTime: endTime ? new Date(endTime) : null,
                    isActive, backgroundColor, textColor
                }
            });
        } else {
            banner = await prisma.saleBanner.create({
                data: {
                    title, subtitle, couponCode, discountText,
                    buttonText, buttonLink,
                    endTime: endTime ? new Date(endTime) : null,
                    isActive: isActive !== undefined ? isActive : false,
                    backgroundColor, textColor
                }
            });
        }

        res.json({ success: true, banner });
    } catch (error) {
        next(error);
    }
};

// Public: Get active sale banner
exports.getActiveBanner = async (req, res, next) => {
    try {
        const banner = await prisma.saleBanner.findFirst({
            where: { 
                isActive: true,
                OR: [
                    { endTime: null },
                    { endTime: { gt: new Date() } }
                ]
            }
        });
        res.json({ success: true, banner });
    } catch (error) {
        next(error);
    }
};

// Admin: Get all banners
exports.getAllBanners = async (req, res, next) => {
    try {
        const banners = await prisma.saleBanner.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, banners });
    } catch (error) {
        next(error);
    }
};

// Admin: Delete banner
exports.deleteBanner = async (req, res, next) => {
    try {
        const { id } = req.params;
        await prisma.saleBanner.delete({ where: { id } });
        res.json({ success: true, message: 'Banner deleted successfully' });
    } catch (error) {
        next(error);
    }
};
