const bcrypt = require('bcryptjs');
const prisma = require('../config/db');

class User {
    static async _populateBatches(user) {
        if (!user) return null;
        if (!user.assignedBatchIds || user.assignedBatchIds.length === 0) {
            user.assignedBatches = [];
            return user;
        }
        // Use direct prisma call to avoid circular dependency with Batch model
        user.assignedBatches = await prisma.batch.findMany({
            where: { id: { in: user.assignedBatchIds } }
        });
        return user;
    }

    // Create new user
    static async create(userData) {
        try {
            const hashedPassword = userData.password ? await bcrypt.hash(userData.password, 10) : null;
            const user = await prisma.user.create({
                data: {
                    email: userData.email.toLowerCase(),
                    password: hashedPassword,
                    googleId: userData.googleId || null,
                    firstName: userData.firstName || null,
                    lastName: userData.lastName || null,
                    role: userData.role || 'student',
                    batchId: userData.batchId || null,
                    assignedBatchIds: (userData.batchId && userData.role === 'instructor') ? [userData.batchId] : [],
                    registeredForContest: userData.registeredForContest || null,
                    isActive: true,
                    isFirstLogin: userData.isFirstLogin !== undefined ? userData.isFirstLogin : true,
                    profileCompleted: userData.profileCompleted || false,
                    isPublicProfile: userData.isPublicProfile !== undefined ? userData.isPublicProfile : true,
                    profile: userData.profile || {},
                    education: userData.education || {},
                    skills: userData.skills || [],
                    alphaCoins: 0,
                    tokenVersion: 0,
                    studentType: userData.studentType || 'ONLINE',
                    lastLogin: null
                }
            });
            return this._populateBatches(user);
        } catch (error) {
            console.error('Create user error:', error);
            throw error;
        }
    }

    // Get total users count
    static async getTotalUsersCount() {
        try {
            return await prisma.user.count();
        } catch (error) {
            console.error('Get total users count error:', error);
            return 0;
        }
    }

