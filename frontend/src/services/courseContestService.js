import apiClient from './apiClient';

const courseContestService = {
    // Admin/Instructor
    getAllCourseContests: async () => {
        try {
            const response = await apiClient.get('/course-contests');
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to fetch course contests' };
        }
    },

    createCourseContest: async (data) => {
        try {
            const response = await apiClient.post('/course-contests', data);
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to create course contest' };
        }
    },

    updateCourseContest: async (id, data) => {
        try {
            const response = await apiClient.put(`/course-contests/${id}`, data);
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to update course contest' };
        }
    },

    deleteCourseContest: async (id) => {
        try {
            const response = await apiClient.delete(`/course-contests/${id}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to delete course contest' };
        }
    },

    getStatistics: async (id) => {
        try {
            const response = await apiClient.get(`/course-contests/${id}/statistics`);
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to fetch statistics' };
        }
    },

    // Student + Instructor
    getCourseContestById: async (id) => {
        try {
            const response = await apiClient.get(`/course-contests/${id}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to fetch course contest' };
        }
    },

    getLeaderboard: async (id, params = {}) => {
        try {
            const response = await apiClient.get(`/course-contests/${id}/leaderboard`, { params });
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to fetch leaderboard' };
        }
    },

    getSubmissions: async (id, params = {}) => {
        try {
            const response = await apiClient.get(`/course-contests/${id}/submissions`, { params });
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to fetch submissions' };
        }
    },

    submitCode: async (id, data) => {
        try {
            const response = await apiClient.post(`/course-contests/${id}/submit`, data);
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Submission failed' };
        }
    },

    runCode: async (id, data) => {
        try {
            const response = await apiClient.post(`/course-contests/${id}/run`, data);
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Code execution failed' };
        }
    },

    finishCourseContest: async (id, data) => {
        try {
            const response = await apiClient.post(`/course-contests/${id}/finish`, data);
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to finish contest' };
        }
    },

    logViolation: async (id, data) => {
        try {
            await apiClient.post(`/course-contests/${id}/violations`, data);
        } catch (error) {
            console.error('Failed to log violation:', error);
        }
    },

    startNewAttempt: async (id) => {
        try {
            const response = await apiClient.post(`/course-contests/${id}/start-attempt`);
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to start new attempt' };
        }
    },

    getCourseContestsByCourse: async (courseId) => {
        try {
            const response = await apiClient.get(`/course-contests/course/${courseId}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to fetch contests for this course' };
        }
    }
};

export default courseContestService;
