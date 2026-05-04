const Sheet = require('../models/Sheet');
const SheetProgress = require('../models/SheetProgress');
const SheetProblem = require('../models/SheetProblem');
const prisma = require('../config/db');

const sheetController = {
  // Get all sheets
  getAllSheets: async (req, res, next) => {
    try {
      const sheets = await Sheet.findAll();
      res.json(sheets);
    } catch (error) {
      next(error);
    }
  },

  // Get sheet by ID
  getSheetById: async (req, res, next) => {
    try {
      const { sheetId } = req.params;
      const sheet = await Sheet.findById(sheetId);

      if (!sheet) {
        return res.status(404).json({ message: 'Sheet not found' });
      }

      res.json(sheet);
    } catch (error) {
      next(error);
    }
  },

  // Create sheet
  createSheet: async (req, res, next) => {
    try {
      const { name, description } = req.body;
      const sheet = await Sheet.create({
        name,
        description,
        createdBy: req.user.userId
      });
      res.status(201).json(sheet);
    } catch (error) {
      next(error);
    }
  },

  // Update sheet
  updateSheet: async (req, res, next) => {
    try {
      const { sheetId } = req.params;
      const { name, description } = req.body;
      const sheet = await Sheet.update(sheetId, { name, description });
      res.json(sheet);
    } catch (error) {
      next(error);
    }
  },

  // Delete sheet
  deleteSheet: async (req, res, next) => {
    try {
      const { sheetId } = req.params;
      await Sheet.delete(sheetId);
      res.json({ message: 'Sheet deleted successfully' });
    } catch (error) {
      next(error);
    }
  },

  // Section Management
  addSection: async (req, res, next) => {
    try {
      const { sheetId } = req.params;
      const { name, description, order } = req.body;
      const section = await Sheet.addSection(sheetId, { name, description, order });
      res.status(201).json(section);
    } catch (error) {
      next(error);
    }
  },

  updateSection: async (req, res, next) => {
    try {
      const { sectionId } = req.params;
      const { name, description, order } = req.body;
      const section = await Sheet.updateSection(sectionId, { name, description, order });
      res.json(section);
    } catch (error) {
      next(error);
    }
  },

  deleteSection: async (req, res, next) => {
    try {
      const { sectionId } = req.params;
      await Sheet.deleteSection(sectionId);
      res.json({ message: 'Section deleted successfully' });
    } catch (error) {
      next(error);
    }
  },

  // Subsection Management
  addSubsection: async (req, res, next) => {
    try {
      const { sectionId } = req.params;
      const { name, description, order } = req.body;
      const subsection = await Sheet.addSubsection(sectionId, { name, description, order });
      res.status(201).json(subsection);
    } catch (error) {
      next(error);
    }
  },

  updateSubsection: async (req, res, next) => {
    try {
      const { subsectionId } = req.params;
      const { name, description, order } = req.body;
      const subsection = await Sheet.updateSubsection(subsectionId, { name, description, order });
      res.json(subsection);
    } catch (error) {
      next(error);
    }
  },

  deleteSubsection: async (req, res, next) => {
    try {
      const { subsectionId } = req.params;
      await Sheet.deleteSubsection(subsectionId);
      res.json({ message: 'Subsection deleted successfully' });
    } catch (error) {
      next(error);
    }
  },

  // SheetProblem Management within Subsection
  addProblemToSubsection: async (req, res, next) => {
    try {
      const { subsectionId } = req.params;
      const { problemId } = req.body; // problemId is the ID of a SheetProblem
      const result = await SheetProblem.addToSubsection(problemId, subsectionId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  removeProblemFromSubsection: async (req, res, next) => {
    try {
      const { problemId } = req.params; // problemId is the ID of a SheetProblem
      const result = await SheetProblem.removeFromSubsection(problemId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  getSheetProblemById: async (req, res, next) => {
    try {
      const { problemId } = req.params;
      const problem = await SheetProblem.findById(problemId);

      if (!problem) {
        return res.status(404).json({ message: 'Sheet problem not found' });
      }

      res.json(problem);
    } catch (error) {
      next(error);
    }
  },

  updateSheetProblem: async (req, res, next) => {
    try {
      const { problemId } = req.params;
      const result = await SheetProblem.update(problemId, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
  deleteSheetProblem: async (req, res, next) => {
    try {
      const { problemId } = req.params;
      await SheetProblem.delete(problemId);
      res.json({ message: 'Problem deleted globally' });
    } catch (error) {
      next(error);
    }
  },

  searchProblems: async (req, res, next) => {
    try {
      const { q, limit } = req.query;
      const problems = await SheetProblem.search(q, limit);
      res.json({ problems });
    } catch (error) {
      next(error);
    }
  },
  
  getBatchProblems: async (req, res, next) => {
    try {
      const { ids } = req.body;
      const problems = await SheetProblem.getBatch(ids);
      res.json({ problems });
    } catch (error) {
      next(error);
    }
  },

  // Create a new SheetProblem directly in a subsection
  createProblemInSubsection: async (req, res, next) => {
    try {
      const { subsectionId } = req.params;
      const problemData = {
          ...req.body,
          subsectionId,
          createdBy: req.user.userId
      };
      const problem = await SheetProblem.create(problemData);
      res.status(201).json(problem);
    } catch (error) {
      next(error);
    }
  },

  // Progress Tracking
  toggleCompletion: async (req, res, next) => {
    try {
      let { sheetProblemId, sheetId, sectionId, subsectionId, completed } = req.body;
      
      // If IDs are missing, try to resolve them from the problem
      if (!sheetId || !sectionId || !subsectionId) {
        const problem = await prisma.sheetProblem.findUnique({
          where: { id: sheetProblemId },
          include: {
            subsection: {
              include: {
                section: true
              }
            }
          }
        });

        if (problem && problem.subsection) {
          subsectionId = problem.subsection.id;
          sectionId = problem.subsection.section.id;
          sheetId = problem.subsection.section.sheetId;
        }
      }

      if (!sheetId || !sectionId || !subsectionId) {
        return res.status(400).json({ message: 'Missing sheet structure information' });
      }

      const progress = await SheetProgress.toggleCompletion({
        userId: req.user.userId,
        sheetProblemId,
        sheetId,
        sectionId,
        subsectionId,
        completed
      });
      res.json(progress);
    } catch (error) {
      next(error);
    }
  },

  toggleRevision: async (req, res, next) => {
    try {
      let { sheetProblemId, sheetId, sectionId, subsectionId, markedForRevision } = req.body;

      // If IDs are missing, try to resolve them from the problem
      if (!sheetId || !sectionId || !subsectionId) {
        const problem = await prisma.sheetProblem.findUnique({
          where: { id: sheetProblemId },
          include: {
            subsection: {
              include: {
                section: true
              }
            }
          }
        });

        if (problem && problem.subsection) {
          subsectionId = problem.subsection.id;
          sectionId = problem.subsection.section.id;
          sheetId = problem.subsection.section.sheetId;
        }
      }

      const progress = await SheetProgress.toggleRevision({
        userId: req.user.userId,
        sheetProblemId,
        sheetId,
        sectionId,
        subsectionId,
        markedForRevision
      });
      res.json(progress);
    } catch (error) {
      next(error);
    }
  },

  getUserSheetProgress: async (req, res, next) => {
    try {
      const { sheetId } = req.params;
      const progress = await SheetProgress.findByUserAndSheet(req.user.userId, sheetId);
      res.json(progress);
    } catch (error) {
      next(error);
    }
  },

  getUserStats: async (req, res, next) => {
    try {
      const stats = await SheetProgress.getUserStats(req.user.userId);
      res.json(stats);
    } catch (error) {
      next(error);
    }
  }
};

module.exports = sheetController;
