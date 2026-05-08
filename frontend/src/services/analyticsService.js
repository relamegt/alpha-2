import apiClient from './apiClient';

const analyticsService = {
    /**
     * Get overall analytics for the student dashboard
     */
    getOverallAnalytics: async () => {
        const { data } = await apiClient.get('/analytics/overall');
        return data;
    },

    /**
     * Get detailed analytics for a specific course
     */
    getCourseAnalytics: async (courseId, range = 'month') => {
        const { data } = await apiClient.get(`/analytics/course/${courseId}`, {
            params: { range }
        });
        return data;
    },

    /**
     * Get paged leaderboard for a specific course
     */
    getCourseLeaderboardPaged: async (courseId, page = 1, limit = 20) => {
        const { data } = await apiClient.get(`/analytics/course/${courseId}/leaderboard`, {
            params: { page, limit }
        });
        return data;
    },

    /**
     * Get paged global leaderboard
     */
    getGlobalLeaderboardPaged: async (page = 1, limit = 20, search = '') => {
        const { data } = await apiClient.get('/analytics/global/leaderboard', {
            params: { page, limit, search }
        });
        return data;
    }
};

export default analyticsService;
