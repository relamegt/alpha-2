const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sheets = await prisma.sheet.findMany({
    where: { slug: null }
  });

  console.log(`Found ${sheets.length} sheets without slugs.`);

  for (const sheet of sheets) {
    const slug = sheet.name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    await prisma.sheet.update({
      where: { id: sheet.id },
      data: { slug }
    });
    console.log(`Updated sheet "${sheet.name}" with slug "${slug}".`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
