import apiClient from './apiClient';

const videoService = {
    getAll: async () => {
        const res = await apiClient.get('/videos');
        return res.data;
    },
    getById: async (id) => {
        const res = await apiClient.get(`/videos/${id}`);
        return res.data;
    },
    create: async (data) => {
        const res = await apiClient.post('/videos', data);
        return res.data;
    },
    update: async (id, data) => {
        const res = await apiClient.put(`/videos/${id}`, data);
        return res.data;
    },
    delete: async (id) => {
        const res = await apiClient.delete(`/videos/${id}`);
        return res.data;
    },
    bulkDelete: async (ids) => {
        const res = await apiClient.delete('/videos/bulk', { data: { ids } });
        return res.data;
    }
};

export default videoService;
