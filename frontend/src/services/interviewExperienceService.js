import api from './apiClient';

const interviewExperienceService = {
  getAll: async (params) => {
    const response = await api.get('/interview-experiences', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/interview-experiences/${id}`);
    return response.data;
  },

  getPopularCompanies: async () => {
    const response = await api.get('/interview-experiences/meta/popular-companies');
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/interview-experiences', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/interview-experiences/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/interview-experiences/${id}`);
    return response.data;
  },

  upvote: async (id) => {
    const response = await api.post(`/interview-experiences/${id}/upvote`);
    return response.data;
  }
};

export default interviewExperienceService;
