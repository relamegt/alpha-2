const Problem = require('../models/Problem');
const Progress = require('../models/Progress');
const { parseProblemJSON } = require('../services/csvService');

// Create single problem (Coding only)
const createProblem = async (req, res) => {
    try {
        const problemData = {
            ...req.body,
            type: 'problem',
            createdBy: req.user.userId
        };

        const problem = await Problem.create(problemData);

        res.status(201).json({
            success: true,
            message: `Problem created successfully`,
            problem
        });
    } catch (error) {
        console.error('Create problem error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create problem',
            error: error.message
        });
    }
};

// Bulk create problems via JSON (Coding only)
const bulkCreateProblems = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'JSON file is required'
            });
        }

        const parseResult = parseProblemJSON(req.file.buffer);
        if (!parseResult.success) {
            return res.status(400).json(parseResult);
        }

        const results = [];
        for (const pData of parseResult.problems) {
            pData.type = 'problem';
            pData.createdBy = req.user.userId;
            const created = await Problem.create(pData);
            results.push(created);
        }

        res.status(201).json({
            success: true,
            message: `${results.length} problems created successfully`,
            count: results.length
        });
    } catch (error) {
        console.error('Bulk create problems error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create problems',
            error: error.message
        });
    }
};

// Get all problems (Coding only)
const getAllProblems = async (req, res) => {
    try {
        const coding = await Problem.findAll();

        let solvedIds = [];
        if (req.user && req.user.role === 'student') {
            const progressRecords = await Progress.findAllByStudent(req.user.userId);
            solvedIds = progressRecords
                .filter(p => p.status === 'completed' && p.problemId)
                .map(p => p.problemId);
        }

        res.json({
            success: true,
            count: coding.length,
            problems: coding.map(p => ({
                id: p.slug || p.id,
                _id: p.id,
                title: p.title,
                type: 'problem',
                section: p.section,
                difficulty: p.difficulty,
                points: p.points || 0,
                createdAt: p.createdAt,
                isSolved: solvedIds.includes(p.id)
            }))
        });
    } catch (error) {
        console.error('Get all problems error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch problems',
            error: error.message
        });
    }
};

// Get problem by ID
const getProblemById = async (req, res) => {
    try {
        const { problemId } = req.params;
        let problem = await Problem.findById(problemId);
        let type = 'problem';

        if (!problem) {
            // Try Assignment if not found in Problem
            const Assignment = require('../models/Assignment');
            const assignment = await Assignment.findById(problemId);
            if (assignment) {
                problem = assignment;
                type = 'assignment';
            }
        }
        
        if (!problem) {
            return res.status(404).json({
                success: false,
                message: 'Content not found'
            });
        }

        problem.type = type;

        if (req.user && req.user.role === 'student') {
            const hasViewed = await Progress.hasViewedEditorial(req.user.userId, problem.id, 'problem');
            const progressRecords = await Progress.findAllByStudent(req.user.userId);
            const record = progressRecords.find(p => p.problemId === problem.id);
            const isSolved = record?.status === 'completed';

            problem.isSolved = isSolved;
            res.locals.hasViewedEditorial = hasViewed;
        }

        if (req.user.role === 'student') {
            if (problem.testCases) {
                problem.testCases = problem.testCases.map(tc => ({
                    ...tc,
                    input: tc.isHidden ? 'Hidden' : tc.input,
                    output: tc.isHidden ? 'Hidden' : tc.output
                }));
            }
            delete problem.solutionCode;
        }

        res.json({
            success: true,
            problem,
            hasViewedEditorial: res.locals.hasViewedEditorial || false
        });
    } catch (error) {
        console.error('Get problem by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch problem',
            error: error.message
        });
    }
};

// Update problem
const updateProblem = async (req, res) => {
    try {
        const { problemId } = req.params;
        const problem = await Problem.findById(problemId);
        if (!problem) return res.status(404).json({ success: false, message: 'Not found' });

        await Problem.update(problem.id, req.body);
        const updated = await Problem.findById(problem.id);

        res.json({
            success: true,
            message: 'Updated successfully',
            problem: updated
        });
    } catch (error) {
        console.error('Update error:', error);
        res.status(500).json({ success: false, message: 'Failed to update' });
    }
};

// Delete problem
const deleteProblem = async (req, res) => {
    try {
        const { problemId } = req.params;
        const problem = await Problem.findById(problemId);
        if (!problem) return res.status(404).json({ success: false, message: 'Not found' });

        await Problem.delete(problem.id);

        res.json({
            success: true,
            message: 'Deleted successfully'
        });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete' });
    }
};

// Bulk delete
const bulkDeleteProblems = async (req, res) => {
    try {
        const { problemIds } = req.body;
        if (!problemIds || !Array.isArray(problemIds)) return res.status(400).json({ success: false, message: 'IDs required' });

        for (const id of problemIds) {
            await Problem.delete(id);
        }

        res.json({ success: true, message: 'Deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed' });
    }
};

const getDifficultyWiseCount = async (req, res) => {
    try {
        const counts = await Problem.getDifficultyWiseCount();
        res.json({ success: true, difficultyCounts: counts });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed' });
    }
};

const setSolutionCode = async (req, res) => {
    try {
        const { problemId } = req.params;
        const problem = await Problem.findById(problemId);
        if (!problem) return res.status(404).json({ success: false });

        await Problem.setSolutionCode(problem.id, req.body.language, req.body.code);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
};

const viewEditorial = async (req, res) => {
    try {
        const { problemId } = req.params;
        const problem = await Problem.findById(problemId);
        if (!problem) return res.status(404).json({ success: false });

        await Progress.markEditorialViewed(req.user.userId, problem.id, 'problem');

        res.json({ success: true, message: 'Viewed' });
    } catch (error) {
        res.status(500).json({ success: false });
    }
};

module.exports = {
    createProblem,
    bulkCreateProblems,
    getAllProblems,
    getProblemById,
    updateProblem,
    deleteProblem,
    bulkDeleteProblems,
    getDifficultyWiseCount,
    setSolutionCode,
    viewEditorial
};
