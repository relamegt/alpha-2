const Job = require('../models/Job');

const jobController = {
  // Get all active jobs
  getAllJobs: async (req, res, next) => {
    try {
      const jobs = await Job.findAllActive();
      res.json(jobs);
    } catch (error) {
      next(error);
    }
  },

  // Get job by ID
  getJobById: async (req, res, next) => {
    try {
      const { jobId } = req.params;
      const job = await Job.findById(jobId);

      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }

      if (new Date(job.expiresAt) <= new Date()) {
         return res.status(410).json({ message: 'Job has expired' });
      }

      res.json(job);
    } catch (error) {
      next(error);
    }
  },

  // Search jobs
  searchJobs: async (req, res, next) => {
    try {
      const { term } = req.query;
      const jobs = await Job.search(term);
      res.json(jobs);
    } catch (error) {
      next(error);
    }
  },

  // Store/Batch insert jobs
  storeJobs: async (req, res, next) => {
    try {
      const { jobs } = req.body;
      if (!Array.isArray(jobs)) {
        return res.status(400).json({ message: 'Jobs must be an array' });
      }

      const result = await Job.bulkUpsert(jobs);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  },

  // Delete job
  deleteJob: async (req, res, next) => {
    try {
      const { jobId } = req.params;
      await Job.delete(jobId);
      res.json({ message: 'Job deleted successfully' });
    } catch (error) {
      next(error);
    }
  },

  // Create single job
  createJob: async (req, res, next) => {
    try {
      const job = await Job.create(req.body);
      res.status(201).json(job);
    } catch (error) {
      next(error);
    }
  },

  // Update job
  updateJob: async (req, res, next) => {
    try {
      const { jobId } = req.params;
      const job = await Job.update(jobId, req.body);
      res.json(job);
    } catch (error) {
      next(error);
    }
  },

  // Bulk delete jobs
  bulkDeleteJobs: async (req, res, next) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids)) {
        return res.status(400).json({ message: 'IDs must be an array' });
      }
      for (const id of ids) {
        await Job.delete(id);
      }
      res.json({ success: true, message: `${ids.length} jobs deleted successfully` });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = jobController;
