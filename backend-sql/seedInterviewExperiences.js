const prisma = require('./config/db');

async function main() {
  console.log('🌱 Seeding Interview Experiences...');

  // Find a student user to be the author
  const author = await prisma.user.findFirst({
    where: { role: 'student' }
  });

  if (!author) {
    console.error('❌ No student user found to assign as author. Please create a user first.');
    return;
  }

  const experiences = [
    {
      companyName: 'Google',
      jobPosition: 'Software Engineering Intern',
      experienceLevel: '0-1 years',
      difficulty: 'Hard',
      timeline: '3-4 Weeks',
      applyMethod: 'Referral',
      interviewMode: 'Remote',
      outcome: 'Selected',
      preparationTips: 'Focus deeply on Google-tagged problems, especially on Strings, Graphs, and Heap. Practiced mock interviews to get better at thinking + coding under 60-minute constraints.',
      additionalFeedback: 'Google interviews are fast-paced and time-bound, so it is crucial to practice with that environment in mind. Don\'t underestimate the importance of edge case discussions.',
      upvotes: 373,
      rounds: [
        {
          roundNumber: 1,
          roundName: 'Technical Round 1',
          roundType: 'Technical',
          difficulty: 'Easy',
          mode: 'Remote',
          duration: 60,
          summary: 'Start with Introduction followed by 2 coding questions and followed by a discussion on internal working of HashMap',
          questions: ['String manipulation related problem', 'Another string-based related problem']
        },
        {
          roundNumber: 2,
          roundName: 'Technical Round 2',
          roundType: 'Technical',
          difficulty: 'Medium',
          mode: 'Remote',
          duration: 60,
          summary: 'Focus on Graph algorithms and space-time complexity optimization.',
          questions: ['Number of Islands variation', 'Course Schedule (Topological Sort)']
        },
        {
          roundNumber: 3,
          roundName: 'Googliness & Leadership',
          roundType: 'HR',
          difficulty: 'Medium',
          mode: 'Remote',
          duration: 45,
          summary: 'Behavioral questions about teamwork, conflict resolution, and leadership.',
          questions: ['Tell me about a time you failed', 'How do you handle disagreement with a peer?']
        }
      ]
    },
    {
      companyName: 'Microsoft',
      jobPosition: 'Software Engineer (New Grad)',
      experienceLevel: '0-1 years',
      difficulty: 'Hard',
      timeline: '4-5 Weeks',
      applyMethod: 'LinkedIn',
      interviewMode: 'Hybrid',
      outcome: 'Selected',
      preparationTips: 'Microsoft loves CS fundamentals. Revise OS, DBMS, and Networking along with DSA. For coding, practice String and Tree problems.',
      additionalFeedback: 'The focus was on writing clean, production-ready code. They ask for edge cases and potential improvements for every solution.',
      upvotes: 512,
      rounds: [
        {
          roundNumber: 1,
          roundName: 'Online Assessment',
          roundType: 'Technical',
          difficulty: 'Medium',
          mode: 'Remote',
          duration: 90,
          summary: '3 coding problems of varying difficulty on Codility.',
          questions: ['Minimum deletions to make frequencies unique', 'Largest Alphabetic Character']
        },
        {
          roundNumber: 2,
          roundName: 'Technical Round 1',
          roundType: 'Technical',
          difficulty: 'Medium',
          mode: 'Remote',
          duration: 45,
          summary: 'Implementation focused round with deep dive into complexity.',
          questions: ['Implement a Stack with GetMin() in O(1)', 'Binary Tree Level Order Traversal']
        },
        {
          roundNumber: 3,
          roundName: 'Technical Round 2 (Design)',
          roundType: 'Technical',
          difficulty: 'Hard',
          mode: 'Remote',
          duration: 60,
          summary: 'High-level and Low-level design discussion.',
          questions: ['Design a Rate Limiter', 'How would you handle millions of requests in a distributed system?']
        }
      ]
    },
    {
      companyName: 'Oracle',
      jobPosition: 'Member Technical Staff',
      experienceLevel: '1-3 years',
      difficulty: 'Medium',
      timeline: '2 Weeks',
      applyMethod: 'Job Portal',
      interviewMode: 'Remote',
      outcome: 'Selected',
      preparationTips: 'Oracle asks a lot about DBMS and SQL. Be very strong with Joins and Indexing.',
      additionalFeedback: 'The process was very quick. Within 2 weeks everything was completed.',
      upvotes: 189,
      rounds: [
        {
          roundNumber: 1,
          roundName: 'Aptitude & Coding',
          roundType: 'Technical',
          difficulty: 'Medium',
          mode: 'Remote',
          duration: 120,
          summary: 'Objective questions on CS core + 2 coding problems.',
          questions: ['Write a query to find 2nd highest salary', 'Check if a linked list is a palindrome']
        },
        {
          roundNumber: 2,
          roundName: 'Technical Interview',
          roundType: 'Technical',
          difficulty: 'Medium',
          mode: 'Remote',
          duration: 60,
          summary: 'Pure technical discussion on Java and Databases.',
          questions: ['Explain JVM Architecture', 'What are ACID properties? Give real world examples.']
        }
      ]
    }
  ];

  for (const exp of experiences) {
    await prisma.interviewExperience.create({
      data: {
        ...exp,
        authorId: author.id
      }
    });
  }

  console.log('✅ Successfully seeded Interview Experiences!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
