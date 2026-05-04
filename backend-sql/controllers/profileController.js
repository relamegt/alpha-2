const User = require('../models/User');
const prisma = require('../config/db');
const ExternalProfile = require('../models/ExternalProfile');
const Submission = require('../models/Submission');
const Progress = require('../models/Progress');
// NOTE: Leaderboard is NOT required at the top level — it causes a circular dependency.
// It is lazy-required inside getDashboardData instead (see below).
const { syncStudentProfiles, syncBatchProfiles } = require('../services/profileSyncService');
const { sendProfileResetNotification } = require('../services/emailService');
const UserBatch = require('../models/UserBatch');


// Get student dashboard data
const getDashboardData = async (req, res) => {
    try {
        const studentId = req.user.userId;
        const student = await User.findById(studentId);

        let assignedCourses = [];
        const isInstructor = req.user.role === 'instructor';
        const isStudent = req.user.role === 'student';

        if ((isStudent && student.batchId) || (isInstructor && (student.batchId || (student.assignedBatches && student.assignedBatches.length > 0)))) {
            const Batch = require('../models/Batch');
            const Course = require('../models/Course');
            
            let batchIds = [];
            if (isStudent) {
                batchIds = [student.batchId];
            } else {
                batchIds = [student.batchId, ...(student.assignedBatches || []).map(b => b.id)].filter(id => id);
                // Deduplicate
                batchIds = [...new Set(batchIds.map(id => String(id)))];
            }

            if (batchIds.length > 0) {
                const batches = await Promise.all(batchIds.map(id => Batch.findById(id)));
                const courseIds = [...new Set(batches.flatMap(b => b ? b.assignedCourses : []))];
                
                if (courseIds.length > 0) {
                    assignedCourses = await Course.findByIds(courseIds);
                    // Return only necessary fields to reduce payload
                    assignedCourses = assignedCourses.map(c => ({
                        id: c.id,
                        _id: c.id,
                        title: c.title,
                        description: c.description,
                        slug: c.slug,
                        thumbnailUrl: c.thumbnailUrl,
                        sections: (c.sections || []).map(s => ({
                            id: s.id,
                            _id: s.id,
                            title: s.title,
                            subsections: (s.subsections || []).map(sub => ({
                                id: sub.id,
                                _id: sub.id,
                                title: sub.title,
                                problemIds: sub.problemIds || [],
                                contestIds: sub.contestIds || [],
                                courseContestIds: sub.courseContestIds || []
                            }))
                        }))
                    }));
                }
            }
        }

        // Add Online Enrollments
        if (isStudent) {
            const onlineEnrollments = await UserBatch.findActiveByUserId(studentId);
            const onlineCourses = onlineEnrollments
                .filter(eb => eb.course) // Safety check
                .map(eb => ({
                    id: eb.course.id,
                    _id: eb.course.id,
                    title: eb.course.title,
                    description: eb.course.description,
                    slug: eb.course.slug,
                    thumbnailUrl: eb.course.thumbnailUrl,
                    sections: eb.course.sections || [],
                    expiryDate: eb.accessExpiresAt,
                    isOnline: true
                }));
            
            // Merge courses avoiding duplicates
            const assignedIds = new Set(assignedCourses.map(c => c.id));
            onlineCourses.forEach(oc => {
                if (!assignedIds.has(oc.id)) {
                    assignedCourses.push(oc);
                }
            });
        }

        // Fetch and attach ratings for all assigned courses
        if (assignedCourses.length > 0) {
            const cIds = assignedCourses.map(c => c.id);
            const courseStats = await prisma.course.findMany({
                where: { id: { in: cIds } },
                select: {
                    id: true,
                    _count: { select: { ratings: true } },
                    ratings: { select: { rating: true } }
                }
            });
            
            const statsMap = new Map();
            for (const stat of courseStats) {
                const count = stat._count.ratings;
                const sum = stat.ratings.reduce((acc, r) => acc + r.rating, 0);
                statsMap.set(stat.id, {
                    ratingCount: count,
                    averageRating: count > 0 ? sum / count : 0
                });
            }

            assignedCourses = assignedCourses.map(c => {
                const stats = statsMap.get(c.id) || { ratingCount: 0, averageRating: 0 };
                return { ...c, ...stats };
            });
        }

        // Get heatmap data (keys are Date.toDateString() e.g. "Mon Feb 21 2026")
        const heatmapData = await Submission.getHeatmapData(studentId);

        // Get verdict data
        const verdictData = await Submission.getVerdictData(studentId);

        // Get recent submissions
        const recentSubmissions = await Submission.findRecentSubmissions(studentId, 10);

        // Get language stats
        const languageStats = await Submission.getLanguageStats(studentId);

        // Get progress (base stats from DB)
        const progress = await Progress.getStatistics(studentId);

        // --- Sheets Progress Tracking ---
        const monthlySheetProgress = await prisma.sheetProgress.findMany({
            where: { 
                userId: studentId, 
                completed: true,
                completedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
            },
            include: { sheetProblem: true }
        });

        // --- Contests Logic (ONLINE vs OFFLINE) ---
        // 1. Course Contests (Available to all enrolled)
        const courseContests = await prisma.courseContest.findMany({
            where: {
                OR: [
                    { courseId: { in: assignedCourses.map(c => c.id) } },
                    { batchId: student.batchId || 'NONE' }
                ]
            },
            orderBy: { createdAt: 'desc' }
        });

        // 2. Internal Contests (OFFLINE ONLY)
        let internalContests = [];
        if (student.studentType === 'OFFLINE' && student.batchId) {
            internalContests = await prisma.contest.findMany({
                where: { batchId: student.batchId },
                orderBy: { startTime: 'desc' }
            });
        }

        // ── Compute current streak & max streak from heatmap (source of truth) ──
        const activeDateStrings = new Set(
            Object.entries(heatmapData)
                .filter(([, count]) => count > 0)
                .map(([dateStr]) => dateStr)
        );

        let currentStreak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let checkDate = new Date(today);
        while (activeDateStrings.has(checkDate.toDateString())) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
        }
        if (currentStreak === 0) {
            checkDate = new Date(today);
            checkDate.setDate(checkDate.getDate() - 1);
            while (activeDateStrings.has(checkDate.toDateString())) {
                currentStreak++;
                checkDate.setDate(checkDate.getDate() - 1);
            }
        }

        const sortedDates = [...activeDateStrings]
            .map(ds => new Date(ds))
            .sort((a, b) => a - b);

        let maxStreak = 0;
        let runningStreak = 0;
        let prevDate = null;
        for (const d of sortedDates) {
            if (!prevDate) {
                runningStreak = 1;
            } else {
                const diff = Math.round((d - prevDate) / (1000 * 60 * 60 * 24));
                runningStreak = diff === 1 ? runningStreak + 1 : 1;
            }
            if (runningStreak > maxStreak) maxStreak = runningStreak;
            prevDate = d;
        }

        // --- Compute Chart Data & Metrics (Dynamic Range: Week, Month, Year) ---
        const range = req.query.range || 'month';
        const chartData = [];
        const metrics = { quizzes: [], videos: [], problems: [], articles: [] };

        const allAcceptedSubmissions = await prisma.submission.findMany({
            where: { studentId, verdict: 'Accepted' },
            select: { createdAt: true, problemId: true, sqlProblemId: true, quizId: true },
            orderBy: { createdAt: 'asc' }
        });

        const problemPoints = await prisma.problem.findMany({ select: { id: true, points: true } });
        const sqlPoints = await prisma.sqlProblem.findMany({ select: { id: true, points: true } });
        const quizPoints = await prisma.quiz.findMany({ select: { id: true, points: true } });
        
        const pointsMap = new Map();
        [...problemPoints, ...sqlPoints, ...quizPoints].forEach(p => pointsMap.set(p.id, p.points || 10));

        const progressRecords = await prisma.progress.findMany({
            where: { studentId, status: 'completed' },
            select: { contentType: true, lastAttemptAt: true }
        });

        let leaderboardStats = null;
        try {
            const LeaderboardModel = require('../models/Leaderboard');
            leaderboardStats = await LeaderboardModel.getStudentRank(studentId);
        } catch (e) {
            console.error('[profileController] Leaderboard fetch failed:', e.message);
        }

        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        if (range === 'year') {
            // Last 12 months aggregation
            for (let i = 11; i >= 0; i--) {
                const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
                const monthLabel = date.toLocaleString('en-US', { month: 'short', year: '2-digit' });
                
                const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
                const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

                // Cumulative Score at end of month
                let scoreAtDate = 0;
                allAcceptedSubmissions.forEach(sub => {
                    if (new Date(sub.createdAt) <= endOfMonth) {
                        const id = sub.problemId || sub.sqlProblemId || sub.quizId;
                        scoreAtDate += pointsMap.get(id) || 10;
                    }
                });

                chartData.push({ 
                    name: monthLabel, 
                    score: scoreAtDate,
                    rank: (i === 0 && leaderboardStats) ? leaderboardStats.globalRank : 0,
                    fullDate: endOfMonth.toISOString()
                });

                // Monthly activity counts
                const counts = { quizzes: 0, videos: 0, problems: 0, articles: 0 };
                progressRecords.forEach(rec => {
                    const recDate = new Date(rec.lastAttemptAt);
                    if (recDate >= startOfMonth && recDate <= endOfMonth) {
                        if (rec.contentType === 'quiz') counts.quizzes++;
                        else if (rec.contentType === 'video') counts.videos++;
                        else if (rec.contentType === 'problem') counts.problems++;
                        else if (rec.contentType === 'article' || rec.contentType === 'public_article') counts.articles++;
                    }
                });

                metrics.quizzes.push({ name: monthLabel, count: counts.quizzes });
                metrics.videos.push({ name: monthLabel, count: counts.videos });
                metrics.problems.push({ name: monthLabel, count: counts.problems });
                metrics.articles.push({ name: monthLabel, count: counts.articles });
            }
        } else {
            // Daily aggregation for week/month
            const daysToFetch = range === 'week' ? 7 : 30;
            const oneDayMs = 24 * 60 * 60 * 1000;

            for (let i = daysToFetch - 1; i >= 0; i--) {
                const date = new Date(today.getTime() - i * oneDayMs);
                const label = `${date.getDate().toString().padStart(2, '0')} ${date.toLocaleString('en-US', { month: 'short' })}`;

                const endOfDate = new Date(date);
                endOfDate.setHours(23, 59, 59, 999);

                let scoreAtDate = 0;
                allAcceptedSubmissions.forEach(sub => {
                    if (new Date(sub.createdAt) <= endOfDate) {
                        const id = sub.problemId || sub.sqlProblemId || sub.quizId;
                        scoreAtDate += pointsMap.get(id) || 10;
                    }
                });

                chartData.push({ 
                    name: label, 
                    score: scoreAtDate,
                    rank: (i === 0 && leaderboardStats) ? leaderboardStats.globalRank : 0,
                    fullDate: date.toISOString()
                });

                const counts = { quizzes: 0, videos: 0, problems: 0, articles: 0 };
                progressRecords.forEach(rec => {
                    const recDate = new Date(rec.lastAttemptAt);
                    if (recDate.toDateString() === date.toDateString()) {
                        if (rec.contentType === 'quiz') counts.quizzes++;
                        else if (rec.contentType === 'video') counts.videos++;
                        else if (rec.contentType === 'problem') counts.problems++;
                        else if (rec.contentType === 'article' || rec.contentType === 'public_article') counts.articles++;
                    }
                });

                metrics.quizzes.push({ name: label, count: counts.quizzes });
                metrics.videos.push({ name: label, count: counts.videos });
                metrics.problems.push({ name: label, count: counts.problems });
                metrics.articles.push({ name: label, count: counts.articles });
            }
        }

        if (progress) {
            progress.streakDays = currentStreak;
            progress.maxStreakDays = maxStreak;
            progress.chartData = chartData;
            progress.metrics = metrics;
            progress.activeDateStrings = Array.from(activeDateStrings);
        }

        const externalStats = await ExternalProfile.getStudentExternalStats(studentId);

        return res.json({
            success: true,
            dashboard: {
                userSubmissionsHeatMapData: heatmapData,
                userVerdictData: verdictData,
                recentSubmissions: recentSubmissions.map(s => ({
                    submittedAt: s.createdAt,
                    problemTitle: s.problemTitle,
                    problemId: s.problemId,
                    problemSlug: s.problemSlug,
                    problemType: s.problemType,
                    verdict: s.verdict,
                    language: s.language,
                    testCasesPassed: s.testCasesPassed,
                    totalTestCases: s.totalTestCases
                })),
                languageAcceptedSubmissions: languageStats,
                progress,
                externalContestStats: externalStats,
                leaderboardStats,
                assignedCourses,
                monthlySheetProgress,
                courseContests,
                internalContests
            }
        });
    } catch (error) {
        console.error('Get dashboard data error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard data',
            error: error.message
        });
    }
};


