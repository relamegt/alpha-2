import apiClient from './apiClient';

const announcementService = {
  getAnnouncements: async () => {
    const response = await apiClient.get('/announcements');
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await apiClient.get('/announcements/unread-count');
    return response.data;
  },

  markAsRead: async (id) => {
    const response = await apiClient.post(`/announcements/mark-as-read/${id}`);
    return response.data;
  },

  // Admin methods
  createAnnouncement: async (data) => {
    const response = await apiClient.post('/announcements', data);
    return response.data;
  },

  updateAnnouncement: async (id, data) => {
    const response = await apiClient.put(`/announcements/${id}`, data);
    return response.data;
  },

  deleteAnnouncement: async (id) => {
    const response = await apiClient.delete(`/announcements/${id}`);
    return response.data;
  }
};

export default announcementService;
