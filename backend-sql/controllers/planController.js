const prisma = require('../config/db');

// Admin: Create a new plan
exports.createPlan = async (req, res, next) => {
    try {
        const { 
            name, price, originalPrice, currency, durationInDays, 
            description, features, excludedFeatures, courseAccess, 
            linkedCourses, aiTokensLimit, compilerLimit, submissionsLimit, aiInterviewsLimit,
            isActive, isPopular, gstEnabled, pricingOptions
        } = req.body;

        const plan = await prisma.subscriptionPlan.create({
            data: {
                name,
                price: Math.round(parseFloat(price)),
                originalPrice: originalPrice ? Math.round(parseFloat(originalPrice)) : null,
                currency: currency || 'INR',
                durationInDays: parseInt(durationInDays) || 30,
                description,
                features: features || [],
                excludedFeatures: excludedFeatures || [],
                courseAccess: courseAccess || 'ALL',
                linkedCourses: linkedCourses || [],
                aiTokensLimit: parseInt(aiTokensLimit) || 0,
                compilerLimit: parseInt(compilerLimit) || 0,
                submissionsLimit: parseInt(submissionsLimit) || 0,
                aiInterviewsLimit: parseInt(aiInterviewsLimit) || 0,
                isActive: isActive !== undefined ? isActive : true,
                isPopular: isPopular !== undefined ? isPopular : false,
                gstEnabled: gstEnabled !== undefined ? gstEnabled : false,
                pricingOptions: pricingOptions || []
            }
        });

        res.json({ success: true, plan });
    } catch (error) {
        next(error);
    }
};

// Admin: Update a plan
exports.updatePlan = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };

        // Remove fields that should not be in the Prisma update data
        delete updateData.id;
        delete updateData._id;
        delete updateData.createdAt;
        delete updateData.updatedAt;

        // Parse numeric fields if they exist
        if (updateData.price) updateData.price = parseFloat(updateData.price);
        if (updateData.originalPrice) updateData.originalPrice = parseFloat(updateData.originalPrice);
        if (updateData.durationInDays) updateData.durationInDays = parseInt(updateData.durationInDays);
        if (updateData.aiTokensLimit) updateData.aiTokensLimit = parseInt(updateData.aiTokensLimit);
        if (updateData.compilerLimit) updateData.compilerLimit = parseInt(updateData.compilerLimit);
        if (updateData.submissionsLimit) updateData.submissionsLimit = parseInt(updateData.submissionsLimit);
        if (updateData.aiInterviewsLimit) updateData.aiInterviewsLimit = parseInt(updateData.aiInterviewsLimit);

        const plan = await prisma.subscriptionPlan.update({
            where: { id },
            data: updateData
        });

        res.json({ success: true, plan });
    } catch (error) {
        next(error);
    }
};

// Admin: Delete a plan
exports.deletePlan = async (req, res, next) => {
    try {
        const { id } = req.params;
        await prisma.subscriptionPlan.delete({ where: { id } });
        res.json({ success: true, message: 'Plan deleted successfully' });
    } catch (error) {
        next(error);
    }
};

// Public: Get all active plans
exports.getActivePlans = async (req, res, next) => {
    try {
        const plans = await prisma.subscriptionPlan.findMany({
            where: { isActive: true },
            orderBy: { price: 'asc' }
        });
        res.json({ success: true, plans });
    } catch (error) {
        next(error);
    }
};

// Admin: Get all plans (including inactive)
exports.getAllPlans = async (req, res, next) => {
    try {
        const plans = await prisma.subscriptionPlan.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, plans });
    } catch (error) {
        next(error);
    }
};
