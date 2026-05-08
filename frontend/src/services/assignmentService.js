import apiClient from './apiClient';

const assignmentService = {
  getAllAssignments: async () => {
    const response = await apiClient.get('/assignments');
    return response.data;
  },
  getAssignmentById: async (id) => {
    const response = await apiClient.get(`/assignments/${id}`);
    return response.data;
  },
  publishToGithub: async (id, data) => {
    const response = await apiClient.post(`/assignments/${id}/publish-github`, data);
    return response.data;
  },
  create: async (data) => {
    const response = await apiClient.post('/assignments', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await apiClient.patch(`/assignments/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await apiClient.delete(`/assignments/${id}`);
    return response.data;
  },
  bulkDelete: async (ids) => {
    const response = await apiClient.delete('/assignments/bulk', { data: { ids } });
    return response.data;
  }
};

export default assignmentService;
