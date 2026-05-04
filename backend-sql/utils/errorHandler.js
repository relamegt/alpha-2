const { Prisma } = require('@prisma/client');

// Global error handler middleware
const errorHandler = (err, req, res, next) => {
    console.error('❌ [Error]:', err);

    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
    let errors = null;

    // Handle Prisma Errors
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        // P2002: Unique constraint failed
        if (err.code === 'P2002') {
            statusCode = 400;
            const target = err.meta?.target || 'field';
            message = `${target} already exists. Please use a unique value.`;
        }
        // P2025: Record not found
        else if (err.code === 'P2025') {
            statusCode = 404;
            message = err.meta?.cause || 'Resource not found';
        }
        // P2003: Foreign key constraint failed
        else if (err.code === 'P2003') {
            statusCode = 400;
            message = 'Data integrity error: referenced record does not exist.';
        }
    } else if (err instanceof Prisma.PrismaClientValidationError) {
        statusCode = 400;
        message = 'Database validation failed. Please check your input fields.';
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid or malformed token';
    }

    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Session expired. Please log in again.';
    }

    // Send error response
    res.status(statusCode).json({
        success: false,
        message,
        errors: errors || undefined,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
};

// Not found handler
const notFoundHandler = (req, res, next) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`
    });
};

// Async handler wrapper (to avoid try-catch in every controller)
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
    errorHandler,
    notFoundHandler,
    asyncHandler
};
