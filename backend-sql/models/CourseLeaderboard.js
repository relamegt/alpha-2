const prisma = require('../config/db');

class CourseLeaderboard {
    static async upsert(courseId, studentId, username, overallScore) {
        return await prisma.courseLeaderboard.upsert({
            where: {
                courseId_studentId: {
                    courseId,
                    studentId
                }
            },
            update: {
                username,
                overallScore,
                lastUpdated: new Date()
            },
            create: {
                courseId,
                studentId,
                username,
                overallScore,
                lastUpdated: new Date()
            }
        });
    }

    static async getLeaderboard(courseId) {
        // 1. Fetch all leaderboard entries (users who earned points)
        const entries = await prisma.courseLeaderboard.findMany({
            where: { courseId },
            include: {
                student: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        username: true,
                        email: true,
                        externalProfiles: {
                            select: {
                                platform: true,
                                stats: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                overallScore: 'desc'
            }
        });

        // 2. Identify all students enrolled in this course
        // A course is enrolled via its assignment to batches.
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: { id: true, slug: true }
        });

        const allBatches = await prisma.batch.findMany({
            select: { id: true, assignedCourses: true }
        });

        const assignedBatchIds = allBatches
            .filter(b => {
                const courses = b.assignedCourses ? (
                    Array.isArray(b.assignedCourses) 
                        ? b.assignedCourses 
                        : (typeof b.assignedCourses === 'string' ? JSON.parse(b.assignedCourses) : [])
                ) : [];
                // Check for both ID and Slug in the assigned courses list
                return courses.includes(course.id) || (course.slug && courses.includes(course.slug));
            })
            .map(b => b.id);

        if (course.onlineBatchId && !assignedBatchIds.includes(course.onlineBatchId)) {
            assignedBatchIds.push(course.onlineBatchId);
        }

        const enrolledStudents = await prisma.user.findMany({
            where: {
                role: 'student',
                OR: [
                    // 1. Students in batches assigned this course
                    { batchId: { in: assignedBatchIds } },
                    // 2. Students manually added to such batches
                    { userBatches: { some: { batchId: { in: assignedBatchIds } } } },
                    // 3. Students directly enrolled in this course via UserBatch
                    { userBatches: { some: { courseId: course.id } } },
                    // 4. Students who purchased the course
                    { courseOrders: { some: { courseId: course.id, status: 'COMPLETED' } } },
                    // 5. Students who have any progress in this course
                    { progress: { some: { courseId: course.id } } },
                    // 6. Students who have any submissions for this course
                    { submissions: { some: { courseId: course.id } } }
                ]
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
                email: true,
                externalProfiles: {
                    select: {
                        platform: true,
                        stats: true
                    }
                }
            }
        });

        // Helper to extract ratings
        const getRatings = (profiles) => {
            const scores = { leetcode: 0, codeforces: 0, codechef: 0 };
            (profiles || []).forEach(p => {
                const rating = p.stats?.rating || p.stats?.currentRating || 0;
                if (p.platform === 'leetcode') scores.leetcode = rating;
                if (p.platform === 'codeforces') scores.codeforces = rating;
                if (p.platform === 'codechef') scores.codechef = rating;
            });
            return scores;
        };

        // 3. Merge: Start with existing entries, then add missing students with 0 points
        const leaderboardMap = new Map();
        entries.forEach(e => leaderboardMap.set(e.studentId, {
            studentId: e.studentId,
            name: `${e.student.firstName} ${e.student.lastName}`.trim(),
            username: e.username || e.student.username || e.student.email.split('@')[0],
            score: e.overallScore,
            overallScore: e.overallScore,
            externalScores: getRatings(e.student.externalProfiles),
            lastUpdated: e.lastUpdated
        }));

        enrolledStudents.forEach(s => {
            if (!leaderboardMap.has(s.id)) {
                leaderboardMap.set(s.id, {
                    studentId: s.id,
                    name: `${s.firstName} ${s.lastName}`.trim(),
                    username: s.username || s.email.split('@')[0],
                    score: 0,
                    overallScore: 0,
                    externalScores: getRatings(s.externalProfiles),
                    lastUpdated: null
                });
            }
        });

        // 4. Sort and add ranking
        return Array.from(leaderboardMap.values())
            .sort((a, b) => b.overallScore - a.overallScore || a.name.localeCompare(b.name))
            .map((entry, index) => ({
                ...entry,
                rank: index + 1
            }));
    }

    static async updateStudentScore(courseId, studentId, additionalPoints) {
        const current = await prisma.courseLeaderboard.findUnique({
            where: {
                courseId_studentId: {
                    courseId,
                    studentId
                }
            }
        });

        const newScore = (current?.overallScore || 0) + additionalPoints;
        
        // We need the username if it's a new entry
        let username = current?.username;
        if (!username) {
            const student = await prisma.user.findUnique({ where: { id: studentId }, select: { username: true, email: true } });
            username = student?.username || student?.email?.split('@')[0];
        }

        return await this.upsert(courseId, studentId, username, newScore);
    }
}

module.exports = CourseLeaderboard;
