const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding assignments (Simple)...');
  await prisma.assignment.create({
    data: {
      title: 'Test Assignment',
      description: 'Simple test',
      type: 'HTML_CSS_JS',
      templateFiles: {},
      testCases: []
    }
  });
  console.log('✅ Done');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
}).finally(() => prisma.$disconnect());
