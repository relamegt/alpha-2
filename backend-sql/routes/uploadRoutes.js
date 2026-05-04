const express = require('express');
const router = express.Router();
const { upload, uploadThumbnail, deleteImage } = require('../config/cloudinary');
const { verifyToken } = require('../middleware/auth');
const multer = require('multer');

// Helper to handle Multer upload and its errors
const uploadHandler = (multerMiddleware) => (req, res, next) => {
    multerMiddleware(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({
                success: false,
                message: `Multer Error: ${err.message}`
            });
        } else if (err) {
            // This catches Cloudinary/FileFilter errors
            return res.status(err.http_code || 400).json({
                success: false,
                message: err.message || 'File upload failed'
            });
        }
        
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }
        
        // Success
        res.json({
            success: true,
            message: 'File uploaded successfully',
            data: {
                url: req.file.path,
                publicId: req.file.filename
            }
        });
    });
};

// --- ROUTES ---

// Upload profile picture
router.post('/profile-picture', verifyToken, uploadHandler(upload.single('profilePicture')));

// Upload course thumbnail
router.post('/thumbnail', verifyToken, uploadHandler(uploadThumbnail.single('thumbnail')));

// Helper for deletion
const handleDelete = async (req, res) => {
    try {
        const { publicId } = req.body;
        if (!publicId) {
            return res.status(400).json({
                success: false,
                message: 'Public ID required'
            });
        }
        await deleteImage(publicId);
        res.json({
            success: true,
            message: 'Deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Delete failed',
            error: error.message
        });
    }
};

// Delete profile picture
router.delete('/profile-picture', verifyToken, handleDelete);

// Delete course thumbnail
router.delete('/thumbnail', verifyToken, handleDelete);

module.exports = router;
