const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const Clip = require('../models/Clip');
const Post = require('../models/Post');
const auth = require('../middleware/auth');

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/avatars');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
  }
});

// @route   PUT /api/users/avatar
// @desc    Upload user avatar
// @access  Private
router.put('/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image'
      });
    }

    const user = await User.findById(req.user.id);
    
    // Delete old avatar if it's not the default
    if (user.avatar && user.avatar !== 'default-avatar.jpg') {
      const oldAvatarPath = path.join(__dirname, '../../uploads/avatars', user.avatar);
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    // Update user avatar
    user.avatar = req.file.filename;
    await user.save();

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      avatar: user.avatar
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading avatar'
    });
  }
});

// @route   GET /api/users/profile/:username
// @desc    Get user profile by username
// @access  Public
router.get('/profile/:username', async (req, res) => {
  try {
    const searchUsername = req.params.username.trim();
    console.log('🔍 Searching for username:', searchUsername);
    
    // Try exact match first
    let user = await User.findOne({ 
      username: searchUsername
    }).select('-password -email');

    console.log('📌 Exact match result:', user ? user.username : 'null');

    // If not found, try case-insensitive
    if (!user) {
      user = await User.findOne({ 
        username: { $regex: new RegExp(`^${searchUsername}$`, 'i') }
      }).select('-password -email');
      console.log('📌 Case-insensitive match result:', user ? user.username : 'null');
    }

    if (!user) {
      // Show all usernames for debugging
      const allUsers = await User.find().select('username');
      console.log('📋 All users in DB:', allUsers.map(u => u.username));
      
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's clips count
    const clipsCount = await Clip.countDocuments({ author: user._id });
    
    // Get user's posts count
    const postsCount = await Post.countDocuments({ author: user._id });

    // Get friends count (will be implemented with friend system)
    const friendsCount = user.friends ? user.friends.length : 0;

    res.json({
      success: true,
      data: {
        username: user.username,
        race: user.race,
        avatar: user.avatar,
        isAdmin: user.isAdmin,
        battleTag: user.battleTag,
        clipsCount,
        postsCount,
        friendsCount
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile'
    });
  }
});

module.exports = router;
