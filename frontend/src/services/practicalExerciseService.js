import apiClient from './apiClient';

const practicalExerciseService = {
    // Get all exercises (Admin only)
    getAllExercises: async () => {
        try {
            const response = await apiClient.get('/practical-exercises/all');
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to fetch exercises' };
        }
    },

    // Get Single Exercise
    getExerciseById: async (id) => {
        try {
            const response = await apiClient.get(`/practical-exercises/${id}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to fetch exercise' };
        }
    },

    // Autosave Draft
    autosaveDraft: async (exerciseId, fileState) => {
        try {
            const response = await apiClient.post('/practical-exercises/autosave', { exerciseId, fileState });
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to autosave' };
        }
    },

    // Submit Exercise
    submitExercise: async (exerciseId, fileSnapshot, testResults, courseId) => {
        try {
            const response = await apiClient.post('/practical-exercises/submit', { 
                exerciseId, 
                fileSnapshot, 
                testResults, 
                courseId 
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Submission failed' };
        }
    },

    // Admin: Create Exercise
    createExercise: async (exerciseData) => {
        try {
            const response = await apiClient.post('/practical-exercises', exerciseData);
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to create exercise' };
        }
    },

    // Admin: Update Exercise
    updateExercise: async (id, exerciseData) => {
        try {
            const response = await apiClient.put(`/practical-exercises/${id}`, exerciseData);
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to update exercise' };
        }
    }
};

export default practicalExerciseService;
