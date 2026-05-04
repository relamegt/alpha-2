const prisma = require('../config/db');

async function main() {
  console.log('Starting data migration...');

  // 1. Get all legacy problems
  // Note: We use raw query or assume the model 'Problem' still reflects the old structure if we haven't migrated yet.
  // But if we have migrated, the 'Problem' model only has a subset of fields.
  // So we should do this BEFORE running npx prisma migrate dev, OR use raw SQL.
  
  try {
    const allProblems = await prisma.$queryRaw`SELECT * FROM "problems"`;
    console.log(`Found ${allProblems.length} items in the problems table.`);

    for (const p of allProblems) {
      const type = p.type || 'problem';
      
      if (type === 'sql') {
        console.log(`Migrating SQL Problem: ${p.title}`);
        await prisma.sqlProblem.create({
          data: {
            id: p.id,
            slug: p.slug,
            title: p.title,
            description: p.description,
            difficulty: p.difficulty,
            points: p.points,
            inputFormat: p.inputFormat,
            outputFormat: p.outputFormat,
            examples: p.examples || [],
            testCases: p.testCases,
            solutionCode: p.solutionCode,
            editorial: p.editorial,
            editorialLink: p.editorialLink,
            videoUrl: p.videoUrl,
            createdBy: p.createdBy,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt
          }
        });
      } else if (type === 'video') {
        console.log(`Migrating Video: ${p.title}`);
        await prisma.video.create({
          data: {
            id: p.id,
            slug: p.slug,
            title: p.title,
            section: p.category,
            difficulty: p.difficulty,
            points: p.points,
            description: p.description,
            videoUrl: p.videoUrl,
            article: p.editorial || {},
            articleLink: p.editorialLink,
            createdBy: p.createdBy,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt
          }
        });
      } else if (type === 'quiz') {
        console.log(`Migrating Quiz: ${p.title}`);
        await prisma.quiz.create({
          data: {
            id: p.id,
            slug: p.slug,
            title: p.title,
            section: p.category,
            difficulty: p.difficulty,
            points: p.points,
            description: p.description,
            quizQuestions: p.quizQuestions || [],
            article: p.editorial || {},
            articleLink: p.editorialLink,
            createdBy: p.createdBy,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt
          }
        });
      } else if (type === 'material') {
        console.log(`Migrating Article: ${p.title}`);
        await prisma.article.create({
          data: {
            id: p.id,
            slug: p.slug,
            title: p.title,
            section: p.category,
            difficulty: p.difficulty,
            points: p.points,
            description: p.description,
            article: p.editorial || {},
            articleLink: p.editorialLink,
            createdBy: p.createdBy,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt
          }
        });
      } else {
        // It's a standard coding problem, it stays in 'problems' table.
        // But we might need to delete non-coding fields if we want to clean it up later.
        console.log(`Item ${p.title} is a coding problem, staying in Problem table.`);
      }
    }

    console.log('Migrating Submissions...');
    // Submissions only joined to 'problemId' before. Now they need to join to 'sqlProblemId' if applicable.
    const submissions = await prisma.submission.findMany({
        where: { problemId: { not: null } }
    });

    for (const sub of submissions) {
        // Check if the problemId now belongs to a SqlProblem
        const sqlProb = await prisma.sqlProblem.findUnique({ where: { id: sub.problemId } });
        if (sqlProb) {
            await prisma.submission.update({
                where: { id: sub.id },
                data: {
                    sqlProblemId: sub.problemId,
                    problemId: null
                }
            });
        }
    }

    console.log('Migrating Progress...');
    const progressRecords = await prisma.progress.findMany({
        where: { problemId: { not: null } }
    });

    for (const prog of progressRecords) {
        const id = prog.problemId;
        const sqlProb = await prisma.sqlProblem.findUnique({ where: { id } });
        if (sqlProb) {
            await prisma.progress.update({ where: { id: prog.id }, data: { sqlProblemId: id, problemId: null } });
            continue;
        }
        const video = await prisma.video.findUnique({ where: { id } });
        if (video) {
            await prisma.progress.update({ where: { id: prog.id }, data: { videoId: id, problemId: null } });
            continue;
        }
        const quiz = await prisma.quiz.findUnique({ where: { id } });
        if (quiz) {
            await prisma.progress.update({ where: { id: prog.id }, data: { quizId: id, problemId: null } });
            continue;
        }
        const article = await prisma.article.findUnique({ where: { id } });
        if (article) {
            await prisma.progress.update({ where: { id: prog.id }, data: { articleId: id, problemId: null } });
            continue;
        }
    }

    // Finally, delete non-coding problems from the Problem table
    console.log('Cleaning up Problem table...');
    await prisma.$executeRaw`DELETE FROM "problems" WHERE "type" IN ('sql', 'video', 'quiz', 'material')`;

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
