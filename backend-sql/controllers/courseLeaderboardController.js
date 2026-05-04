const CourseLeaderboard = require('../models/CourseLeaderboard');
const Course = require('../models/Course');
const prisma = require('../config/db');

const getCourseLeaderboard = async (req, res) => {
    try {
        const { courseId: idOrSlug } = req.params;

        // Find course by ID or Slug
        const course = await prisma.course.findFirst({
            where: {
                OR: [
                    { id: idOrSlug },
                    { slug: idOrSlug }
                ]
            },
            select: { id: true, title: true }
        });

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        const leaderboard = await CourseLeaderboard.getLeaderboard(course.id);

        res.json({
            success: true,
            courseName: course.title,
            leaderboard
        });
    } catch (error) {
        console.error('Get course leaderboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch course leaderboard',
            error: error.message
        });
    }
};

const generateCourseReport = async (req, res) => {
    try {
        const { courseId: idOrSlug } = req.params;

        const course = await prisma.course.findFirst({
            where: {
                OR: [
                    { id: idOrSlug },
                    { slug: idOrSlug }
                ]
            },
            select: { id: true, title: true }
        });

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        const leaderboard = await CourseLeaderboard.getLeaderboard(course.id);

        res.json({
            success: true,
            reportType: 'Course Leaderboard',
            courseName: course.title,
            generatedAt: new Date(),
            entries: leaderboard
        });
    } catch (error) {
        console.error('Generate course report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate course report',
            error: error.message
        });
    }
};

module.exports = {
    getCourseLeaderboard,
    generateCourseReport
};
