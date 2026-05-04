const InterviewExperience = require('../models/InterviewExperience');

const interviewExperienceController = {
  createExperience: async (req, res, next) => {
    try {
      const data = {
        ...req.body,
        authorId: req.user.userId
      };
      const experience = await InterviewExperience.create(data);
      res.status(201).json(experience);
    } catch (error) {
      next(error);
    }
  },

  getAllExperiences: async (req, res, next) => {
    try {
      const userId = req.user ? req.user.userId : null;
      const result = await InterviewExperience.findAll(req.query, userId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  getPopularCompanies: async (req, res, next) => {
    try {
      const companies = await InterviewExperience.getPopularCompanies();
      res.json(companies);
    } catch (error) {
      next(error);
    }
  },

  getExperienceById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user ? req.user.userId : null;
      const experience = await InterviewExperience.findById(id, userId);
      if (!experience) {
        return res.status(404).json({ message: 'Experience not found' });
      }
      res.json(experience);
    } catch (error) {
      next(error);
    }
  },

  updateExperience: async (req, res, next) => {
    try {
      const { id } = req.params;
      const experience = await InterviewExperience.findById(id);
      
      if (!experience) {
        return res.status(404).json({ message: 'Experience not found' });
      }

      // Check authorization
      if (experience.authorId !== req.user.userId && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized' });
      }

      const updated = await InterviewExperience.update(id, req.body);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  },

  deleteExperience: async (req, res, next) => {
    try {
      const { id } = req.params;
      const experience = await InterviewExperience.findById(id);

      if (!experience) {
        return res.status(404).json({ message: 'Experience not found' });
      }

      if (experience.authorId !== req.user.userId && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized' });
      }

      await InterviewExperience.delete(id);
      res.json({ message: 'Experience deleted successfully' });
    } catch (error) {
      next(error);
    }
  },

  upvoteExperience: async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const experience = await InterviewExperience.toggleUpvote(id, userId);
      res.json(experience);
    } catch (error) {
      next(error);
    }
  }
};

module.exports = interviewExperienceController;
