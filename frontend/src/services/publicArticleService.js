import apiClient from './apiClient';

const publicArticleService = {
    getAll: async (params) => {
        const res = await apiClient.get('/public-articles', { params });
        return res.data;
    },
    getBySlug: async (slug) => {
        const res = await apiClient.get(`/public-articles/${slug}`);
        return res.data;
    },
    getCategories: async () => {
        const res = await apiClient.get('/public-articles/categories');
        return res.data;
    },
    getRecent: async () => {
        const res = await apiClient.get('/public-articles/recent');
        return res.data;
    },
    toggleSave: async (articleId) => {
        const res = await apiClient.post(`/public-articles/${articleId}/toggle-save`);
        return res.data;
    },
    getSaved: async () => {
        const res = await apiClient.get('/public-articles/user/saved');
        return res.data;
    },
    create: async (data) => {
        const res = await apiClient.post('/public-articles', data);
        return res.data;
    },
    update: async (id, data) => {
        const res = await apiClient.put(`/public-articles/${id}`, data);
        return res.data;
    },
    delete: async (id) => {
        const res = await apiClient.delete(`/public-articles/${id}`);
        return res.data;
    }
};

export default publicArticleService;
