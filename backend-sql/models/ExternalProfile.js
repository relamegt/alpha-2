const prisma = require('../config/db');

const SOCIAL_PLATFORMS = ['github', 'linkedin'];

class ExternalProfile {
    static isSocialPlatform(platform) {
        return SOCIAL_PLATFORMS.includes(platform?.toLowerCase());
    }

    // Create new external profile link
    static async create(profileData) {
        const isSocial = ExternalProfile.isSocialPlatform(profileData.platform);
        return await prisma.externalProfile.create({
            data: {
                studentId: profileData.studentId,
                platform: profileData.platform.toLowerCase(),
                username: profileData.username,
                type: isSocial ? 'social' : 'coding',
                stats: isSocial ? {} : {
                    problemsSolved: 0,
                    rating: 0,
                    totalContests: 0,
                    rank: 0
                },
                allContests: isSocial ? [] : [],
                lastSynced: new Date(),
                nextSyncAllowed: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
        });
    }

    // Find profile by ID
    static async findById(profileId) {
        return await prisma.externalProfile.findUnique({
            where: { id: profileId }
        });
    }

    // Find profiles by student
    static async findByStudent(studentId) {
        return await prisma.externalProfile.findMany({
            where: { studentId }
        });
    }

    // Find profile by student and platform
    static async findByStudentAndPlatform(studentId, platform) {
        return await prisma.externalProfile.findFirst({
            where: {
                studentId,
                platform: platform.toLowerCase()
            }
        });
    }

    // Update profile stats and ALL contest data
    static async updateStats(profileId, stats, allContests) {
        return await prisma.externalProfile.update({
            where: { id: profileId },
            data: {
                stats: stats,
                allContests: allContests,
                lastSynced: new Date()
            }
        });
    }

    // Update next sync allowed date
    static async updateNextSyncAllowed(profileId, nextSyncDate) {
        return await prisma.externalProfile.update({
            where: { id: profileId },
            data: { nextSyncAllowed: nextSyncDate }
        });
    }

    // Check if manual sync is allowed
    static async canManualSync(studentId) {
        if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
            return { allowed: true };
        }

        const profiles = await this.findByStudent(studentId);
        const now = new Date();

        for (const profile of profiles) {
            if (profile.nextSyncAllowed && new Date(profile.nextSyncAllowed) > now) {
                return {
                    allowed: false,
                    nextAllowedDate: profile.nextSyncAllowed
                };
            }
        }

        return { allowed: true };
    }

    // Get profiles needing auto-sync
    static async findProfilesNeedingSync() {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        return await prisma.externalProfile.findMany({
            where: {
                lastSynced: { lt: twentyFourHoursAgo },
                platform: { notIn: SOCIAL_PLATFORMS }
            }
        });
    }

    // Delete profile
    static async delete(profileId) {
        return await prisma.externalProfile.delete({
            where: { id: profileId }
        });
    }

    // Get student external stats
    static async getStudentExternalStats(studentId) {
        const profiles = await this.findByStudent(studentId);

        const stats = {};
        profiles.forEach(profile => {
            if (this.isSocialPlatform(profile.platform)) {
                stats[profile.platform] = {
                    username: profile.username,
                    type: 'social'
                };
            } else {
                stats[profile.platform] = {
                    username: profile.username,
                    problemsSolved: profile.stats?.problemsSolved || 0,
                    rating: profile.stats?.rating || 0,
                    totalContests: profile.stats?.totalContests || 0,
                    rank: profile.stats?.rank || 0,
                    allContests: profile.allContests || [],
                    lastSynced: profile.lastSynced
                };
            }
        });

        return stats;
    }

    // Generic update
    static async update(profileId, updateData) {
        return await prisma.externalProfile.update({
            where: { id: profileId },
            data: updateData
        });
    }

    // Get batch-wide external stats
    static async getBatchExternalStats(batchId) {
        const students = await prisma.user.findMany({
            where: { batchId, role: 'student' },
            select: { id: true }
        });
        const studentIds = students.map(s => s.id);

        return await prisma.externalProfile.findMany({
            where: {
                studentId: { in: studentIds }
            },
            take: 15000
        });
    }

    // --- Added Missing Methods for Parity ---

    static async deleteByStudent(studentId) {
        return await prisma.externalProfile.deleteMany({ where: { studentId } });
    }

    static async getAllContests(studentId, platform) {
        const profile = await this.findByStudentAndPlatform(studentId, platform);
        return profile ? profile.allContests || [] : [];
    }

    static async getLatestContest(studentId, platform) {
        const contests = await this.getAllContests(studentId, platform);
        return contests.length > 0 ? contests[0] : null;
    }

    static async updateUsername(profileId, username) {
        return await prisma.externalProfile.update({
            where: { id: profileId },
            data: { username }
        });
    }
}

module.exports = ExternalProfile;
