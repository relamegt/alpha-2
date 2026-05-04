const SqlProblem = require('../models/SqlProblem');
const Progress = require('../models/Progress');

// Create SQL problem
const createProblem = async (req, res) => {
    try {
        const problemData = {
            ...req.body,
            createdBy: req.user.userId
        };
        const problem = await SqlProblem.create(problemData);
        res.status(201).json({ success: true, message: 'SQL Problem created successfully', problem });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to create SQL problem', error: error.message });
    }
};

// Bulk create SQL problems
const bulkCreateProblems = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'JSON file is required' });
        }

        let parseResult;
        try {
            parseResult = JSON.parse(req.file.buffer.toString('utf-8'));
        } catch (e) {
            return res.status(400).json({ success: false, message: 'Invalid JSON format in uploaded file' });
        }

        const problemsToCreate = Array.isArray(parseResult) ? parseResult : (parseResult.problems || []);

        if (!Array.isArray(problemsToCreate) || problemsToCreate.length === 0) {
            return res.status(400).json({ success: false, message: 'JSON should contain an array of SQL problems' });
        }

        const createdCount = await SqlProblem.bulkCreate(problemsToCreate, req.user.userId);

        res.status(201).json({
            success: true,
            message: `${createdCount.length} SQL problems created successfully`,
            count: createdCount.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to create SQL problems',
            error: error.message
        });
    }
};

// Get all SQL problems
const getAllProblems = async (req, res) => {
    try {
        const problems = await SqlProblem.findAll();
        let solvedIds = [];
        if (req.user && req.user.role === 'student') {
            const progress = await Progress.findAllByStudent(req.user.userId);
            solvedIds = progress.filter(p => p.status === 'completed' && p.sqlProblemId).map(p => p.sqlProblemId);
        }
        res.json({
            success: true,
            count: problems.length,
            problems: problems.map(p => ({
                ...p,
                id: p.slug || p.id,
                _id: p.id,
                type: 'sql',
                isSolved: solvedIds.includes(p.id)
            }))
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch SQL problems', error: error.message });
    }
};

// Get SQL problem by ID
const getProblemById = async (req, res) => {
    try {
        const { id } = req.params;
        const problem = await SqlProblem.findById(id);
        if (!problem) return res.status(404).json({ success: false, message: 'SQL Problem not found' });
        
        if (req.user?.role === 'student') {
            const progress = await Progress.findAllByStudent(req.user.userId);
            problem.isSolved = progress.some(p => p.sqlProblemId === problem.id && p.status === 'completed');

            // Privacy: mask hidden test case data (same as contentController.getContentById)
            if (problem.testCases) {
                problem.testCases = problem.testCases.map(tc => ({
                    ...tc,
                    input:  tc.isHidden ? 'Hidden' : tc.input,
                    output: tc.isHidden ? 'Hidden' : tc.output
                }));
            }
            // Never expose solution to students
            delete problem.solutionCode;
        }

        // Always add explicit type tag so the frontend can rely on it
        problem.type = 'sql';

        res.json({ success: true, problem });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch SQL problem', error: error.message });
    }
};

// Update SQL problem
const updateProblem = async (req, res) => {
    try {
        const { id } = req.params;
        const problem = await SqlProblem.update(id, req.body);
        if (!problem) return res.status(404).json({ success: false, message: 'SQL Problem not found' });
        res.json({ success: true, message: 'SQL Problem updated successfully', problem });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update SQL problem', error: error.message });
    }
};

// Delete SQL problem
const deleteProblem = async (req, res) => {
    try {
        const { id } = req.params;
        const problem = await SqlProblem.delete(id);
        if (!problem) return res.status(404).json({ success: false, message: 'SQL Problem not found' });
        res.json({ success: true, message: 'SQL Problem deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete SQL problem', error: error.message });
    }
};

module.exports = {
    createProblem,
    bulkCreateProblems,
    getAllProblems,
    getProblemById,
    updateProblem,
    deleteProblem
};
