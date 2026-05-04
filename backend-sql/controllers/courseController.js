const Course = require('../models/Course');
const prisma = require('../config/db');

// Create Course
exports.createCourse = async (req, res, next) => {
    try {
        const { title, description, thumbnailUrl, isPaid, price, currency, accessYears, isPublished, whatYouWillLearn, hours, language } = req.body;
        if (!title) {
            return res.status(400).json({ message: 'Title is required' });
        }

        const course = await Course.create({ 
            title, description, thumbnailUrl, isPaid, price, currency, accessYears, isPublished, whatYouWillLearn, hours, language 
        });
        res.status(201).json({ success: true, course });
    } catch (error) {
        next(error);
    }
};

// Get All Courses
exports.getAllCourses = async (req, res, next) => {
    try {
        const courses = await Course.findAll();
        res.json({ success: true, courses });
    } catch (error) {
        next(error);
    }
};

// Get Course by ID
exports.getCourseById = async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        res.json({ success: true, course });
    } catch (error) {
        next(error);
    }
};

// Update Course
exports.updateCourse = async (req, res, next) => {
    try {
        const { title, description, thumbnailUrl, isPaid, price, currency, accessYears, isPublished, whatYouWillLearn, hours, language } = req.body;
        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (thumbnailUrl !== undefined) updateData.thumbnailUrl = thumbnailUrl;
        if (isPaid !== undefined) updateData.isPaid = isPaid;
        if (price !== undefined) updateData.price = Number(price);
        if (currency !== undefined) updateData.currency = currency;
        if (accessYears !== undefined) updateData.accessYears = accessYears ? Number(accessYears) : null;
        if (isPublished !== undefined) updateData.isPublished = isPublished;
        if (whatYouWillLearn !== undefined) updateData.whatYouWillLearn = whatYouWillLearn;
        if (hours !== undefined) updateData.hours = hours;
        if (language !== undefined) updateData.language = language;

        const result = await Course.update(req.params.id, updateData);
        if (!result) {
            return res.status(404).json({ message: 'Course not found' });
        }
        res.json({ success: true, message: 'Course updated successfully' });
    } catch (error) {
        next(error);
    }
};

// Delete Course
exports.deleteCourse = async (req, res, next) => {
    try {
        const result = await Course.delete(req.params.id);
        if (!result) {
            return res.status(404).json({ message: 'Course not found' });
        }
        res.json({ success: true, message: 'Course deleted successfully' });
    } catch (error) {
        next(error);
    }
};

// Add Section
exports.addSection = async (req, res, next) => {
    try {
        const { title } = req.body;
        if (!title) {
            return res.status(400).json({ message: 'Section title is required' });
        }
        const { result, section } = await Course.addSection(req.params.courseId, title);

        if (!result) {
            return res.status(404).json({ message: 'Course not found' });
        }
        res.status(201).json({ success: true, section });
    } catch (error) {
        next(error);
    }
};

// Update Section
exports.updateSection = async (req, res, next) => {
    try {
        const { title } = req.body;
        const { courseId, sectionId } = req.params;

        const result = await Course.updateSection(courseId, sectionId, title);
        if (!result) {
            return res.status(404).json({ message: 'Course or Section not found' });
        }
        res.json({ success: true, message: 'Section updated successfully' });
    } catch (error) {
        next(error);
    }
};

// Delete Section
exports.deleteSection = async (req, res, next) => {
    try {
        const { courseId, sectionId } = req.params;
        const result = await Course.deleteSection(courseId, sectionId);

        if (!result) {
            return res.status(404).json({ message: 'Course not found' });
        }
        res.json({ success: true, message: 'Section deleted successfully' });
    } catch (error) {
        next(error);
    }
};

