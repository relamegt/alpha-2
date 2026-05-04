import apiClient from './apiClient';

const courseService = {
    // Get all courses
    getAllCourses: async () => {
        try {
            const response = await apiClient.get('/courses');
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to fetch courses' };
        }
    },

    // Get published courses (public catalog)
    getPublishedCourses: async () => {
        try {
            const response = await apiClient.get('/public/courses');
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to fetch public courses' };
        }
    },

    // Rate a course
    rateCourse: async (courseId, rating) => {
        try {
            const response = await apiClient.post(`/student/courses/${courseId}/rate`, { rating });
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to rate course' };
        }
    },

    // Create course
    createCourse: async (title, description = '', thumbnailUrl = '', isPaid = false, price = 0, currency = 'INR', accessYears = null, isPublished = false) => {
        try {
            const response = await apiClient.post('/courses', { 
                title, 
                description, 
                thumbnailUrl,
                isPaid,
                price,
                currency,
                accessYears,
                isPublished
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to create course' };
        }
    },

    // Update course
    updateCourse: async (courseId, updateData) => {
        try {
            const response = await apiClient.put(`/courses/${courseId}`, updateData);
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to update course' };
        }
    },

    // Delete course
    deleteCourse: async (courseId) => {
        try {
            const response = await apiClient.delete(`/courses/${courseId}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to delete course' };
        }
    },

    // Add Section
    addSection: async (courseId, title) => {
        try {
            const response = await apiClient.post(`/courses/${courseId}/sections`, { title });
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to add section' };
        }
    },

    // Update Section
    updateSection: async (courseId, sectionId, title) => {
        try {
            const response = await apiClient.put(`/courses/${courseId}/sections/${sectionId}`, { title });
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to update section' };
        }
    },

    // Delete Section
    deleteSection: async (courseId, sectionId) => {
        try {
            const response = await apiClient.delete(`/courses/${courseId}/sections/${sectionId}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to delete section' };
        }
    },

    // Add subsection
    addSubsection: async (courseId, sectionId, title) => {
        try {
            const response = await apiClient.post(`/courses/${courseId}/sections/${sectionId}/subsections`, { title });
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to add subsection' };
        }
    },

    // Update subsection
    updateSubsection: async (courseId, sectionId, subsectionId, title) => {
        try {
            const response = await apiClient.put(`/courses/${courseId}/sections/${sectionId}/subsections/${subsectionId}`, { title });
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to update subsection' };
        }
    },

    // Delete subsection
    deleteSubsection: async (courseId, sectionId, subsectionId) => {
        try {
            const response = await apiClient.delete(`/courses/${courseId}/sections/${sectionId}/subsections/${subsectionId}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to delete subsection' };
        }
    },

    // Add problem(s) to section
    addProblemToSection: async (courseId, sectionId, problemIds) => {
        try {
            const response = await apiClient.post(`/courses/${courseId}/sections/${sectionId}/problems`, { problemIds });
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to add problem(s)' };
        }
    },

    // Remove problem(s) from section
    removeProblemFromSection: async (courseId, sectionId, problemIds) => {
        try {
            if (!Array.isArray(problemIds)) {
                const response = await apiClient.delete(`/courses/${courseId}/sections/${sectionId}/problems/${problemIds}`);
                return response.data;
            } else {
                const response = await apiClient.delete(`/courses/${courseId}/sections/${sectionId}/problems`, {
                    data: { problemIds }
                });
                return response.data;
            }
        } catch (error) {
            throw error.response?.data || { message: 'Failed to remove problem(s)' };
        }
    },

    // Add contest(s) to section
    addContestToSection: async (courseId, sectionId, courseContestIds) => {
        try {
            const response = await apiClient.post(`/courses/${courseId}/sections/${sectionId}/contests`, { courseContestIds });
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to add contest(s)' };
        }
    },

    // Remove contest(s) from section
    removeContestFromSection: async (courseId, sectionId, courseContestIds) => {
        try {
            if (!Array.isArray(courseContestIds)) {
                const response = await apiClient.delete(`/courses/${courseId}/sections/${sectionId}/contests/${courseContestIds}`);
                return response.data;
            } else {
                const response = await apiClient.delete(`/courses/${courseId}/sections/${sectionId}/contests`, {
                    data: { courseContestIds }
                });
                return response.data;
            }
        } catch (error) {
            throw error.response?.data || { message: 'Failed to remove contest(s)' };
        }
    },

    // Add problem(s) to subsection
    addProblemToSubsection: async (courseId, sectionId, subsectionId, problemIds) => {
        try {
            const response = await apiClient.post(`/courses/${courseId}/sections/${sectionId}/subsections/${subsectionId}/problems`, { problemIds });
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to add problem(s)' };
        }
    },

    // Remove problem(s) from subsection
    removeProblemFromSubsection: async (courseId, sectionId, subsectionId, problemIds) => {
        try {
            if (!Array.isArray(problemIds)) {
                const response = await apiClient.delete(`/courses/${courseId}/sections/${sectionId}/subsections/${subsectionId}/problems/${problemIds}`);
                return response.data;
            } else {
                const response = await apiClient.delete(`/courses/${courseId}/sections/${sectionId}/subsections/${subsectionId}/problems`, {
                    data: { problemIds }
                });
                return response.data;
            }
        } catch (error) {
            throw error.response?.data || { message: 'Failed to remove problem(s)' };
        }
    },

    // Add contest(s) to subsection
    addContestToSubsection: async (courseId, sectionId, subsectionId, courseContestIds) => {
        try {
            const response = await apiClient.post(`/courses/${courseId}/sections/${sectionId}/subsections/${subsectionId}/contests`, { courseContestIds });
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to add contest(s)' };
        }
    },

    // Remove contest(s) from subsection
    removeContestFromSubsection: async (courseId, sectionId, subsectionId, courseContestIds) => {
        try {
            if (!Array.isArray(courseContestIds)) {
                const response = await apiClient.delete(`/courses/${courseId}/sections/${sectionId}/subsections/${subsectionId}/contests/${courseContestIds}`);
                return response.data;
            } else {
                const response = await apiClient.delete(`/courses/${courseId}/sections/${sectionId}/subsections/${subsectionId}/contests`, {
                    data: { courseContestIds }
                });
                return response.data;
            }
        } catch (error) {
            throw error.response?.data || { message: 'Failed to remove contest(s)' };
        }
    },

    // Get specific subsection content (Direct Focus)
    getSubsectionData: async (courseId, subsectionId) => {
        try {
            const response = await apiClient.get(`/public/courses/focus/${courseId}/${subsectionId}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to fetch module data' };
        }
    },
};

export default courseService;
