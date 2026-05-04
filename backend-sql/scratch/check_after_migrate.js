const prisma = require('../config/db');

async function check() {
  try {
    const problems = await prisma.problem.findMany();
    console.log('Problem count:', problems.length);
    console.log('Sample problems:', problems.map(p => ({ title: p.title, type: p.type })));
    
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('Tables:', tables.map(t => t.table_name));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
