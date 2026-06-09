const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { protectRestaurant } = require('../middleware/authMiddleware');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Store in memory so we can compress with sharp before writing to disk
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

// @desc    Upload multiple images, compress, and save
// @route   POST /api/upload
// @access  Private/Restaurant
router.post('/', protectRestaurant, upload.array('images', 5), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'No image files provided' });
  }

  try {
    const urls = [];
    
    for (const file of req.files) {
      // Aggressive compression since we store as base64 in MongoDB
      // Target: ~20-40KB per image to keep DB lean
      const webpBuffer = await sharp(file.buffer)
        .resize({ width: 480, height: 480, fit: 'cover', withoutEnlargement: true })
        .webp({ quality: 55, effort: 6 }) 
        .toBuffer();
      
      console.log(`Compressed image: ${(file.size / 1024).toFixed(0)}KB → ${(webpBuffer.length / 1024).toFixed(0)}KB`);
      const base64Str = `data:image/webp;base64,${webpBuffer.toString('base64')}`;
      urls.push(base64Str);
    }

    res.status(201).json({ urls });
  } catch (error) {
    console.error('Image compression error:', error);
    res.status(500).json({ message: 'Failed to process images' });
  }
});

module.exports = router;