    // Find user by email
    static async findByEmail(email) {
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            include: {
                batch: true,
                userBatches: {
                    include: {
                        batch: true
                    }
                }
            }
        });
        if (!user) return null;

        // Fallback for online students
        if (!user.batchId && user.userBatches && user.userBatches.length > 0) {
            user.batchId = user.userBatches[0].batchId;
            user.batchName = user.userBatches[0].batch?.name;
        } else if (user.batch) {
            user.batchName = user.batch.name;
        }

        return this._populateBatches(user);
    }

    // Find user by Google ID
    static async findByGoogleId(googleId) {
        return await prisma.user.findUnique({
            where: { googleId }
        });
    }

    // Find user by username (case-insensitive)
    static async findByUsername(username) {
        return await prisma.user.findFirst({
            where: { username: { equals: username.toLowerCase(), mode: 'insensitive' } }
        });
    }

    // Find user strictly by explicit username field (for availability checks)
    static async findByUsernameExact(username) {
        return await prisma.user.findFirst({
            where: { username: username.toLowerCase() }
        });
    }

    // Find user by ID
    static async findById(userId) {
        if (!userId) return null;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                batch: true,
                externalProfiles: true,
                planInstance: true,
                userBatches: {
                    include: {
                        batch: true
                    }
                }
            }
        });
        if (!user) return null;

        // Populate batch info for online students
        user.studentType = user.studentType || 'ONLINE';
        
        if (!user.batchId && user.userBatches && user.userBatches.length > 0) {
            user.batchId = user.userBatches[0].batchId;
            user.batch = user.userBatches[0].batch;
            user.batchName = user.batch?.name;
            user.isOnline = user.batch?.type === 'ONLINE';
        } else if (user.batch) {
            user.batchName = user.batch.name;
            user.isOnline = user.batch.type === 'ONLINE';
        } else {
            user.isOnline = false;
        }

        return this._populateBatches(user);
    }

    // Find users by batch ID
    static async findByBatchId(batchId) {
        return await prisma.user.findMany({
            where: { batchId },
            take: 10000
        });
    }

    // Find all users by role
    static async findByRole(role) {
        return await prisma.user.findMany({
            where: { role },
            take: 10000
        });
    }

    // Find all users (with pagination)
    static async findAll(page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        return await prisma.user.findMany({
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' }
        });
    }

    // Compare password
    static async comparePassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }

    // Update session
    static async updateSession(userId, sessionToken, deviceFingerprint) {
        return await prisma.user.update({
            where: { id: userId },
            data: {
                activeSessionToken: sessionToken,
                deviceFingerprint: deviceFingerprint,
                lastLogin: new Date()
            }
        });
    }

    // Increment token version
    static async incrementTokenVersion(userId) {
        return await prisma.user.update({
            where: { id: userId },
            data: {
                tokenVersion: { increment: 1 },
                lastLogin: new Date()
            }
        });
    }

    // Verify active session
    static async verifyActiveSession(userId, sessionToken) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { activeSessionToken: true }
        });
        return user?.activeSessionToken === sessionToken;
    }

    // Clear session (logout)
    static async clearSession(userId) {
        return await prisma.user.update({
            where: { id: userId },
            data: {
                activeSessionToken: null,
                deviceFingerprint: null
            }
        });
    }

    // Invalidate session (alias)
    static async invalidateSession(userId) {
        return await User.clearSession(userId);
    }

    // Update password
    static async updatePassword(userId, hashedPassword) {
        return await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });
    }

    // Update user (general update)
    static async update(userId, updateData) {
        const { id, _id, ...validData } = updateData;
        const user = await prisma.user.update({
            where: { id: userId },
            data: validData
        });
        return this._populateBatches(user);
    }

    // Atomically add coins to user
    static async addCoins(userId, amount) {
        if (!amount || amount <= 0) return;
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                alphaCoins: { increment: amount },
                lastCoinUpdate: new Date()
            },
            select: { id: true, alphaCoins: true }
        });

        // Sync with Leaderboard immediately
        try {
            const Leaderboard = require('./Leaderboard');
            await Leaderboard.updateAlphaCoins(userId, updatedUser.alphaCoins);
        } catch (e) {
            console.warn('[User] Failed to sync leaderboard after adding coins:', e.message);
        }

        return updatedUser;
    }

    // Get user's current coin balance
    static async getCoins(userId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { alphaCoins: true }
        });
        return user?.alphaCoins || 0;
    }

    // Internal helper to handle JSON merging for profile and education
    static async _mergeJsonFields(userId, updateData) {
        const needsMerge = Object.keys(updateData).some(key => 
            key.startsWith('profile.') || key.startsWith('education.') || 
            key === 'profile' || key === 'education'
        );

        if (!needsMerge) return updateData;

        // Fetch current user to get existing JSON blobs for merging
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { profile: true, education: true }
        });

        if (!user) throw new Error('User not found');

        const finalUpdate = { ...updateData };
        const profile = typeof user.profile === 'object' && user.profile !== null ? { ...user.profile } : {};
        const education = typeof user.education === 'object' && user.education !== null ? { ...user.education } : {};

        Object.keys(updateData).forEach(key => {
            if (key.startsWith('profile.')) {
                const parts = key.split('.');
                if (parts.length === 2) {
                    profile[parts[1]] = updateData[key];
                    delete finalUpdate[key];
                } else if (parts.length === 3) {
                    if (!profile[parts[1]]) profile[parts[1]] = {};
                    profile[parts[1]][parts[2]] = updateData[key];
                    delete finalUpdate[key];
                }
            } else if (key === 'profile' && typeof updateData[key] === 'object') {
                Object.assign(profile, updateData[key]);
                delete finalUpdate[key];
            } else if (key.startsWith('education.')) {
                const parts = key.split('.');
                education[parts[1]] = updateData[key];
                delete finalUpdate[key];
            } else if (key === 'education' && typeof updateData[key] === 'object') {
                Object.assign(education, updateData[key]);
                delete finalUpdate[key];
            }
        });

        if (Object.keys(profile).length > 0) finalUpdate.profile = profile;
        if (Object.keys(education).length > 0) finalUpdate.education = education;

        return finalUpdate;
    }

    // Update user (general update wrapped with JSON merge)
    static async updateProfile(userId, updateData) {
        const { id, _id, ...validData } = updateData;
        const mergedData = await this._mergeJsonFields(userId, validData);
        const user = await prisma.user.update({
            where: { id: userId },
            data: mergedData
        });
        return this._populateBatches(user);
    }

    // Update email
    static async updateEmail(userId, newEmail) {
        return await prisma.user.update({
            where: { id: userId },
            data: { email: newEmail.toLowerCase() }
        });
    }

    // Add batch to instructor
    static async addBatchToInstructor(userId, batchId) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return null;
        
        const assignedBatchIds = [...(user.assignedBatchIds || [])];
        if (!assignedBatchIds.includes(batchId)) {
            assignedBatchIds.push(batchId);
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                batchId: user.batchId || batchId,
                assignedBatchIds
            }
        });
        return this._populateBatches(updatedUser);
    }

    // Remove batch from instructor
    static async removeBatchFromInstructor(userId, batchId) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return { success: false, message: 'User not found' };

        const assignedBatchIds = (user.assignedBatchIds || []).filter(id => id !== batchId);

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                assignedBatchIds,
                batchId: user.batchId === batchId
                    ? (assignedBatchIds.length > 0 ? assignedBatchIds[assignedBatchIds.length - 1] : null)
                    : user.batchId
            }
        });
        return { success: true };
    }

    // Mark first login as completed
    static async markFirstLoginComplete(userId) {
        return await prisma.user.update({
            where: { id: userId },
            data: {
                isFirstLogin: false,
                profileCompleted: true
            }
        });
    }

    // Get users by batch (all roles)
    static async getUsersByBatch(batchId) {
        return await prisma.user.findMany({
            where: { batchId },
            take: 10000
        });
    }

    // Get instructors by batch
    static async getInstructorsByBatch(batchId) {
        return await prisma.user.findMany({
            where: {
                role: 'instructor',
                OR: [
                    { batchId: batchId },
                    {
                        assignedBatchIds: {
                            array_contains: batchId
                        }
                    }
                ]
            },
            take: 10000
        });
    }

    // Get all students in a batch
    static async getStudentsByBatch(batchId) {
        // Find users who have this batchId as their primary batch
        const primaryStudents = await prisma.user.findMany({
            where: {
                batchId: batchId,
                role: 'student'
            },
            take: 10000
        });

        // Find users linked via UserBatch relation
        const relatedUsers = await prisma.userBatch.findMany({
            where: {
                batchId: batchId,
                user: { role: 'student' }
            },
            include: { user: true },
            take: 10000
        });
        const relationStudents = relatedUsers.map(rb => rb.user);

        // Combine and dedup
        const studentMap = new Map();
        primaryStudents.forEach(u => studentMap.set(u.id, u));
        relationStudents.forEach(u => studentMap.set(u.id, u));

        return Array.from(studentMap.values());
    }

    // Get all students in multiple batches
    static async getStudentsByBatches(batchIds) {
        if (!batchIds || batchIds.length === 0) return [];
        
        // Primary
        const primaryStudents = await prisma.user.findMany({
            where: {
                batchId: { in: batchIds },
                role: 'student'
            },
            take: 10000
        });

        // Relation
        const relatedUsers = await prisma.userBatch.findMany({
            where: {
                batchId: { in: batchIds },
                user: { role: 'student' }
            },
            include: { user: true },
            take: 10000
        });
        const relationStudents = relatedUsers.map(rb => rb.user);

        const studentMap = new Map();
        primaryStudents.forEach(u => studentMap.set(u.id, u));
        relationStudents.forEach(u => studentMap.set(u.id, u));

        return Array.from(studentMap.values());
    }

    // Count students in a batch
    static async countStudentsInBatch(batchId) {
        return await prisma.user.count({
            where: {
                batchId: batchId,
                role: 'student'
            }
        });
    }

    // Count users by role
    static async countByRole(role) {
        return await prisma.user.count({
            where: { role }
        });
    }

    // Bulk create users
    static async bulkCreate(usersData) {
        const HASH_BATCH_SIZE = 10;
        const users = [];

        for (let i = 0; i < usersData.length; i += HASH_BATCH_SIZE) {
            const batch = usersData.slice(i, i + HASH_BATCH_SIZE);
            const hashedBatch = await Promise.all(
                batch.map(async (userData) => {
                    const hashedPassword = await bcrypt.hash(userData.password, 10);
                    return {
                        email: userData.email.toLowerCase(),
                        password: hashedPassword,
                        firstName: userData.firstName || null,
                        lastName: userData.lastName || null,
                        role: userData.role,
                        batchId: userData.batchId || null,
                        assignedBatchIds: (userData.batchId && userData.role === 'instructor') ? [userData.batchId] : [],
                        isActive: true,
                        isFirstLogin: true,
                        profileCompleted: false,
                        profile: userData.profile || {},
                        education: userData.education || {},
                        skills: userData.skills || [],
                        alphaCoins: 0,
                        tokenVersion: 0,
                        studentType: userData.studentType || 'ONLINE'
                    };
                })
            );
            users.push(...hashedBatch);
        }

        return await prisma.user.createMany({
            data: users,
            skipDuplicates: true
        });
    }

    // Complete user deletion
    static async deleteUserCompletely(userId) {
        // Transaction order:  [0]submissions  [1]progress  [2]contestSubs  [3]courseContestSubs  [4]courseContestLeaderboard  [5]externalProfiles  [6]leaderboard  [7]user
        const results = await prisma.$transaction([
            prisma.submission.deleteMany({ where: { studentId: userId } }),                    // [0]
            prisma.progress.deleteMany({ where: { studentId: userId } }),                      // [1]
            prisma.contestSubmission.deleteMany({ where: { studentId: userId } }),             // [2]
            prisma.courseContestSubmission.deleteMany({ where: { studentId: userId } }),       // [3]
            prisma.courseContestLeaderboard.deleteMany({ where: { studentId: userId } }),      // [4]
            prisma.externalProfile.deleteMany({ where: { studentId: userId } }),               // [5]
            prisma.leaderboard.deleteMany({ where: { studentId: userId } }),                   // [6]
            prisma.user.delete({ where: { id: userId } })                                      // [7]
        ]);

        return {
            success: true,
            message: 'User and all associated data deleted permanently',
            deletedRecords: {
                submissions:              results[0].count,
                progress:                 results[1].count,
                contestSubmissions:       results[2].count,
                courseContestSubmissions: results[3].count,  // was incorrectly mapped to externalProfiles
                courseContestLeaderboard: results[4].count,  // was incorrectly mapped to leaderboard
                externalProfiles:         results[5].count,
                leaderboard:              results[6].count,
            },
        };
    }

    // Delete user (alias)
    static async delete(userId) {
        return await User.deleteUserCompletely(userId);
    }

    // Delete multiple users by batch
    static async deleteByBatchId(batchId) {
        const users = await prisma.user.findMany({
            where: { batchId },
            select: { id: true }
        });
        const userIds = users.map(u => u.id);

        if (userIds.length === 0) return { success: true, deletedCount: 0 };

        await prisma.$transaction([
            prisma.submission.deleteMany({ where: { studentId: { in: userIds } } }),
            prisma.progress.deleteMany({ where: { studentId: { in: userIds } } }),
            prisma.contestSubmission.deleteMany({ where: { studentId: { in: userIds } } }),
            prisma.courseContestSubmission.deleteMany({ where: { studentId: { in: userIds } } }),
            prisma.courseContestLeaderboard.deleteMany({ where: { studentId: { in: userIds } } }),
            prisma.externalProfile.deleteMany({ where: { studentId: { in: userIds } } }),
            prisma.leaderboard.deleteMany({ where: { studentId: { in: userIds } } }),
            prisma.user.deleteMany({ where: { batchId } })
        ]);

        return { success: true, deletedCount: userIds.length };
    }

    // Reset student profile
    static async resetStudentProfile(studentId) {
        const student = await User.findById(studentId);
        if (!student) throw new Error('User not found');

        // 5. Transactional Cleanup: Submissions, Progress, and all Leaderboard types
        const [deletedSubmissions, deletedProgress, deletedCourseLB, deletedBatchLB, deletedContestLB, updatedUser] = await prisma.$transaction([
            prisma.submission.deleteMany({ where: { studentId } }),
            prisma.progress.deleteMany({ where: { studentId } }),
            prisma.courseLeaderboard.deleteMany({ where: { studentId } }),
            prisma.leaderboard.deleteMany({ where: { studentId } }),
            prisma.courseContestLeaderboard.deleteMany({ where: { studentId } }),
            prisma.user.update({
                where: { id: studentId },
                data: { alphaCoins: 0, lastCoinUpdate: null }
            })
        ]);

        // 6. Universal Refresh: Sync Redis and trigger recalculation
        try {
            const { getRedis } = require('../config/redis');
            const redis = getRedis();
            await redis.zrem('leaderboard:global', studentId);
            
            // Explicitly trigger a fresh recalculation to ensure consistency
            const Leaderboard = require('./Leaderboard');
            await Leaderboard.recalculateScores(studentId);
            
            console.log(`[UniversalReset] Fully cleared and recalculated scores for student: ${studentId}`);
        } catch (err) {
            console.warn('[UniversalReset] Refresh operations failed:', err.message);
        }

        return {
            success: true,
            deletedSubmissions: deletedSubmissions.count,
            deletedProgress: deletedProgress.count,
            cleared: {
                practiceSubmissions: deletedSubmissions.count,
                practiceProgress: deletedProgress.count,
                alphaCoins: true,
                practiceStats: true
            },
            preserved: {
                contestSubmissions: true,
                contestRecords: true,
                externalProfiles: true,
                personalInfo: true,
                education: true,
                skills: true,
                batchAssignment: true,
                accountCredentials: true
            }
        };
    }

    // Delete all users registered for a specific contest (spot users)
    static async deleteByContest(contestId) {
        const users = await prisma.user.findMany({
            where: { registeredForContest: contestId },
            select: { id: true }
        });
        const userIds = users.map(u => u.id);

        if (userIds.length === 0) return { success: true, deletedCount: 0 };

        console.log(`[deleteByContest] Cleaning up ${userIds.length} spot user(s) for contest ${contestId}`);

        await prisma.$transaction([
            prisma.contestSubmission.deleteMany({ where: { studentId: { in: userIds } } }),
            prisma.courseContestSubmission.deleteMany({ where: { studentId: { in: userIds } } }),
            prisma.courseContestLeaderboard.deleteMany({ where: { studentId: { in: userIds } } }),
            prisma.externalProfile.deleteMany({ where: { studentId: { in: userIds } } }),
            prisma.leaderboard.deleteMany({ where: { studentId: { in: userIds } } }),
            prisma.user.deleteMany({ where: { registeredForContest: contestId } })
        ]);

        return { success: true, deletedCount: userIds.length };
    }
}

module.exports = User;
