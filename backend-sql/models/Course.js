const prisma = require('../config/db');
const { randomUUID } = require('crypto');

class Course {
    static slugify(text) {
        return (text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    }

    static async uniqueCourseSlug(name) {
        const base = this.slugify(name) || 'course';
        let candidate = base;
        let counter = 2;
        while (true) {
            const existing = await prisma.course.findUnique({ where: { slug: candidate } });
            if (!existing) return candidate;
            candidate = `${base}-${counter}`;
            counter++;
        }
    }

    static async create(courseData) {
        const slug = await this.uniqueCourseSlug(courseData.title);
        const course = await prisma.course.create({
            data: {
                title: courseData.title,
                slug,
                description: courseData.description || '',
                thumbnailUrl: courseData.thumbnailUrl || '',
                sections: [],
                isPaid: courseData.isPaid || false,
                price: courseData.price || 0,
                currency: courseData.currency || 'INR',
                accessYears: courseData.accessYears ? Number(courseData.accessYears) : null,
                isPublished: courseData.isPublished || false,
                whatYouWillLearn: courseData.whatYouWillLearn || '',
                hours: courseData.hours ? Number(courseData.hours) : 0,
                language: courseData.language || ''
            }
        });

        if (course.isPublished) {
            await this.ensureOnlineBatch(course.id);
        }

        course._id = course.id;
        return course;
    }

    static async ensureOnlineBatch(courseId) {
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            include: { onlineBatch: true }
        });

        if (!course) throw new Error('Course not found');
        if (course.onlineBatch) return course.onlineBatch;

        // Create a new batch for this online course
        const Batch = require('./Batch');
        const batchName = `Online: ${course.title}`;
        const startDate = new Date();
        const endDate = new Date();
        endDate.setFullYear(startDate.getFullYear() + 10); // Far future for online batches if not specifically used for expiry

        const batch = await prisma.batch.create({
            data: {
                name: batchName,
                slug: await Course.uniqueCourseSlug(batchName),
                startDate,
                endDate,
                deleteOn: new Date(endDate.getFullYear() + 1, 0, 1),
                type: 'ONLINE',
                description: `Automatically created online batch for ${course.title}`,
                assignedCourses: [course.id],
                createdBy: 'SYSTEM'
            }
        });

        await prisma.course.update({
            where: { id: courseId },
            data: { onlineBatchId: batch.id }
        });

