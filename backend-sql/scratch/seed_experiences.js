const prisma = require('../config/db');

async function seed() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log('No user found to associate experiences with.');
    return;
  }

  const experiences = [
    {
      companyName: 'Google',
      jobPosition: 'Software Engineering Intern',
      experienceLevel: '0-1 years',
      difficulty: 'Medium',
      timeline: '4 Weeks',
      applyMethod: 'Referral',
      interviewMode: 'Remote',
      outcome: 'Selected',
      preparationTips: 'Google interviews are fast-paced and time-bound, so it is crucial to practice with that environment in mind. Don\'t underestimate the importance of edge case discussions, dry runs, and being able to explain your solution with confidence.',
      additionalFeedback: 'The recruiters were very helpful throughout the process.',
      isAnonymous: false,
      authorId: user.id,
      upvotes: 373,
      rounds: [
        {
          roundNumber: 1,
          roundName: 'Phone Screen',
          roundType: 'Technical',
          difficulty: 'Medium',
          duration: 45,
          summary: 'Discussed basic data structures and algorithms.'
        },
        {
          roundNumber: 2,
          roundName: 'Technical Round 1',
          roundType: 'Technical',
          difficulty: 'Hard',
          duration: 60,
          summary: 'Dynamic programming and graph problems.'
        }
      ]
    },
    {
      companyName: 'Amazon',
      jobPosition: 'SDE-1',
      experienceLevel: '1-3 years',
      difficulty: 'Hard',
      timeline: '3 Weeks',
      applyMethod: 'LinkedIn',
      interviewMode: 'On-site',
      outcome: 'Selected',
      preparationTips: 'Focus heavily on Leadership Principles. Every technical question is also an LP question.',
      isAnonymous: true,
      authorId: user.id,
      upvotes: 120,
      rounds: [
        {
          roundNumber: 1,
          roundName: 'Online Assessment',
          roundType: 'Technical',
          difficulty: 'Medium',
          duration: 90,
          summary: 'Two coding questions and a work simulation.'
        }
      ]
    },
    {
      companyName: 'Microsoft',
      jobPosition: 'Software Engineer',
      experienceLevel: '0-1 years',
      difficulty: 'Medium',
      timeline: '2 Weeks',
      applyMethod: 'Campus',
      interviewMode: 'Remote',
      outcome: 'Selected',
      preparationTips: 'Brush up on system design basics even for entry level.',
      isAnonymous: false,
      authorId: user.id,
      upvotes: 215,
      rounds: []
    }
  ];

  for (const exp of experiences) {
    await prisma.interviewExperience.create({ data: exp });
  }

  console.log('Seeded 3 interview experiences.');
}

seed()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
