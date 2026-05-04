const prisma = require('../config/db');

class Job {
  // Find all active (not expired) jobs
  static async findAllActive() {
    return await prisma.job.findMany({
      where: {
        expiresAt: { gt: new Date() }
      },
      orderBy: { fetchedAt: 'desc' }
    });
  }

  // Find job by ID
  static async findById(id) {
    return await prisma.job.findUnique({
      where: { id }
    });
  }

  // Search jobs with terms
  static async search(term) {
    return await prisma.job.findMany({
      where: {
        expiresAt: { gt: new Date() },
        OR: [
          { title: { contains: term, mode: 'insensitive' } },
          { company: { contains: term, mode: 'insensitive' } },
          { location: { contains: term, mode: 'insensitive' } },
          { job_description: { contains: term, mode: 'insensitive' } }
        ]
      },
      orderBy: { fetchedAt: 'desc' }
    });
  }

  // Upsert multiple jobs (used by scraper or admin)
  static async bulkUpsert(jobsList) {
    let inserted = 0;
    let updated = 0;

    for (const jobData of jobsList) {
      const existingJob = await prisma.job.findFirst({
        where: {
          company: jobData.company,
          title: jobData.title
        }
      });

      const data = {
        title: jobData.title,
        company: jobData.company,
        about_company: jobData.about_company || "",
        job_description: jobData.job_description || "",
        job_title: jobData.job_title || jobData.title,
        job_type: jobData.job_type || "Full Time",
        location: jobData.location || "",
        experience: jobData.experience || "",
        role_and_responsibility: jobData.role_and_responsibility || "",
        education_and_skills: jobData.education_and_skills || "",
        apply_link: jobData.apply_link || "",
        salary: jobData.salary || "Not disclosed",
        posted_date: jobData.posted_date ? new Date(jobData.posted_date) : new Date(),
        fetchedAt: new Date(),
        expiresAt: jobData.expiresAt ? new Date(jobData.expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };

      if (existingJob) {
        await prisma.job.update({ where: { id: existingJob.id }, data });
        updated++;
      } else {
        await prisma.job.create({ data });
        inserted++;
      }
    }
    return { inserted, updated };
  }

  // Delete job
  static async delete(id) {
    return await prisma.job.delete({ where: { id } });
  }
}

module.exports = Job;