        return batch;
    }

    static async findAll() {
        const courses = await prisma.course.findMany({ 
            orderBy: { createdAt: 'asc' },
            include: {
                _count: {
                    select: { userBatches: true }
                }
            }
        });
        return courses.map(c => ({ 
            ...c, 
            _id: c.id,
            enrolledCount: c._count.userBatches
        }));
    }

    static async findById(idOrSlug) {
        let course = null;
        const include = {
            _count: {
                select: { userBatches: true }
            }
        };
        try { 
            course = await prisma.course.findUnique({ 
                where: { id: idOrSlug },
                include
            }); 
        } catch (e) {}
        if (!course) {
            course = await prisma.course.findUnique({ 
                where: { slug: idOrSlug },
                include
            });
        }
        if (course) {
            course._id = course.id;
            course.enrolledCount = course._count.userBatches;
        }
        return course;
    }

    static async findByIds(courseIds) {
        if (!courseIds || courseIds.length === 0) return [];
        const ids = courseIds.map(id => typeof id === 'string' ? id : String(id));
        return await prisma.course.findMany({ where: { id: { in: ids } } });
    }

    static async update(courseId, updateData) {
        const { id, _id, sections, createdAt, updatedAt, isSolved, isCompleted, type, ...safeData } = updateData;
        if (safeData.accessYears !== undefined) safeData.accessYears = safeData.accessYears ? Number(safeData.accessYears) : null;
        if (safeData.hours !== undefined) safeData.hours = Number(safeData.hours);
        
        const updatedCourse = await prisma.course.update({
            where: { id: courseId },
            data: { ...safeData, updatedAt: new Date() }
        });

        if (updatedCourse.isPublished) {
            await this.ensureOnlineBatch(courseId);
        }

        return updatedCourse;
    }

    static async delete(courseId) {
        return await prisma.course.delete({ where: { id: courseId } });
    }

    static async updateSections(courseId, sections) {
        return await prisma.course.update({
            where: { id: courseId },
            data: { sections, updatedAt: new Date() }
        });
    }

    // --- Section CRUD (JSON array manipulation) ---

    static async addSection(courseId, title) {
        const course = await this.findById(courseId);
        if (!course) throw new Error('Course not found');

        const section = { id: randomUUID(), _id: randomUUID(), title, slug: this.slugify(title), subsections: [], problemIds: [], courseContestIds: [] };
        const sections = course.sections || [];
        sections.push(section);

        await this.updateSections(courseId, sections);
        return { result: { matchedCount: 1 }, section };
    }

    static async updateSection(courseId, sectionId, title) {
        const course = await this.findById(courseId);
        if (!course) throw new Error('Course not found');

        const sections = course.sections || [];
        const sec = sections.find(s => s.id === sectionId || s._id === sectionId);
        if (!sec) throw new Error('Section not found');
        sec.title = title;

        return await this.updateSections(courseId, sections);
    }

    static async deleteSection(courseId, sectionId) {
        const course = await this.findById(courseId);
        if (!course) throw new Error('Course not found');

        const sections = (course.sections || []).filter(
            s => s.id !== sectionId && s._id !== sectionId
        );
        return await this.updateSections(courseId, sections);
    }

    // --- Subsection CRUD ---

    static async addSubsection(courseId, sectionId, title) {
        const course = await this.findById(courseId);
        if (!course) throw new Error('Course not found');

        const sections = course.sections || [];
        const sec = sections.find(s => s.id === sectionId || s._id === sectionId);
        if (!sec) throw new Error('Section not found');

        const subsection = {
            id: randomUUID(), _id: randomUUID(),
            title, slug: this.slugify(title),
            problemIds: [], courseContestIds: [], problems: []
        };
        sec.subsections = sec.subsections || [];
        sec.subsections.push(subsection);

        return await this.updateSections(courseId, sections);
    }

    static async updateSubsection(courseId, sectionId, subsectionId, title) {
        const course = await this.findById(courseId);
        if (!course) throw new Error('Course not found');

        const sections = course.sections || [];
        const sec = sections.find(s => s.id === sectionId || s._id === sectionId);
        if (!sec) throw new Error('Section not found');

        const sub = (sec.subsections || []).find(s => s.id === subsectionId || s._id === subsectionId);
        if (!sub) throw new Error('Subsection not found');
        sub.title = title;

        return await this.updateSections(courseId, sections);
    }

    static async deleteSubsection(courseId, sectionId, subsectionId) {
        const course = await this.findById(courseId);
        if (!course) throw new Error('Course not found');

        const sections = course.sections || [];
        const sec = sections.find(s => s.id === sectionId || s._id === sectionId);
        if (!sec) throw new Error('Section not found');

        sec.subsections = (sec.subsections || []).filter(
            s => s.id !== subsectionId && s._id !== subsectionId
        );
        return await this.updateSections(courseId, sections);
    }

    // --- Problem/Contest in Section ---
    static async addProblemToSection(courseId, sectionId, problemIds) {
        const course = await this.findById(courseId);
        if (!course) throw new Error('Course not found');
        const sec = (course.sections || []).find(s => s.id === sectionId || s._id === sectionId);
        if (!sec) throw new Error('Section not found');
        
        const ids = Array.isArray(problemIds) ? problemIds : [problemIds];
        const existing = new Set((sec.problemIds || []).map(String));
        ids.forEach(id => existing.add(String(id)));
        sec.problemIds = Array.from(existing);
        
        return await this.updateSections(courseId, course.sections);
    }

    static async removeProblemFromSection(courseId, sectionId, problemIds) {
        const course = await this.findById(courseId);
        if (!course) throw new Error('Course not found');
        const sec = (course.sections || []).find(s => s.id === sectionId || s._id === sectionId);
        if (!sec) throw new Error('Section not found');
        
        const ids = (Array.isArray(problemIds) ? problemIds : [problemIds]).map(String);
        sec.problemIds = (sec.problemIds || []).filter(id => !ids.includes(String(id)));
        
        return await this.updateSections(courseId, course.sections);
    }

    static async addContestToSection(courseId, sectionId, courseContestIds) {
        const course = await this.findById(courseId);
        if (!course) throw new Error('Course not found');
        const sec = (course.sections || []).find(s => s.id === sectionId || s._id === sectionId);
        if (!sec) throw new Error('Section not found');
        
        const ids = Array.isArray(courseContestIds) ? courseContestIds : [courseContestIds];
        const existing = new Set((sec.courseContestIds || []).map(String));
        ids.forEach(id => existing.add(String(id)));
        sec.courseContestIds = Array.from(existing);
        
        return await this.updateSections(courseId, course.sections);
    }

    static async removeContestFromSection(courseId, sectionId, courseContestIds) {
        const course = await this.findById(courseId);
        if (!course) throw new Error('Course not found');
        const sec = (course.sections || []).find(s => s.id === sectionId || s._id === sectionId);
        if (!sec) throw new Error('Section not found');
        
        const ids = (Array.isArray(courseContestIds) ? courseContestIds : [courseContestIds]).map(String);
        sec.courseContestIds = (sec.courseContestIds || []).filter(id => !ids.includes(String(id)));
        
        return await this.updateSections(courseId, course.sections);
    }

    // --- Problem/Contest in Subsection ---

    static _findSubsection(course, sectionId, subsectionId) {
        const sections = course.sections || [];
        const sec = sections.find(s => s.id === sectionId || s._id === sectionId);
        if (!sec) return null;
        const sub = (sec.subsections || []).find(s => s.id === subsectionId || s._id === subsectionId);
        return sub || null;
    }

    static async addProblemToSubsection(courseId, sectionId, subsectionId, problemIds) {
        const course = await this.findById(courseId);
        if (!course) throw new Error('Course not found');

        const sub = this._findSubsection(course, sectionId, subsectionId);
        if (!sub) throw new Error('Subsection not found');

        const ids = Array.isArray(problemIds) ? problemIds : [problemIds];
        const existing = new Set((sub.problemIds || []).map(String));
        ids.forEach(id => existing.add(String(id)));
        sub.problemIds = Array.from(existing);

        return await this.updateSections(courseId, course.sections);
    }

    static async removeProblemFromSubsection(courseId, sectionId, subsectionId, problemIds) {
        const course = await this.findById(courseId);
        if (!course) throw new Error('Course not found');

        const sub = this._findSubsection(course, sectionId, subsectionId);
        if (!sub) throw new Error('Subsection not found');

        const ids = (Array.isArray(problemIds) ? problemIds : [problemIds]).map(String);
        sub.problemIds = (sub.problemIds || []).filter(id => !ids.includes(String(id)));

        return await this.updateSections(courseId, course.sections);
    }

    static async addContestToSubsection(courseId, sectionId, subsectionId, courseContestIds) {
        const course = await this.findById(courseId);
        if (!course) throw new Error('Course not found');

        const sub = this._findSubsection(course, sectionId, subsectionId);
        if (!sub) throw new Error('Subsection not found');

        const ids = Array.isArray(courseContestIds) ? courseContestIds : [courseContestIds];
        const existing = new Set((sub.courseContestIds || []).map(String));
        ids.forEach(id => existing.add(String(id)));
        sub.courseContestIds = Array.from(existing);

        return await this.updateSections(courseId, course.sections);
    }

    static async removeContestFromSubsection(courseId, sectionId, subsectionId, courseContestIds) {
        const course = await this.findById(courseId);
        if (!course) throw new Error('Course not found');

        const sub = this._findSubsection(course, sectionId, subsectionId);
        if (!sub) throw new Error('Subsection not found');

        const ids = (Array.isArray(courseContestIds) ? courseContestIds : [courseContestIds]).map(String);
        sub.courseContestIds = (sub.courseContestIds || []).filter(id => !ids.includes(String(id)));

        return await this.updateSections(courseId, course.sections);
    }

    // --- Get Subsection Content (Focus View) ---

    static async getSubsectionContent(courseId, subsectionIdOrSlug, userId = null) {
        const course = await this.findById(courseId);
        if (!course) return null;

        let sectionName = '';
        let subsection  = null;

        for (const section of (course.sections || [])) {
            const search = String(subsectionIdOrSlug).toLowerCase().replace(/[^a-z0-9]/g, '');
            const isSecIdMatch = (section.id === subsectionIdOrSlug || section._id === subsectionIdOrSlug);
            const secSlugLeni = this.slugify(section.title || '').replace(/[^a-z0-9]/g, '');
            
            // Check if it's querying the section itself
            if (isSecIdMatch || secSlugLeni === search) {
                sectionName = section.title;
                subsection = {
                    _id: section._id || section.id,
                    title: section.title + ' Core',
                    problemIds: section.problemIds || [],
                    courseContestIds: section.courseContestIds || [],
                    slug: this.slugify(section.title)
                };
                break;
            }

            const found = (section.subsections || []).find(sub => {
                const isIdMatch       = (sub.id === subsectionIdOrSlug || sub._id === subsectionIdOrSlug);
                const isPreciseSlug   = sub.slug === subsectionIdOrSlug;
                const subSlugLenient  = (sub.slug || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                const titleSlugLeni   = this.slugify(sub.title || '').replace(/[^a-z0-9]/g, '');
                return isIdMatch || isPreciseSlug || (subSlugLenient === search) || (titleSlugLeni === search);
            });
            if (found) { sectionName = section.title; subsection = found; break; }
        }

        if (!subsection) return null;

        // Fetch all content in parallel
        const problemIds = (subsection.problemIds || []).map(String);
        const Problem  = require('./Problem');
        const SqlProblem = require('./SqlProblem');
        const Video    = require('./Video');
        const Quiz     = require('./Quiz');
        const Article  = require('./Article');
        const Assignment = require('./Assignment');

        const [codingArr, sqlArr, videoArr, quizArr, articleArr, assignmentArr] = await Promise.all([
            Problem.findByIds(problemIds),
            SqlProblem.findByIds(problemIds),
            Video.findByIds(problemIds),
            Quiz.findByIds(problemIds),
            Article.findByIds(problemIds),
            Assignment.findByIds ? Assignment.findByIds(problemIds) : prisma.assignment.findMany({ where: { id: { in: problemIds } } })
        ]);

        const problems = [
            ...codingArr.map(p  => ({ ...p, type: 'problem' })),
            ...sqlArr.map(p     => ({ ...p, type: 'sql'     })),
            ...videoArr.map(p   => ({ ...p, type: 'video'   })),
            ...quizArr.map(p    => ({ ...p, type: 'quiz'    })),
            ...articleArr.map(p => ({ ...p, type: 'article' })),
            ...assignmentArr.map(p => ({ ...p, type: 'assignment' })),
        ];

        // Fetch course contests — problemIds stored as JSON, no Prisma relation
        const contestIds = (subsection.courseContestIds || []).map(String);
        let contests = [];
        if (contestIds.length > 0) {
            contests = await prisma.courseContest.findMany({
                where: { id: { in: contestIds } },
                // 'problems' is NOT a Prisma relation (stored as problemIds JSON) —
                // selecting it via include causes a runtime error. Use the raw field.
                select: {
                    id: true, slug: true, title: true, description: true,
                    duration: true, maxAttempts: true, coinsReward: true,
                    difficulty: true, problemIds: true,
                },
            });
        }

        // ── Progress / solved state ───────────────────────────────────────────
        // BUG FIX: previously only checked progress.problemId — this missed
        // SQL, video, quiz, and article completions. Now uses a single batch
        // query across the canonical contentId column (works for ALL types).
        let solvedMap = {};
        if (userId) {
            try {
                const allContentIds = problems.map(p => p.id).filter(Boolean);
                const Progress = require('./Progress');
                solvedMap = await Progress.getCompletionMap(userId, allContentIds);
            } catch (e) {
                console.warn('[Course] Progress fetch failed (non-fatal):', e.message);
            }
        }

        let solvedContestsSet = new Set();
        if (userId && contestIds.length > 0) {
            try {
                const completedContestSubs = await prisma.courseContestSubmission.findMany({
                    where: { studentId: userId, isFinalSubmission: true },
                    select: { courseContestId: true },
                });
                completedContestSubs.forEach(s => solvedContestsSet.add(s.courseContestId));
            } catch (e) { /* non-fatal */ }
        }

        return {
            sectionName,
            subsectionName: subsection.title,
            problems: problems.map(p => ({
                ...p,
                id:       p.slug || p.id,
                _id:      p.id,
                type:     p.type,
                points:   (['quiz', 'article', 'video'].includes((p.type || '').toLowerCase())) ? 0 : (p.points || 0),
                isSolved: !!(solvedMap[p.id]),
            })),
            contests: contests.map(c => ({
                ...c,
                id:            c.slug || c.id,
                _id:           c.id,
                isSolved:      solvedContestsSet.has(c.id),
                // JSON-stored problemIds; parse if it arrives as a string
                totalProblems: Array.isArray(c.problemIds)
                    ? c.problemIds.length
                    : (typeof c.problemIds === 'string' ? JSON.parse(c.problemIds).length : 0),
                maxAttempts:   c.maxAttempts || 1,
            })),
        };
    }
}

module.exports = Course;
