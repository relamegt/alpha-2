const prisma = require('../config/db');

async function inspectQuiz() {
    const quiz = await prisma.quiz.findFirst({
        where: { quizQuestions: { not: null } }
    });
    
    if (!quiz) {
        console.log('No quizzes found with questions.');
        return;
    }
    
    console.log('Quiz Questions structure:');
    console.log(JSON.stringify(quiz.quizQuestions, null, 2));
}

inspectQuiz()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
