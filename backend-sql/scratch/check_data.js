const prisma = require('../config/db');

async function check() {
  const count = await prisma.interviewExperience.count();
  console.log(`Total experiences: ${count}`);
  
  const all = await prisma.interviewExperience.findMany({
    include: { author: true }
  });
  console.log('Experiences:', JSON.stringify(all, null, 2));
}

check()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
