
const prisma = require('../config/db');

async function main() {
  const contests = await prisma.courseContest.findMany({
    include: {
      problems: true
    }
  });
  console.log(JSON.stringify(contests, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
