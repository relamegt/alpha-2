const prisma = require('../config/db');

async function cleanupPoints() {
    console.log('--- Point Cleanup Started ---');
    
    // 1. Zero out points for Videos and Articles in Submissions
    const subUpdate = await prisma.submission.updateMany({
        where: {
            OR: [
                { videoId: { not: null } },
                { articleId: { not: null } }
            ]
        },
        data: { points: 0 }
    });
    console.log(`[Submissions] Updated ${subUpdate.count} records to 0 points.`);

    // 2. Identify all students who had quiz or problem points
    // Actually, it is easier to just recalculate for EVERYONE.
    const students = await prisma.user.findMany({
        where: { role: 'student' },
        select: { id: true }
    });

    console.log(`[Recalculation] Syncing scores for ${students.length} students...`);

    const Leaderboard = require('../models/Leaderboard');
    
    for (const student of students) {
        try {
            // This will recalculate based on VALID sources and update User.alphaCoins and Leaderboard.overallScore
            await Leaderboard.recalculateScores(student.id);
        } catch (err) {
            console.error(`[Error] Failed to recalculate for ${student.id}:`, err.message);
        }
    }
    
    console.log('--- Point Cleanup Finished ---');
}

cleanupPoints()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
