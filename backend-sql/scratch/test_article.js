const prisma = require('../config/db');

async function test() {
  try {
    const articles = await prisma.article.findMany();
    console.log('Article count:', articles.length);
  } catch (e) {
    console.error('Error fetching articles:', e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
