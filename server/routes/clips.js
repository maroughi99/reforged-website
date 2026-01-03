const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const Clip = require('../models/Clip');
const auth = require('../middleware/auth');

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/clips');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'clip-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp4|mov|avi|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only video files are allowed (mp4, mov, avi, webm)'));
    }
  }
});

// @route   GET /api/clips
// @desc    Get all clips
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10,
      sort = '-createdAt',
      race,
      author
    } = req.query;

    const query = {};
    if (race && race !== 'All') query.race = race;
    
    // Filter by author if provided
    if (author) {
      const User = require('../models/User');
      const user = await User.findOne({ username: new RegExp(`^${author}$`, 'i') });
      if (user) {
        query.author = user._id;
      } else {
        // Return empty array if author not found
        return res.json({
          success: true,
          data: [],
          pagination: { page: 1, limit: parseInt(limit), total: 0, pages: 0 }
        });
      }
    }

    const skip = (page - 1) * limit;

    const clips = await Clip.find(query)
      .populate('author', 'username avatar race isAdmin')
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Clip.countDocuments(query);

    res.json({
      success: true,
      data: clips,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get clips error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching clips' 
    });
  }
});

// @route   GET /api/clips/:id
// @desc    Get specific clip
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const clip = await Clip.findById(req.params.id)
      .populate('author', 'username avatar race isAdmin');

    if (!clip) {
      return res.status(404).json({ 
        success: false, 
        message: 'Clip not found' 
      });
    }

    // Increment views
    clip.views += 1;
    await clip.save();

    res.json({
      success: true,
      data: clip
    });
  } catch (error) {
    console.error('Get clip error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching clip' 
    });
  }
});

// @route   POST /api/clips
// @desc    Upload new clip
// @access  Private
router.post('/', [auth, upload.single('video')], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No video file uploaded' 
      });
    }

    const { title, description, race, tags } = req.body;

    if (!title || title.trim().length < 3) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title must be at least 3 characters' 
      });
    }

    const clip = new Clip({
      author: req.user._id,
      title: title.trim(),
      description: description?.trim() || '',
      videoUrl: `/uploads/clips/${req.file.filename}`,
      race: race || null,
      tags: tags ? JSON.parse(tags) : []
    });

    await clip.save();

    const populatedClip = await Clip.findById(clip._id)
      .populate('author', 'username avatar race isAdmin');

    res.status(201).json({
      success: true,
      data: populatedClip
    });
  } catch (error) {
    console.error('Upload clip error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error uploading clip' 
    });
  }
});

// @route   DELETE /api/clips/:id
// @desc    Delete clip
// @access  Private (Author or Admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const clip = await Clip.findById(req.params.id);

    if (!clip) {
      return res.status(404).json({ 
        success: false, 
        message: 'Clip not found' 
      });
    }

    // Check if user is the author or admin
    if (clip.author.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to delete this clip' 
      });
    }

    // Delete video file
    const videoPath = path.join(__dirname, '../..', clip.videoUrl);
    if (fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath);
    }

    await clip.deleteOne();

    res.json({
      success: true,
      message: 'Clip deleted successfully'
    });
  } catch (error) {
    console.error('Delete clip error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting clip' 
    });
  }
});

// @route   POST /api/clips/:id/like
// @desc    Like/Unlike clip
// @access  Private
router.post('/:id/like', auth, async (req, res) => {
  try {
    const clip = await Clip.findById(req.params.id);

    if (!clip) {
      return res.status(404).json({ 
        success: false, 
        message: 'Clip not found' 
      });
    }

    const likeIndex = clip.likes.indexOf(req.user._id);

    if (likeIndex > -1) {
      // Unlike
      clip.likes.splice(likeIndex, 1);
    } else {
      // Like
      clip.likes.push(req.user._id);
    }

    await clip.save();

    res.json({
      success: true,
      data: { likes: clip.likes.length, liked: likeIndex === -1 }
    });
  } catch (error) {
    console.error('Like clip error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error liking clip' 
    });
  }
});

// @route   POST /api/clips/:id/comment
// @desc    Add comment to clip
// @access  Private
router.post('/:id/comment', [
  auth,
  body('content').trim().isLength({ min: 1, max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const clip = await Clip.findById(req.params.id);

    if (!clip) {
      return res.status(404).json({ 
        success: false, 
        message: 'Clip not found' 
      });
    }

    const comment = {
      user: req.user._id,
      username: req.user.username,
      content: req.body.content
    };

    clip.comments.push(comment);

    await clip.save();

    res.json({
      success: true,
      data: clip
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error adding comment' 
    });
  }
});

// @route   POST /api/clips/:id/comment/:commentId/reply
// @desc    Add reply to a comment
// @access  Private
router.post('/:id/comment/:commentId/reply', [
  auth,
  body('content').trim().isLength({ min: 1, max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const clip = await Clip.findById(req.params.id);

    if (!clip) {
      return res.status(404).json({ 
        success: false, 
        message: 'Clip not found' 
      });
    }

    const comment = clip.comments.id(req.params.commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    const reply = {
      user: req.user._id,
      username: req.user.username,
      content: req.body.content
    };

    if (!comment.replies) {
      comment.replies = [];
    }

    comment.replies.push(reply);

    await clip.save();

    res.json({
      success: true,
      data: clip
    });
  } catch (error) {
    console.error('Add reply error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error adding reply' 
    });
  }
});

// @route   POST /api/clips/:id/view
// @desc    Increment clip view count
// @access  Public
router.post('/:id/view', async (req, res) => {
  try {
    const clip = await Clip.findById(req.params.id);

    if (!clip) {
      return res.status(404).json({ 
        success: false, 
        message: 'Clip not found' 
      });
    }

    clip.views += 1;
    await clip.save();

    res.json({
      success: true,
      views: clip.views
    });
  } catch (error) {
    console.error('Increment views error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error incrementing views' 
    });
  }
});

// @route   DELETE /api/clips/:id/comment/:commentId
// @desc    Delete comment from clip
// @access  Private (Comment author or Admin only)
router.delete('/:id/comment/:commentId', auth, async (req, res) => {
  try {
    const clip = await Clip.findById(req.params.id);

    if (!clip) {
      return res.status(404).json({ 
        success: false, 
        message: 'Clip not found' 
      });
    }

    const comment = clip.comments.id(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Comment not found' 
      });
    }

    // Check if user is the comment author or admin
    if (comment.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to delete this comment' 
      });
    }

    comment.deleteOne();
    await clip.save();

    // Populate author info before returning
    await clip.populate('author', 'username avatar race isAdmin');

    res.json({
      success: true,
      data: clip
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting comment' 
    });
  }
});

module.exports = router;
