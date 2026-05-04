import apiClient from './apiClient';

const uploadService = {
    // Upload profile picture
    uploadProfilePicture: async (file) => {
        const formData = new FormData();
        formData.append('profilePicture', file);

        const response = await apiClient.post('/upload/profile-picture', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            }
        });

        return response.data;
    },

    // Delete profile picture
    deleteProfilePicture: async (publicId) => {
        const response = await apiClient.delete('/upload/profile-picture', {
            data: { publicId }
        });

        return response.data;
    },

    // Upload course thumbnail
    uploadThumbnail: async (file) => {
        const formData = new FormData();
        formData.append('thumbnail', file);

        const response = await apiClient.post('/upload/thumbnail', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            }
        });

        return response.data;
    },

    // Delete course thumbnail
    deleteThumbnail: async (publicId) => {
        const response = await apiClient.delete('/upload/thumbnail', {
            data: { publicId }
        });

        return response.data;
    }
};

export default uploadService;
