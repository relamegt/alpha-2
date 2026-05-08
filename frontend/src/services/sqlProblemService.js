import apiClient from './apiClient';

const sqlProblemService = {
    getAll: async () => {
        const res = await apiClient.get('/sql-problems');
        return res.data;
    },
    getById: async (id) => {
        const res = await apiClient.get(`/sql-problems/${id}`);
        return res.data;
    },
    create: async (data) => {
        const res = await apiClient.post('/sql-problems', data);
        return res.data;
    },
    bulkCreate: async (jsonFile) => {
        const formData = new FormData();
        formData.append('file', jsonFile);

        const res = await apiClient.post('/sql-problems/bulk', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return res.data;
    },
    update: async (id, data) => {
        const res = await apiClient.put(`/sql-problems/${id}`, data);
        return res.data;
    },
    delete: async (id) => {
        const res = await apiClient.delete(`/sql-problems/${id}`);
        return res.data;
    },
    bulkDelete: async (ids) => {
        const res = await apiClient.delete('/sql-problems/bulk', { data: { ids } });
        return res.data;
    }
};

export default sqlProblemService;
