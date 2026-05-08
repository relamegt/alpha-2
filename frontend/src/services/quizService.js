import apiClient from './apiClient';

const quizService = {
    getAll: async () => {
        const res = await apiClient.get('/quizzes');
        return res.data;
    },
    getById: async (id) => {
        const res = await apiClient.get(`/quizzes/${id}`);
        return res.data;
    },
    create: async (data) => {
        const res = await apiClient.post('/quizzes', data);
        return res.data;
    },
    update: async (id, data) => {
        const res = await apiClient.put(`/quizzes/${id}`, data);
        return res.data;
    },
    delete: async (id) => {
        const res = await apiClient.delete(`/quizzes/${id}`);
        return res.data;
    },
    bulkDelete: async (ids) => {
        const res = await apiClient.delete('/quizzes/bulk', { data: { ids } });
        return res.data;
    }
};

export default quizService;