// Lightweight endpoint: Get assigned courses only (for navbar)
const getAssignedCourses = async (req, res) => {
    try {
        const studentId = req.user.userId;
        const student = await User.findById(studentId);

        let assignedCourses = [];
        const isInstructor = req.user.role === 'instructor';
        const isStudent = req.user.role === 'student';

        if ((isStudent && student.batchId) || (isInstructor && (student.batchId || (student.assignedBatches && student.assignedBatches.length > 0)))) {
            const Batch = require('../models/Batch');
            const Course = require('../models/Course');

            let batchIds = [];
            if (isStudent) {
                batchIds = [student.batchId];
            } else {
                batchIds = [student.batchId, ...(student.assignedBatches || []).map(b => b.id)].filter(id => id);
                batchIds = [...new Set(batchIds.map(id => String(id)))];
            }

            if (batchIds.length > 0) {
                const batches = await Promise.all(batchIds.map(id => Batch.findById(id)));
                const courseIds = [...new Set(batches.flatMap(b => b ? b.assignedCourses : []))];
                
                if (courseIds.length > 0) {
                    assignedCourses = await Course.findByIds(courseIds);
                    assignedCourses = assignedCourses.map(c => ({
                        id: c.id,
                        _id: c.id, // Add _id for frontend compatibility
                        title: c.title,
                        slug: c.slug,
                        thumbnailUrl: c.thumbnailUrl
                    }));
                }
            }
        }

        // Add Online Enrollments (Navbar optimized)
        if (isStudent) {
            const onlineEnrollments = await UserBatch.findActiveByUserId(studentId);
            const onlineCourses = onlineEnrollments
                .filter(eb => eb.course)
                .map(eb => ({
                    id: eb.course.id,
                    _id: eb.course.id,
                    title: eb.course.title,
                    slug: eb.course.slug,
                    thumbnailUrl: eb.course.thumbnailUrl,
                    isOnline: true
                }));
            
            const assignedIds = new Set(assignedCourses.map(c => c.id));
            onlineCourses.forEach(oc => {
                if (!assignedIds.has(oc.id)) {
                    assignedCourses.push(oc);
                }
            });
        }

        res.json({ success: true, assignedCourses });
    } catch (error) {
        console.error('Get assigned courses error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch courses' });
    }
};

