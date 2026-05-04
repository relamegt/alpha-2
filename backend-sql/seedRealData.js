const prisma = require('./config/db');

async function seedRealData() {
  console.log('🚀 Seeding real data for Jobs and Announcements...');

  // 1. Seed Real Jobs
  const jobs = [
    {
      title: 'Software Engineer II',
      company: 'Google',
      about_company: 'Google is a global leader in technology, focusing on search, cloud computing, and AI.',
      job_description: 'We are looking for a Software Engineer to join our Cloud Infrastructure team. You will build scalable systems using C++, Go, and Python.',
      location: 'Mountain View, CA / Remote',
      job_type: 'Full Time',
      experience: '2-5 Years',
      salary: '$140,000 - $190,000',
      apply_link: 'https://www.google.com/about/careers/applications/',
      posted_date: new Date('2026-05-01'),
      expiresAt: new Date('2026-06-01')
    },
    {
      title: 'Frontend Developer (React)',
      company: 'Meta',
      about_company: 'Meta builds technologies that help people connect, find communities, and grow businesses.',
      job_description: 'Join the Instagram UI team to build immersive experiences using React and Relay. Focus on performance and accessibility.',
      location: 'London, UK / Hybrid',
      job_type: 'Full Time',
      experience: '3+ Years',
      salary: '£80,000 - £120,000',
      apply_link: 'https://www.metacareers.com/',
      posted_date: new Date('2026-05-02'),
      expiresAt: new Date('2026-06-05')
    },
    {
      title: 'MERN Stack Developer',
      company: 'Tech Mahindra',
      about_company: 'A leading provider of digital transformation, consulting and business re-engineering services and solutions.',
      job_description: 'We need an experienced MERN developer to work on our fintech platform. Node.js and MongoDB expertise is a must.',
      location: 'Bangalore, India',
      job_type: 'Full Time',
      experience: '1-3 Years',
      salary: '12 - 18 LPA',
      apply_link: 'https://www.techmahindra.com/en-in/careers/',
      posted_date: new Date('2026-05-03'),
      expiresAt: new Date('2026-06-10')
    }
  ];

  for (const job of jobs) {
    await prisma.job.upsert({
      where: { id: `seed-${job.company}-${job.title}`.replace(/\s+/g, '-').toLowerCase() },
      update: job,
      create: {
        id: `seed-${job.company}-${job.title}`.replace(/\s+/g, '-').toLowerCase(),
        ...job
      }
    });
  }

  // 2. Seed Real Announcements
  const announcements = [
    {
      title: 'AI Interview Engine Upgrade',
      content: 'We have updated the AI Interviewer to Gemini 3.1 Flash for faster responses and better technical depth. Try it out in the Interview Lab!',
      type: 'success',
      priority: 'high',
      author: 'System Admin',
      createdBy: 'admin',
      readTime: '1 min read'
    },
    {
      title: 'New Coding Challenges Added',
      content: '15 new Hard-level problems have been added to the Practice Sheets. Tackle them to earn more AlphaCoins!',
      type: 'info',
      priority: 'medium',
      author: 'Content Team',
      createdBy: 'admin',
      readTime: '2 min read'
    },
    {
      title: 'Scheduled Maintenance',
      content: 'AlphaLearn will be undergoing maintenance on Sunday, May 10th, from 2:00 AM to 4:00 AM IST. All services will be temporarily unavailable.',
      type: 'warning',
      priority: 'medium',
      author: 'IT Ops',
      createdBy: 'admin',
      readTime: '3 min read'
    }
  ];

  for (const ann of announcements) {
    await prisma.announcement.create({
      data: ann
    });
  }

  console.log('✅ Seeding completed!');
}

seedRealData()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
