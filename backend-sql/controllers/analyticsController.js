const prisma = require('../config/db');
const Course = require('../models/Course');
const CourseLeaderboard = require('../models/CourseLeaderboard');
const Leaderboard = require('../models/Leaderboard');
const { asyncHandler } = require('../utils/errorHandler');

/**
 * Get detailed analytics for a specific course for a student
 */
const getCourseAnalytics = asyncHandler(async (req, res) => {
    const { courseId: idOrSlug } = req.params;
    const studentId = req.user.userId || req.user.id;

    // 1. Find course
    const course = await prisma.course.findFirst({
        where: {
            OR: [
                { id: idOrSlug },
                { slug: idOrSlug }
            ]
        }
    });

    if (!course) {
        return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // 2. Extract all content IDs in this course and build topic breakdown
    const accurateTopicBreakdown = [];
    const allProblemIds = new Set();
    const contentByTopic = new Map();

    const sections = course.sections ? (Array.isArray(course.sections) ? course.sections : JSON.parse(course.sections)) : [];

    sections.forEach(section => {
        const sContentIds = new Set();
        
        const processSub = (sub) => {
            (sub.problemIds || []).forEach(id => { allProblemIds.add(id); sContentIds.add(id); });
            (sub.sqlProblemIds || []).forEach(id => { allProblemIds.add(id); sContentIds.add(id); });
            (sub.videoIds || []).forEach(id => { allProblemIds.add(id); sContentIds.add(id); });
            (sub.quizIds || []).forEach(id => { allProblemIds.add(id); sContentIds.add(id); });
            (sub.articleIds || []).forEach(id => { allProblemIds.add(id); sContentIds.add(id); });
            (sub.assignmentIds || []).forEach(id => { allProblemIds.add(id); sContentIds.add(id); });
        };

        // Process section-level content
        processSub(section);
        
        // Process subsections
        (section.subsections || []).forEach(sub => processSub(sub));

        accurateTopicBreakdown.push({
            name: section.title || 'Untitled Section',
            contentIds: Array.from(sContentIds),
            total: sContentIds.size,
            solved: 0,
            percentage: 0
        });
    });

    const allCourseContentIds = Array.from(allProblemIds);

    // 3. Fetch submissions and progress for these IDs
    const [solvedSubmissions, completedProgress] = await Promise.all([
        prisma.submission.findMany({
            where: { studentId, courseId: course.id, verdict: 'Accepted' },
            select: { problemId: true, sqlProblemId: true, quizId: true, videoId: true, articleId: true, points: true }
        }),
        prisma.progress.findMany({
            where: { studentId, status: 'completed', contentId: { in: allCourseContentIds } },
            select: { contentId: true }
        })
    ]);

    const solvedProblemIds = new Set();
    solvedSubmissions.forEach(s => {
        if (s.problemId) solvedProblemIds.add(s.problemId);
        if (s.sqlProblemId) solvedProblemIds.add(s.sqlProblemId);
        if (s.quizId) solvedProblemIds.add(s.quizId);
        if (s.videoId) solvedProblemIds.add(s.videoId);
        if (s.articleId) solvedProblemIds.add(s.articleId);
    });
    completedProgress.forEach(p => solvedProblemIds.add(p.contentId));

    // 4. Update topic breakdown with real solved counts
    accurateTopicBreakdown.forEach(topic => {
        topic.solved = topic.contentIds.filter(id => solvedProblemIds.has(id)).length;
        topic.percentage = topic.total > 0 ? Math.round((topic.solved / topic.total) * 100) : 0;
        delete topic.contentIds; // Clean up response
    });

    // 5. Get Score and Rank from CourseLeaderboard
    let lbEntry = await prisma.courseLeaderboard.findUnique({
        where: { courseId_studentId: { courseId: course.id, studentId } }
    });

    if (!lbEntry) {
        const totalPoints = solvedSubmissions.reduce((sum, s) => sum + (s.points || 0), 0);
        lbEntry = { overallScore: totalPoints };
        const student = await prisma.user.findUnique({ where: { id: studentId }, select: { username: true, email: true } });
        const username = student?.username || student?.email?.split('@')[0];
        await CourseLeaderboard.upsert(course.id, studentId, username, totalPoints);
    }

    const rank = await prisma.courseLeaderboard.count({
        where: { courseId: course.id, overallScore: { gt: lbEntry?.overallScore || 0 } }
    }) + 1;

    // 6. Multi-range Data Aggregation (Calculated for ALL ranges to allow individual frontend toggles)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [heatmapSubmissions, progressCompletions] = await Promise.all([
        prisma.submission.findMany({
            where: { studentId, courseId: course.id, verdict: 'Accepted' },
            select: { createdAt: true, points: true, problemId: true, sqlProblemId: true, quizId: true, videoId: true, articleId: true }
        }),
        prisma.progress.findMany({
            where: { studentId, status: 'completed', contentId: { in: allCourseContentIds } },
            select: { lastAttemptAt: true, contentType: true, contentId: true }
        })
    ]);

    const activeDates = new Set();
    const heatmapData = {};
    heatmapSubmissions.forEach(sub => {
        const dateKey = sub.createdAt.toDateString();
        heatmapData[dateKey] = (heatmapData[dateKey] || 0) + 1;
        activeDates.add(dateKey);
    });
    progressCompletions.forEach(prog => {
        const dateKey = prog.lastAttemptAt.toDateString();
        heatmapData[dateKey] = (heatmapData[dateKey] || 0) + 1;
        activeDates.add(dateKey);
    });

    const ranges = ['week', 'month', 'year', 'all'];
    const rangeData = {};

    ranges.forEach(range => {
        const dailyHistory = [];
        const metrics = { quizzes: [], videos: [], problems: [], articles: [] };

        if (range === 'all') {
            // For all time, we find the first submission date and divide into ~15 points
            const firstSub = heatmapSubmissions[0];
            const startDate = firstSub ? new Date(firstSub.createdAt) : new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
            startDate.setHours(0, 0, 0, 0);
            
            const diffTime = Math.abs(today - startDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const interval = Math.max(1, Math.ceil(diffDays / 15));

            for (let i = 0; i <= 15; i++) {
                const date = new Date(startDate.getTime() + i * interval * 24 * 60 * 60 * 1000);
                if (date > today && i < 15) continue;
                const finalDate = date > today ? today : date;
                
                const label = `${finalDate.getDate().toString().padStart(2, '0')}-${(finalDate.getMonth() + 1).toString().padStart(2, '0')}-${finalDate.getFullYear()}`;
                const endOfDate = new Date(finalDate);
                endOfDate.setHours(23, 59, 59, 999);

                let scoreAtDate = 0;
                heatmapSubmissions.forEach(sub => {
                    if (new Date(sub.createdAt) <= endOfDate) scoreAtDate += sub.points || 0;
                });

                dailyHistory.push({ 
                    name: label, 
                    score: scoreAtDate, 
                    rank: rank,
                    fullDate: finalDate.toISOString()
                });
                
                if (finalDate >= today) break;
            }
        } else if (range === 'year') {
            for (let i = 11; i >= 0; i--) {
                const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
                const label = date.toLocaleString('en-US', { month: 'short', year: '2-digit' });
                const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
                const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

                let scoreAtDate = 0;
                heatmapSubmissions.forEach(sub => {
                    if (new Date(sub.createdAt) <= endOfMonth) scoreAtDate += sub.points || 0;
                });

                dailyHistory.push({ name: label, score: scoreAtDate, rank: rank });

                const counts = { quiz: 0, video: 0, problem: 0, article: 0 };
                progressCompletions.forEach(rec => {
                    const recDate = new Date(rec.lastAttemptAt);
                    if (recDate >= startOfMonth && recDate <= endOfMonth) {
                        if (rec.contentType === 'quiz') counts.quiz++;
                        else if (rec.contentType === 'video') counts.video++;
                        else if (['problem', 'sql'].includes(rec.contentType)) counts.problem++;
                        else if (rec.contentType === 'article') counts.article++;
                    }
                });
                metrics.quizzes.push({ name: label, count: counts.quiz });
                metrics.videos.push({ name: label, count: counts.video });
                metrics.problems.push({ name: label, count: counts.problem });
                metrics.articles.push({ name: label, count: counts.article });
            }
        } else {
            const days = range === 'week' ? 7 : 30;
            for (let i = days - 1; i >= 0; i--) {
                const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
                const label = range === 'week' ? d.toLocaleDateString('en-US', { weekday: 'short' }) : `${d.getDate().toString().padStart(2, '0')} ${d.toLocaleString('en-US', { month: 'short' })}`;
                const startOfDay = new Date(d); startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(d); endOfDay.setHours(23, 59, 59, 999);

                let scoreAtDate = 0;
                heatmapSubmissions.forEach(sub => {
                    if (new Date(sub.createdAt) <= endOfDay) scoreAtDate += sub.points || 0;
                });

                dailyHistory.push({ name: label, score: scoreAtDate, rank: rank });

                const counts = { quiz: 0, video: 0, problem: 0, article: 0 };
                progressCompletions.forEach(rec => {
                    const recDate = new Date(rec.lastAttemptAt);
                    if (recDate >= startOfDay && recDate <= endOfDay) {
                        if (rec.contentType === 'quiz') counts.quiz++;
                        else if (rec.contentType === 'video') counts.video++;
                        else if (['problem', 'sql'].includes(rec.contentType)) counts.problem++;
                        else if (rec.contentType === 'article') counts.article++;
                    }
                });
                metrics.quizzes.push({ name: label, count: counts.quiz });
                metrics.videos.push({ name: label, count: counts.video });
                metrics.problems.push({ name: label, count: counts.problem });
                metrics.articles.push({ name: label, count: counts.article });
            }
        }
        rangeData[range] = { dailyHistory, metrics };
    });

    // 7. Calculate Streak (Always based on full history)
    const sortedActiveDates = Array.from(activeDates).map(d => new Date(d)).sort((a, b) => b - a);
    let currentStreak = 0;
    let maxStreak = 0;

    if (sortedActiveDates.length > 0) {
        let checkDate = new Date(sortedActiveDates[0]);
        checkDate.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((today - checkDate) / (1000 * 60 * 60 * 24));
        if (diffDays <= 1) {
            currentStreak = 1;
            for (let i = 1; i < sortedActiveDates.length; i++) {
                const prevDate = new Date(sortedActiveDates[i]);
                prevDate.setHours(0, 0, 0, 0);
                const dayDiff = Math.floor((checkDate - prevDate) / (1000 * 60 * 60 * 24));
                if (dayDiff === 1) {
                    currentStreak++;
                    checkDate = prevDate;
                } else if (dayDiff > 1) break;
            }
        }
        // Max Streak
        let running = 1;
        let mCheckDate = new Date(sortedActiveDates[sortedActiveDates.length - 1]);
        mCheckDate.setHours(0, 0, 0, 0);
        maxStreak = 1;
        for (let i = sortedActiveDates.length - 2; i >= 0; i--) {
            const nextDate = new Date(sortedActiveDates[i]);
            nextDate.setHours(0, 0, 0, 0);
            const dayDiff = Math.floor((nextDate - mCheckDate) / (1000 * 60 * 60 * 24));
            if (dayDiff === 1) running++;
            else if (dayDiff > 1) running = 1;
            maxStreak = Math.max(maxStreak, running);
            mCheckDate = nextDate;
        }
    }

    // 9. Course Contests
    const courseContests = await prisma.courseContest.findMany({
        where: { courseId: course.id },
        orderBy: { createdAt: 'desc' },
        take: 5
    });

    // 10. Monthly Sheet Progress
    const monthlySheetProgress = await prisma.sheetProgress.findMany({
        where: { 
            userId: studentId, 
            completed: true,
            completedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
        },
        include: { sheetProblem: true },
        take: 10
    });

    // 11. Metrics & Difficulty
    const solvedByDifficulty = { easy: { solved: 0, total: 0 }, medium: { solved: 0, total: 0 }, hard: { solved: 0, total: 0 } };

    const [allProblems, allSqls, allQuizzes, allVideos, allArticles] = await Promise.all([
        prisma.problem.findMany({ where: { id: { in: allCourseContentIds } }, select: { id: true, difficulty: true } }),
        prisma.sqlProblem.findMany({ where: { id: { in: allCourseContentIds } }, select: { id: true, difficulty: true } }),
        prisma.quiz.findMany({ where: { id: { in: allCourseContentIds } }, select: { id: true, difficulty: true } }),
        prisma.video.findMany({ where: { id: { in: allCourseContentIds } }, select: { id: true, difficulty: true } }),
        prisma.privateArticle.findMany({ where: { id: { in: allCourseContentIds } }, select: { id: true, difficulty: true } })
    ]);

    [...allProblems, ...allSqls, ...allQuizzes, ...allVideos, ...allArticles].forEach(p => {
        const diff = (p.difficulty || 'Easy').toLowerCase();
        if (solvedByDifficulty[diff]) {
            solvedByDifficulty[diff].total++;
            if (solvedProblemIds.has(p.id)) solvedByDifficulty[diff].solved++;
        }
    });

    // 12. Recent activity
    const recentSubmissions = await prisma.submission.findMany({
        where: { studentId, courseId: course.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
            problem: { select: { title: true, type: true } },
            quiz: { select: { title: true, type: true } },
            sqlProblem: { select: { title: true, type: true } },
            video: { select: { title: true, type: true } },
            privateArticle: { select: { title: true, type: true } }
        }
    });

    res.json({
        success: true,
        analytics: {
            courseId: course.id,
            courseTitle: course.title,
            userSubmissionsHeatMapData: heatmapData,
            courseContests,
            monthlySheetProgress,
            rangeData, // ALL historical data ranges
            solvedByDifficulty,
            progress: {
                total: allCourseContentIds.length,
                solved: solvedProblemIds.size,
                percentage: allCourseContentIds.length > 0 ? Math.round((solvedProblemIds.size / allCourseContentIds.length) * 100) : 0,
                streakDays: currentStreak,
                maxStreakDays: maxStreak,
                activeDateStrings: Array.from(activeDates)
            },
            stats: {
                score: lbEntry?.overallScore || 0,
                rank,
                streak: currentStreak,
                totalPoints: lbEntry?.overallScore || 0
            },
            recentActivity: recentSubmissions.map(s => ({
                id: s.id,
                title: s.problem?.title || s.quiz?.title || s.sqlProblem?.title || s.video?.title || s.privateArticle?.title || 'Unknown',
                type: s.problem?.type || s.quiz?.type || s.sqlProblem?.type || s.video?.type || s.privateArticle?.type || 'coding',
                verdict: s.verdict,
                submittedAt: s.createdAt,
                points: s.points,
                problemTitle: s.problem?.title || s.quiz?.title || s.sqlProblem?.title || s.video?.title || s.privateArticle?.title || 'Unknown',
                problemType: s.problem?.type || s.quiz?.type || s.sqlProblem?.type || s.video?.type || s.privateArticle?.type || 'coding'
            }))
        }
    });
});