// Update profile
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const updateData = {};

        // Profile fields
        if (req.body.isPublicProfile !== undefined) updateData.isPublicProfile = req.body.isPublicProfile;
        if (req.body.profilePicture !== undefined) updateData['profile.profilePicture'] = req.body.profilePicture;
        if (req.body.phone) updateData['profile.phone'] = req.body.phone;
        if (req.body.whatsapp) updateData['profile.whatsapp'] = req.body.whatsapp;
        if (req.body.dob) updateData['profile.dob'] = new Date(req.body.dob);
        if (req.body.gender) updateData['profile.gender'] = req.body.gender;
        if (req.body.tshirtSize) updateData['profile.tshirtSize'] = req.body.tshirtSize;
        if (req.body.aboutMe) updateData['profile.aboutMe'] = req.body.aboutMe;

        // Address
        if (req.body.address) {
            Object.keys(req.body.address).forEach(key => {
                updateData[`profile.address.${key}`] = req.body.address[key];
            });
        }

        // Social links
        if (req.body.socialLinks) {
            Object.keys(req.body.socialLinks).forEach(key => {
                updateData[`profile.socialLinks.${key}`] = req.body.socialLinks[key];
            });
        }

        // Professional links
        if (req.body.professionalLinks) {
            Object.keys(req.body.professionalLinks).forEach(key => {
                updateData[`profile.professionalLinks.${key}`] = req.body.professionalLinks[key];
            });
        }

        // Skills
        if (req.body.skills) updateData.skills = req.body.skills;

        // Education (students only)
        if (req.user.role === 'student' && req.body.education) {
            Object.keys(req.body.education).forEach(key => {
                updateData[`education.${key}`] = req.body.education[key];
            });
        }

        await User.updateProfile(userId, updateData);

        const updatedUser = await User.findById(userId);

        res.json({
            success: true,
            message: 'Profile updated successfully',
            profile: updatedUser.profile
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile',
            error: error.message
        });
    }
};


