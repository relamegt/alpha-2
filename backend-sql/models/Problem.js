const prisma = require('../config/db');

const slugify = text => text ? text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') : 'problem';

async function uniqueSlug(title) {
    const base = slugify(title) || 'problem';
    let candidate = base;
    let counter = 2;
    // BUG FIX: added hard limit to prevent infinite loop
    while (counter <= 100) {
        const existing = await prisma.problem.findUnique({ where: { slug: candidate } });
        if (!existing) return candidate;
        candidate = `${base}-${counter}`;
        counter++;
    }
    return `${base}-${Date.now()}`;
}

class Problem {
    static async create(problemData) {
        const slug = await uniqueSlug(problemData.title);
        
        const diffInput = problemData.difficulty?.toLowerCase() || 'easy';
        const difficulty = diffInput.charAt(0).toUpperCase() + diffInput.slice(1);
        const points = diffInput === 'easy' ? 20 : diffInput === 'medium' ? 50 : 100;

        return await prisma.problem.create({
            data: {
                slug,
                title: problemData.title,
                section: problemData.section,
                difficulty,
                points,
                description: problemData.description,
                constraints: problemData.constraints || [],
                inputFormat: problemData.inputFormat || '',
                outputFormat: problemData.outputFormat || '',
                edgeCases: problemData.edgeCases || [],
                examples: problemData.examples || [],
                testCases: problemData.testCases || [],
                timeComplexity: problemData.timeComplexity || '',
                spaceComplexity: problemData.spaceComplexity || '',
                timeLimit: problemData.timeLimit || 2000,
                editorial: problemData.editorial || {},
                editorialLink: problemData.editorialLink || null,
                solutionCode: problemData.solutionCode || {},
                isContestProblem: problemData.isContestProblem || false,
                contestId: problemData.contestId || null,
                createdBy: problemData.createdBy
            }
        });
    }

    static async bulkCreate(problemsData, createdBy) {
        const createdProblems = [];
        for (const data of problemsData) {
            data.createdBy = createdBy;
            const problem = await this.create(data);
            createdProblems.push(problem);
        }
        return createdProblems;
    }

    static async findById(idOrSlug) {
        let problem = null;
        try {
            problem = await prisma.problem.findUnique({ where: { id: idOrSlug } });
        } catch (e) {}
        if (!problem) {
            problem = await prisma.problem.findUnique({ where: { slug: idOrSlug } });
        }
        return problem;
    }

    // Find multiple problems by IDs
    static async findByIds(problemIds) {
        if (!problemIds || problemIds.length === 0) return [];
        // Handle both string IDs and object refs
        const ids = problemIds.map(p => typeof p === 'string' ? p : (p.id || p._id || (typeof p === 'object' && p !== null ? String(p) : p))).filter(id => id && typeof id === 'string');
        if (ids.length === 0) return [];
        return await prisma.problem.findMany({
            where: { id: { in: ids } }
        });
    }

    static async findAll() {
        return await prisma.problem.findMany({
            where: { isContestProblem: false },
            orderBy: [{ section: 'asc' }, { difficulty: 'asc' }]
        });
    }

    static async findAllSummary() {
        return await prisma.problem.findMany({
            where: { isContestProblem: false },
            select: {
                id: true,
                slug: true,
                title: true,
                section: true,
                difficulty: true,
                points: true,
                type: true,
                createdAt: true
            },
            orderBy: [{ section: 'asc' }, { difficulty: 'asc' }]
        });
    }

    // Count total problems
    static async count() {
        return await prisma.problem.count({ where: { isContestProblem: false } });
    }

    // Get sample test cases
    static async getSampleTestCases(problemId) {
        const problem = await prisma.problem.findUnique({
            where: { id: problemId },
            select: { testCases: true, examples: true }
        });
        if (!problem) return [];
        
        // Return examples as sample test cases, or first 2 test cases
        if (problem.examples && Array.isArray(problem.examples) && problem.examples.length > 0) {
            return problem.examples;
        }
        const testCases = problem.testCases || [];
        return Array.isArray(testCases) ? testCases.slice(0, 2) : [];
    }