// Add Subsection
exports.addSubsection = async (req, res, next) => {
    try {
        const { title } = req.body;
        const { courseId, sectionId } = req.params;
        if (!title) {
            return res.status(400).json({ message: 'Subsection title is required' });
        }

        const result = await Course.addSubsection(courseId, sectionId, title);

        if (!result) {
            return res.status(404).json({ message: 'Course or Section not found' });
        }
        res.status(201).json({ success: true, message: 'Subsection added' });
    } catch (error) {
        next(error);
    }
};

// Update Subsection
exports.updateSubsection = async (req, res, next) => {
    try {
        const { title } = req.body;
        const { courseId, sectionId, subsectionId } = req.params;

        const result = await Course.updateSubsection(courseId, sectionId, subsectionId, title);
        if (!result) {
            return res.status(404).json({ message: 'Course, Section or Subsection not found' });
        }
        res.json({ success: true, message: 'Subsection updated successfully' });
    } catch (error) {
        next(error);
    }
};

// Delete Subsection
exports.deleteSubsection = async (req, res, next) => {
    try {
        const { courseId, sectionId, subsectionId } = req.params;
        const result = await Course.deleteSubsection(courseId, sectionId, subsectionId);

        if (!result) {
            return res.status(404).json({ message: 'Course or Section not found' });
        }
        res.json({ success: true, message: 'Subsection deleted successfully' });
    } catch (error) {
        next(error);
    }
};

// Add Problem(s) to Section
exports.addProblemToSection = async (req, res, next) => {
    try {
        const { courseId, sectionId } = req.params;
        const { problemIds } = req.body;

        if (!problemIds || (Array.isArray(problemIds) && problemIds.length === 0)) {
            return res.status(400).json({ message: 'Problem IDs are required' });
        }

        const ids = Array.isArray(problemIds) ? problemIds : [problemIds];
        const result = await Course.addProblemToSection(courseId, sectionId, ids);

        if (!result) {
            return res.status(404).json({ message: 'Not found during update' });
        }
        res.json({ success: true, message: `${ids.length} problem(s) added to section` });
    } catch (error) {
        next(error);
    }
};

// Remove Problem(s) from Section
exports.removeProblemFromSection = async (req, res, next) => {
    try {
        const { courseId, sectionId } = req.params;
        const { problemIds } = req.body;
        const paramProblemId = req.params.problemId;

        let ids = [];
        if (problemIds) {
            ids = Array.isArray(problemIds) ? problemIds : [problemIds];
        } else if (paramProblemId) {
            ids = [paramProblemId];
        } else {
            return res.status(400).json({ message: 'Problem ID(s) are required' });
        }

        const result = await Course.removeProblemFromSection(courseId, sectionId, ids);

        if (!result) {
            return res.status(404).json({ message: 'Not found' });
        }

        res.json({ success: true, message: 'Problem(s) removed' });
    } catch (error) {
        next(error);
    }
};

// Add CourseContest(s) to Section
exports.addContestToSection = async (req, res, next) => {
    try {
        const { courseId, sectionId } = req.params;
        const { courseContestIds } = req.body;

        if (!courseContestIds || (Array.isArray(courseContestIds) && courseContestIds.length === 0)) {
            return res.status(400).json({ message: 'Course Contest IDs are required' });
        }

        const ids = Array.isArray(courseContestIds) ? courseContestIds : [courseContestIds];
        const result = await Course.addContestToSection(courseId, sectionId, ids);

        if (!result) {
            return res.status(404).json({ message: 'Not found during update' });
        }

        res.json({ success: true, message: `${ids.length} course contest(s) added to section` });
    } catch (error) {
        next(error);
    }
};

// Remove CourseContest(s) from Section
exports.removeContestFromSection = async (req, res, next) => {
    try {
        const { courseId, sectionId } = req.params;
        const { courseContestIds } = req.body;
        const paramContestId = req.params.contestId;

        let ids = [];
        if (courseContestIds) {
            ids = Array.isArray(courseContestIds) ? courseContestIds : [courseContestIds];
        } else if (paramContestId) {
            ids = [paramContestId];
        } else {
            return res.status(400).json({ message: 'Course Contest ID(s) are required' });
        }

        const result = await Course.removeContestFromSection(courseId, sectionId, ids);

        if (!result) {
            return res.status(404).json({ message: 'Not found' });
        }

        res.json({ success: true, message: 'Course contest(s) removed' });
    } catch (error) {
        next(error);
    }
};

