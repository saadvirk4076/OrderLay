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
      const filename = `img_${Date.now()}_${Math.round(Math.random() * 1E9)}.webp`;
      const outputPath = path.join(uploadDir, filename);

      const webpBuffer = await sharp(file.buffer)
        .resize({ width: 800, height: 800, fit: 'cover', withoutEnlargement: true }) // Force square crop
        .webp({ quality: 80 }) 
        .toBuffer();
      
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