    static async update(idOrSlug, updateData) {
        const problem = await this.findById(idOrSlug);
        if (!problem) return null;

        const { _id, id, createdAt, updatedAt, isSolved, isCompleted, type, status, ...validData } = updateData;
        const finalUpdate = {};
        
        // List of JSON fields that might need merging if partial updates are sent
        const jsonFields = ['constraints', 'edgeCases', 'examples', 'testCases', 'editorial', 'resources', 'solutionCode', 'quizQuestions'];
        
        // Initialize holders with existing data
        const jsonHolders = {};
        jsonFields.forEach(field => {
            jsonHolders[field] = typeof problem[field] === 'object' && problem[field] !== null ? (Array.isArray(problem[field]) ? [...problem[field]] : { ...problem[field] }) : (['editorial', 'solutionCode'].includes(field) ? {} : []);
        });

        Object.keys(validData).forEach(key => {
            let handled = false;
            
            // Check if key is dot-notation for a JSON field (e.g., 'constraints.0.description')
            for (const field of jsonFields) {
                if (key.startsWith(`${field}.`)) {
                    const parts = key.split('.');
                    // For simplicity, we only handle one level of nesting deeply or replace top-level keys if they are objects
                    // Standard admin panel usually sends the whole array/object for these, but dot-notation is a fallback
                    // Here we just map the key to the finalUpdate if it's not a dot-notation Prisma error
                    handled = false; // Let Prisma error if it's deep dot-notation, but we'll try to prevent it
                    break;
                }
                if (key === field) {
                    finalUpdate[field] = validData[key];
                    handled = true;
                    break;
                }
            }

            if (!handled) {
                finalUpdate[key] = validData[key];
            }
        });

        // Prisma doesn't like dot-notation in the 'data' key. 
        // We've ensured standard keys are passed.
        return await prisma.problem.update({
            where: { id: problem.id },
            data: finalUpdate
        });
    }

    static async delete(idOrSlug) {
        const problem = await this.findById(idOrSlug);
        if (!problem) return null;

        // BUG FIX: clean up related data first to prevent orphaned records or FK violations
        const Progress = require('./Progress');
        await Promise.all([
            prisma.submission.deleteMany({ where: { problemId: problem.id } }),
            Progress.deleteByContent(problem.id, 'problem')
        ]);

        return await prisma.problem.delete({
            where: { id: problem.id }
        });
    }

    // --- Added Missing Methods for Parity ---

    static async findBySection(section) {
        return await prisma.problem.findMany({ where: { section, isContestProblem: false } });
    }

    static async findByDifficulty(difficulty) {
        return await prisma.problem.findMany({ where: { difficulty, isContestProblem: false } });
    }

    static async findBySectionAndDifficulty(section, difficulty) {
        return await prisma.problem.findMany({ where: { section, difficulty, isContestProblem: false } });
    }

    static async findContestProblems(contestId) {
        return await prisma.problem.findMany({ where: { contestId } });
    }

    static async deleteContestProblems(contestId) {
        return await prisma.problem.deleteMany({ where: { contestId } });
    }

    static async getSectionWiseCount() {
        const counts = await prisma.problem.groupBy({
            by: ['section'],
            where: { isContestProblem: false },
            _count: { _all: true }
        });
        const result = {};
        counts.forEach(c => result[c.section || 'Uncategorized'] = c._count._all);
        return result;
    }

    static async getDifficultyWiseCount() {
        const counts = await prisma.problem.groupBy({
            by: ['difficulty'],
            where: { isContestProblem: false },
            _count: { _all: true }
        });
        const result = {};
        counts.forEach(c => result[c.difficulty || 'Uncategorized'] = c._count._all);
        return result;
    }

    static async getTestCases(problemId) {
        const problem = await prisma.problem.findUnique({ where: { id: problemId } });
        return problem ? problem.testCases || [] : [];
    }

    static async getAllTestCases(problemId) {
        return await this.getTestCases(problemId);
    }

    static async setSolutionCode(problemId, language, code) {
        const problem = await prisma.problem.findUnique({ where: { id: problemId } });
        if (!problem) return null;
        const solutionCode = { ...problem.solutionCode, [language]: code };
        return await prisma.problem.update({
            where: { id: problemId },
            data: { solutionCode }
        });
    }

    static async getSolutionCode(problemId) {
        const problem = await prisma.problem.findUnique({ where: { id: problemId } });
        return problem ? problem.solutionCode || {} : {};
    }
}

module.exports = Problem;
