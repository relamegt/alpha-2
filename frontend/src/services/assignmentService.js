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
  }
};

export default assignmentService;
