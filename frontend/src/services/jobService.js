import apiClient from './apiClient';

const jobService = {
  getAllJobs: async () => {
    const response = await apiClient.get('/jobs');
    return response.data;
  },

  getJobById: async (jobId) => {
    const response = await apiClient.get(`/jobs/${jobId}`);
    return response.data;
  },

  searchJobs: async (term) => {
    const response = await apiClient.get(`/jobs/search?term=${term}`);
    return response.data;
  },

  // Admin methods
  batchStoreJobs: async (jobs) => {
    const response = await apiClient.post('/jobs/batch', { jobs });
    return response.data;
  },

  createJob: async (data) => {
    const response = await apiClient.post('/jobs', data);
    return response.data;
  },

  updateJob: async (id, data) => {
    const response = await apiClient.put(`/jobs/${id}`, data);
    return response.data;
  },

  deleteJob: async (jobId) => {
    const response = await apiClient.delete(`/jobs/${jobId}`);
    return response.data;
  }
};

export default jobService;
