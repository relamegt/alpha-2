const prisma = require('../config/db');

async function checkData() {
  try {
    const jobCount = await prisma.job.count();
    const announcementCount = await prisma.announcement.count();
    console.log({ jobCount, announcementCount });
    const latestJobs = await prisma.job.findMany({ take: 3 });
    console.log('Latest Jobs:', JSON.stringify(latestJobs, null, 2));
    const latestAnn = await prisma.announcement.findMany({ take: 2 });
    console.log('Latest Announcements:', JSON.stringify(latestAnn, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

checkData();