// Link external profile
const linkExternalProfile = async (req, res) => {
    try {
        const { platform, username } = req.body;
        const studentId = req.user.userId;
        const isSocial = ExternalProfile.isSocialPlatform(platform);

        // Check if profile already exists for this platform
        let profile = await ExternalProfile.findByStudentAndPlatform(studentId, platform);

        if (profile) {
            // If the handle is different, update it
            if (profile.username !== username) {
                const updateData = { username };
                if (!isSocial) {
                    updateData.lastSynced = new Date(0); // Forces immediate sync on next run
                }
                await ExternalProfile.update(profile.id, updateData);
                // Fetch the updated version to return in response
                profile = await ExternalProfile.findById(profile.id);

                // Trigger an immediate re-sync for coding platforms, otherwise just update leaderboard for social profiles
                if (!isSocial) {
                    await require('../services/profileSyncService').syncProfile(profile.id);
                } else {
                    await require('../config/queue').addScoreJob(studentId);
                }
            }
        } else {
            // Create new profile if it doesn't exist
            profile = await ExternalProfile.create({
                studentId,
                platform,
                username
            });

            // Initial sync for coding platforms, otherwise just update leaderboard for social profiles
            if (!isSocial) {
                await require('../services/profileSyncService').syncProfile(profile.id);
            } else {
                await require('../config/queue').addScoreJob(studentId);
            }
        }

        res.status(profile ? 200 : 201).json({
            success: true,
            message: 'External profile updated successfully',
            profile
        });
    } catch (error) {
        console.error('Link external profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to link external profile',
            error: error.message
        });
    }
};


