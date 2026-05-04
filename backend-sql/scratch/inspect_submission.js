const prisma = require('../config/db');

async function inspectSubmission() {
    const submission = await prisma.submission.findFirst({
        where: { quizId: { not: null } },
        orderBy: { createdAt: 'desc' },
        include: { quiz: true }
    });
    
    if (!submission) {
        console.log('No quiz submissions found.');
        return;
    }
    
    console.log('--- Submission Meta ---');
    console.log(`ID: ${submission.id}`);
    console.log(`Verdict: ${submission.verdict}`);
    console.log(`TestCases: ${submission.testCasesPassed} / ${submission.totalTestCases}`);
    const questions = submission.quiz.quizQuestions || [];
    const answers = submission.metadata?.answers || {};
    
    questions.forEach((q, idx) => {
        const qId = q.id !== undefined ? String(q.id) : String(idx);
        const studentAns = answers[qId] !== undefined ? answers[qId] : answers[idx];
        const correctVal = q.correctOptionIndex !== undefined ? q.correctOptionIndex : (q.correctOption !== undefined ? q.correctOption : q.correctAnswer);
        
        console.log(`Q${idx}: studentAns=${studentAns} (type ${typeof studentAns}), correctVal=${correctVal} (type ${typeof correctVal}), match=${String(studentAns) === String(correctVal)}`);
    });
}

inspectSubmission()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
