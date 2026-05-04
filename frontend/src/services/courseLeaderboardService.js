import apiClient from './apiClient';

const courseLeaderboardService = {
    getLeaderboard: async (courseId) => {
        try {
            const response = await apiClient.get(`/reports/leaderboard/course/${courseId}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to fetch course leaderboard' };
        }
    },

    getCourseReport: async (courseId) => {
        try {
            const response = await apiClient.get(`/reports/course/${courseId}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to fetch course report' };
        }
    }
};

export default courseLeaderboardService;