// Manual sync (1 attempt per week - triggers full batch update in background)
const manualSyncProfiles = async (req, res) => {
    try {
        const studentId = req.user.userId;

        // Check if manual sync is allowed
        const canSync = await ExternalProfile.canManualSync(studentId);
        if (!canSync.allowed) {
            return res.status(429).json({
                success: false,
                message: 'Manual sync allowed once per week',
                nextAllowedDate: canSync.nextAllowedDate
            });
        }

        // Get user's batch
        const user = await User.findById(studentId);
        if (!user.batchId) {
            return res.status(400).json({
                success: false,
                message: 'You must be assigned to a batch'
            });
        }

        // Determine next sync date based on environment
        let nextSyncDate = null;
        if (process.env.NODE_ENV === 'production') {
            nextSyncDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days lock in prod
            
            // Lock all coding profiles in the batch right away
            const students = await User.getStudentsByBatch(user.batchId);
            for (const student of students) {
                const profiles = await ExternalProfile.findByStudent(student.id);
                for (const profile of profiles) {
                    if (!ExternalProfile.isSocialPlatform(profile.platform)) {
                        await ExternalProfile.updateNextSyncAllowed(profile.id, nextSyncDate);
                    }
                }
            }
        } else {
            // In development, unlock immediately (unlimited syncs)
            nextSyncDate = new Date();
        }

        // Respond immediately — sync happens in the background
        res.json({
            success: true,
            message: 'Sync started! Scores will update in a few minutes.',
            nextSyncAllowed: nextSyncDate
        });

        // Fire-and-forget: run the actual batch sync in the background
        syncBatchProfiles(user.batchId).catch(err => {
            console.error('Background batch sync error:', err.message);
        });
    } catch (error) {
        console.error('Manual sync profiles error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to sync profiles',
            error: error.message
        });
    }
};


