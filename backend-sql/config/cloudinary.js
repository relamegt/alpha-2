const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Helper for consistent storage params
const createStorage = (folder, width, height) => new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        return {
            folder: folder,
            resource_type: 'image',
            allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'gif'],
            transformation: [{ width, height, crop: 'limit' }],
            public_id: `${folder.split('/').pop()}-${Date.now()}`
        };
    }
});

const profileStorage = createStorage('alphaknowledge/profile-pictures', 500, 500);
const thumbnailStorage = createStorage('alphaknowledge/thumbnails', 800, 450);

const imageFilter = (req, file, cb) => {
    if (file && file.mimetype && file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

const upload = multer({
    storage: profileStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: imageFilter
});

const uploadThumbnail = multer({
    storage: thumbnailStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: imageFilter
});

const deleteImage = async (publicId) => {
    try {
        if (!publicId) return null;
        return await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.error('Cloudinary delete error:', error);
        throw error;
    }
};

const extractPublicId = (url) => {
    if (!url) return null;
    try {
        const parts = url.split('/');
        const uploadIndex = parts.indexOf('upload');
        if (uploadIndex === -1) return null;
        const pathParts = parts.slice(uploadIndex + 2);
        return pathParts.join('/').replace(/\.[^/.]+$/, '');
    } catch (e) {
        return null;
    }
};

module.exports = {
    cloudinary,
    upload,
    uploadThumbnail,
    deleteImage,
    extractPublicId
};
