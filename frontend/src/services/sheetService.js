import apiClient from './apiClient';

const sheetService = {
  getAllSheets: async () => {
    const response = await apiClient.get('/sheets');
    return response.data;
  },

  getSheetById: async (sheetId) => {
    const response = await apiClient.get(`/sheets/${sheetId}`);
    return response.data;
  },

  getSheetProblemById: async (problemId) => {
    const response = await apiClient.get(`/sheets/problems/${problemId}`);
    return response.data;
  },

  getUserSheetProgress: async (sheetId) => {
    const response = await apiClient.get(`/sheets/${sheetId}/progress`);
    return response.data;
  },

  toggleCompletion: async (data) => {
    const response = await apiClient.post('/sheets/progress/toggle-completion', data);
    return response.data;
  },

  toggleRevision: async (data) => {
    const response = await apiClient.post('/sheets/progress/toggle-revision', data);
    return response.data;
  },

  getUserStats: async () => {
    const response = await apiClient.get('/sheets/user/stats');
    return response.data;
  },

  // Admin methods
  createSheet: async (data) => {
    const response = await apiClient.post('/sheets', data);
    return response.data;
  },

  updateSheet: async (sheetId, data) => {
    const response = await apiClient.put(`/sheets/${sheetId}`, data);
    return response.data;
  },

  deleteSheet: async (sheetId) => {
    const response = await apiClient.delete(`/sheets/${sheetId}`);
    return response.data;
  },

  addSection: async (sheetId, data) => {
    const response = await apiClient.post(`/sheets/${sheetId}/sections`, data);
    return response.data;
  },

  updateSection: async (sectionId, data) => {
    const response = await apiClient.put(`/sheets/sections/${sectionId}`, data);
    return response.data;
  },

  deleteSection: async (sectionId) => {
    const response = await apiClient.delete(`/sheets/sections/${sectionId}`);
    return response.data;
  },

  addSubsection: async (sectionId, data) => {
    const response = await apiClient.post(`/sheets/sections/${sectionId}/subsections`, data);
    return response.data;
  },

  updateSubsection: async (subsectionId, data) => {
    const response = await apiClient.put(`/sheets/subsections/${subsectionId}`, data);
    return response.data;
  },

  deleteSubsection: async (subsectionId) => {
    const response = await apiClient.delete(`/sheets/subsections/${subsectionId}`);
    return response.data;
  },

  // SheetProblem Management
  createProblemInSubsection: async (subsectionId, data) => {
    const response = await apiClient.post(`/sheets/subsections/${subsectionId}/problems/create`, data);
    return response.data;
  },

  updateSheetProblem: async (problemId, data) => {
    const response = await apiClient.put(`/sheets/problems/${problemId}`, data);
    return response.data;
  },

  addProblemToSubsection: async (subsectionId, problemId) => {
    const response = await apiClient.post(`/sheets/subsections/${subsectionId}/problems`, { problemId });
    return response.data;
  },

  removeProblemFromSubsection: async (problemId) => {
    const response = await apiClient.delete(`/sheets/problems/${problemId}/unlink`);
    return response.data;
  },

  deleteSheetProblem: async (problemId) => {
    const response = await apiClient.delete(`/sheets/problems/${problemId}`);
    return response.data;
  },

  searchProblems: async (params) => {
    const response = await apiClient.get('/sheets/problems/search', { params });
    return response.data;
  },

  getBatchProblems: async (ids) => {
    const response = await apiClient.post('/sheets/problems/batch', { ids });
    return response.data;
  }
};

export default sheetService;