// Get external profiles
const getExternalProfiles = async (req, res) => {
    try {
        const studentId = req.params.studentId || req.user.userId;

        // Check ownership
        if (req.user.role === 'student' && studentId !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const profiles = await ExternalProfile.findByStudent(studentId);

        // Find the latest nextSyncAllowed across all coding profiles
        let nextSyncAllowed = null;
        for (const profile of profiles) {
            if (!ExternalProfile.isSocialPlatform(profile.platform) && profile.nextSyncAllowed) {
                if (!nextSyncAllowed || new Date(profile.nextSyncAllowed) > new Date(nextSyncAllowed)) {
                    nextSyncAllowed = profile.nextSyncAllowed;
                }
            }
        }

        res.json({
            success: true,
            count: profiles.length,
            profiles,
            nextSyncAllowed
        });
    } catch (error) {
        console.error('Get external profiles error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch external profiles',
            error: error.message
        });
    }
};


// Delete external profile
const deleteExternalProfile = async (req, res) => {
    try {
        const { profileId } = req.params;

        const profile = await ExternalProfile.findById(profileId);
        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'Profile not found'
            });
        }

        // Check ownership
        if (req.user.role === 'student' && profile.studentId.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        await ExternalProfile.delete(profileId);

        // Recalculate leaderboard
        await require('../models/Leaderboard').recalculateScores(profile.studentId);

        res.json({
            success: true,
            message: 'External profile deleted successfully'
        });
    } catch (error) {
        console.error('Delete external profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete external profile',
            error: error.message
        });
    }
};


// Get all students for instructor (filtered by their batch)
const getAllStudentsForInstructor = async (req, res) => {
    try {
        const instructorId = req.user.userId;
        const instructor = await User.findById(instructorId);

        let students;

        // If instructor has batchId or assignedBatches, show students from all
        if (instructor.batchId || (instructor.assignedBatches && instructor.assignedBatches.length > 0)) {
            const batchIds = [instructor.batchId, ...(instructor.assignedBatches || []).map(b => b.id)].filter(id => id);
            // Deduplicate
            const uniqueBatchIds = [...new Set(batchIds.map(id => String(id)))];

            students = await User.getStudentsByBatches(uniqueBatchIds);
        } else if (req.user.role === 'admin') {
            // Admins can see all students
            students = await User.findByRole('student');
        } else {
            return res.status(403).json({
                success: false,
                message: 'Instructor must be assigned to a batch'
            });
        }

        res.json({
            success: true,
            count: students.length,
            students: students.map(s => ({
                id: s.id,
                email: s.email,
                firstName: s.firstName,
                lastName: s.lastName,
                rollNumber: s.education?.rollNumber || 'N/A',
                branch: s.education?.branch || 'N/A',
                batchId: s.batchId,
                isActive: s.isActive,
                profileCompleted: s.profileCompleted || false
            }))
        });
    } catch (error) {
        console.error('Get students for instructor error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch students',
            error: error.message
        });
    }
};

