import apiClient from './apiClient';

const publicService = {
    getPublishedCourses: async () => {
        try {
            const response = await apiClient.get('/public/courses');
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to fetch catalog' };
        }
    },
    getCourseDetails: async (courseId) => {
        try {
            const response = await apiClient.get(`/public/courses/${courseId}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to fetch course details' };
        }
    },

    enrollFree: async (courseId) => {
        try {
            const response = await apiClient.post('/enroll/free', { courseId });
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Enrollment failed' };
        }
    },

    createOrder: async (courseId) => {
        try {
            const response = await apiClient.post('/enroll/create-order', { courseId });
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to create payment order' };
        }
    },

    verifyPayment: async (paymentData) => {
        try {
            const response = await apiClient.post('/enroll/verify-payment', paymentData);
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Payment verification failed' };
        }
    }
};

export default publicService;