/**
 * Get overall analytics for a student across all courses
 */
const getOverallAnalytics = asyncHandler(async (req, res) => {
    const studentId = req.user.userId || req.user.id;

    // 1. Get all course leaderboard entries for this user
    const courseStats = await prisma.courseLeaderboard.findMany({
        where: { studentId },
        include: {
            course: { select: { title: true, slug: true, id: true } }
        }
    });

    // 2. Aggregate total progress
    const totalSolved = await prisma.submission.count({
        where: { studentId, verdict: 'Accepted' }
    });

    const totalPoints = courseStats.reduce((sum, s) => sum + (s.overallScore || 0), 0);

    // 3. Get progress per course
    const coursesProgress = await Promise.all(courseStats.map(async (cs) => {
        // This is expensive if there are many courses, but usually students have 1-5 active courses.
        const course = await prisma.course.findUnique({ where: { id: cs.courseId } });
        const problemIds = new Set();
        (course.sections || []).forEach(section => {
            (section.problemIds || []).forEach(pid => problemIds.add(pid));
            (section.subsections || []).forEach(sub => {
                (sub.problemIds || []).forEach(pid => problemIds.add(pid));
            });
        });

        const solvedInCourse = await prisma.submission.count({
            where: { studentId, problemId: { in: Array.from(problemIds) }, verdict: 'Accepted' }
        });

        return {
            id: cs.courseId,
            title: cs.course.title,
            slug: cs.course.slug,
            solved: solvedInCourse,
            total: problemIds.size,
            percentage: problemIds.size > 0 ? Math.round((solvedInCourse / problemIds.size) * 100) : 0,
            score: cs.overallScore
        };
    }));

    res.json({
        success: true,
        overall: {
            totalPoints,
            totalSolved,
            courseCount: courseStats.length,
            courses: coursesProgress
        }
    });
});

/**
 * Paged course leaderboard
 */
const getCourseLeaderboardPaged = asyncHandler(async (req, res) => {
    const { courseId: idOrSlug } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Find course
    const course = await prisma.course.findFirst({
        where: {
            OR: [{ id: idOrSlug }, { slug: idOrSlug }]
        }
    });

    if (!course) {
        return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Use the model to get the full merged leaderboard (including 0-point students)
    const fullLeaderboard = await CourseLeaderboard.getLeaderboard(course.id);
    const total = fullLeaderboard.length;
    const pagedLeaderboard = fullLeaderboard.slice(skip, skip + limit);

    res.json({
        success: true,
        leaderboard: pagedLeaderboard,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    });
});

/**
 * Paged global leaderboard
 */
const getGlobalLeaderboardPaged = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';

    const { total, entries } = await Leaderboard.getGlobalLeaderboardPaged(page, limit, search);

    res.json({
        success: true,
        leaderboard: entries,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    });
});

module.exports = {
    getCourseAnalytics,
    getOverallAnalytics,
    getCourseLeaderboardPaged,
    getGlobalLeaderboardPaged
};