// Reset student profile - ONLY AlphaKnowledge practice data
const resetStudentProfile = async (req, res) => {
    try {
        const studentId = req.params.studentId || req.user.userId;
        const requesterId = req.user.userId;
        const requester = await User.findById(requesterId);

        const student = await User.findById(studentId);
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const isSelf = requesterId === studentId;
        const isAdmin = req.user.role === 'admin';
        const isInstructor = req.user.role === 'instructor';

        // Authorization Logic
        if (!isAdmin && !isSelf) {
            if (isInstructor) {
                // Instructor can only reset STUDENTS in their ASSIGNED BATCHES
                const instructorBatches = [requester.batchId, ...(requester.assignedBatches || []).map(b => b.id)]
                    .filter(id => id)
                    .map(id => String(id));

                const studentBatchId = student.batchId ? student.batchId.toString() : null;

                if (student.role !== 'student' || !studentBatchId || !instructorBatches.includes(studentBatchId)) {
                    return res.status(403).json({
                        success: false,
                        message: 'You can only reset students in your assigned batches'
                    });
                }
            } else {
                // Students cannot reset others
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }
        }

        // Reset only AlphaKnowledge practice data (preserves contests)
        const resetResult = await User.resetStudentProfile(studentId);

        // Send notification email
        await sendProfileResetNotification(
            student.email,
            `${student.firstName || 'Student'} ${student.lastName || ''}`.trim(),
            `${requester.firstName || 'Instructor'} ${requester.lastName || ''}`.trim()
        );

        res.json({
            success: true,
            message: 'AlphaKnowledge practice data reset successfully',
            details: {
                cleared: resetResult.cleared,
                preserved: resetResult.preserved,
                note: 'Only AlphaKnowledge practice submissions, progress, and coins were cleared. Contest records, external profiles, personal info, education details, and batch assignment have been preserved.'
            }
        });
    } catch (error) {
        console.error('Reset student profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset student profile',
            error: error.message
        });
    }
};

// Rate a course
const rateCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { rating } = req.body;
        const studentId = req.user.userId;

        if (typeof rating !== 'number' || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5' });
        }

        // Check if enrolled
        const isEnrolled = await prisma.userBatch.findFirst({
            where: { userId: studentId, courseId: courseId, paymentStatus: 'COMPLETED' }
        });

        if (!isEnrolled) {
            // Also check legacy batch logic
            const user = await User.findById(studentId);
            const Batch = require('../models/Batch');
            let hasAccess = false;
            
            if (user.batchId) {
                const batch = await Batch.findById(user.batchId);
                if (batch && batch.assignedCourses.includes(courseId)) hasAccess = true;
            }
            
            if (!hasAccess) {
                return res.status(403).json({ success: false, message: 'Only enrolled students can rate this course' });
            }
        }

        // Upsert rating
        const existingRating = await prisma.courseRating.findUnique({
            where: {
                userId_courseId: {
                    userId: studentId,
                    courseId: courseId
                }
            }
        });

        if (existingRating) {
            await prisma.courseRating.update({
                where: { id: existingRating.id },
                data: { rating }
            });
        } else {
            await prisma.courseRating.create({
                data: {
                    userId: studentId,
                    courseId: courseId,
                    rating
                }
            });
        }

        res.json({ success: true, message: 'Course rated successfully' });
    } catch (error) {
        console.error('Rate course error:', error);
        res.status(500).json({ success: false, message: 'Failed to rate course' });
    }
};

// Export functions (remove searchStudents)
module.exports = {
    getDashboardData,
    getAssignedCourses,
    updateProfile,
    linkExternalProfile,
    manualSyncProfiles,
    getExternalProfiles,
    deleteExternalProfile,
    resetStudentProfile,
    getAllStudentsForInstructor,
    rateCourse
};