// Add Problem(s) to Subsection
exports.addProblemToSubsection = async (req, res, next) => {
    try {
        const { courseId, sectionId, subsectionId } = req.params;
        const { problemIds } = req.body;

        if (!problemIds || (Array.isArray(problemIds) && problemIds.length === 0)) {
            return res.status(400).json({ message: 'Problem IDs are required' });
        }

        const ids = Array.isArray(problemIds) ? problemIds : [problemIds];
        const result = await Course.addProblemToSubsection(courseId, sectionId, subsectionId, ids);

        if (!result) {
            return res.status(404).json({ message: 'Not found during update' });
        }
        res.json({ success: true, message: `${ids.length} problem(s) added to subsection` });
    } catch (error) {
        next(error);
    }
};

// Remove Problem(s) from Subsection
exports.removeProblemFromSubsection = async (req, res, next) => {
    try {
        const { courseId, sectionId, subsectionId } = req.params;
        const { problemIds } = req.body;
        const paramProblemId = req.params.problemId;

        let ids = [];
        if (problemIds) {
            ids = Array.isArray(problemIds) ? problemIds : [problemIds];
        } else if (paramProblemId) {
            ids = [paramProblemId];
        } else {
            return res.status(400).json({ message: 'Problem ID(s) are required' });
        }

        const result = await Course.removeProblemFromSubsection(courseId, sectionId, subsectionId, ids);

        if (!result) {
            return res.status(404).json({ message: 'Not found' });
        }

        res.json({ success: true, message: 'Problem(s) removed' });
    } catch (error) {
        next(error);
    }
};

// Add CourseContest(s) to Subsection
exports.addContestToSubsection = async (req, res, next) => {
    try {
        const { courseId, sectionId, subsectionId } = req.params;
        const { courseContestIds } = req.body;

        if (!courseContestIds || (Array.isArray(courseContestIds) && courseContestIds.length === 0)) {
            return res.status(400).json({ message: 'Course Contest IDs are required' });
        }

        const ids = Array.isArray(courseContestIds) ? courseContestIds : [courseContestIds];
        const result = await Course.addContestToSubsection(courseId, sectionId, subsectionId, ids);

        if (!result) {
            return res.status(404).json({ message: 'Not found during update' });
        }

        res.json({ success: true, message: `${ids.length} course contest(s) added to subsection` });
    } catch (error) {
        next(error);
    }
};

// Remove CourseContest(s) from Subsection
exports.removeContestFromSubsection = async (req, res, next) => {
    try {
        const { courseId, sectionId, subsectionId } = req.params;
        const { courseContestIds } = req.body;
        const paramContestId = req.params.contestId;

        let ids = [];
        if (courseContestIds) {
            ids = Array.isArray(courseContestIds) ? courseContestIds : [courseContestIds];
        } else if (paramContestId) {
            ids = [paramContestId];
        } else {
            return res.status(400).json({ message: 'Course Contest ID(s) are required' });
        }

        const result = await Course.removeContestFromSubsection(courseId, sectionId, subsectionId, ids);

        if (!result) {
            return res.status(404).json({ message: 'Not found' });
        }

        res.json({ success: true, message: 'Course contest(s) removed' });
    } catch (error) {
        next(error);
    }
};

// Get specific Subsection Data (Direct Focus)
exports.getSubsectionContent = async (req, res, next) => {
    try {
        const { courseId, subsectionId } = req.params;
        const data = await Course.getSubsectionContent(courseId, subsectionId);
        
        if (!data) {
            return res.status(404).json({ message: 'Subsection not found' });
        }
        res.json({ success: true, ...data });
    } catch (error) {
        next(error);
    }
};
