import apiClient from './apiClient';

const articleService = {
    getAll: async () => {
        const res = await apiClient.get('/private-articles');
        return res.data;
    },
    getById: async (id) => {
        const res = await apiClient.get(`/private-articles/${id}`);
        return res.data;
    },
    create: async (data) => {
        const res = await apiClient.post('/private-articles', data);
        return res.data;
    },
    update: async (id, data) => {
        const res = await apiClient.put(`/private-articles/${id}`, data);
        return res.data;
    },
    delete: async (id) => {
        const res = await apiClient.delete(`/private-articles/${id}`);
        return res.data;
    }
};

export default articleService;
