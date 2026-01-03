const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// @route   POST /api/friends/request
// @desc    Send friend request
// @access  Private
router.post('/request', auth, async (req, res) => {
  try {
    const { recipientUsername } = req.body;

    // Find recipient
    const recipient = await User.findOne({ username: recipientUsername });
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Can't friend yourself
    if (recipient._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot send a friend request to yourself'
      });
    }

    // Check if already friends
    if (recipient.friends.includes(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: 'You are already friends'
      });
    }

    // Check if request already sent
    const existingRequest = recipient.friendRequests.find(
      req => req.from.toString() === req.user._id.toString()
    );

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'Friend request already sent'
      });
    }

    // Add friend request
    recipient.friendRequests.push({
      from: req.user._id,
      createdAt: new Date()
    });

    await recipient.save();

    res.json({
      success: true,
      message: 'Friend request sent'
    });
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending friend request'
    });
  }
});

// @route   POST /api/friends/accept/:requestId
// @desc    Accept friend request
// @access  Private
router.post('/accept/:requestId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Find the friend request
    const requestIndex = user.friendRequests.findIndex(
      req => req._id.toString() === req.params.requestId
    );

    if (requestIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Friend request not found'
      });
    }

    const request = user.friendRequests[requestIndex];
    const friendId = request.from;

    // Add each other as friends
    user.friends.push(friendId);
    user.friendRequests.splice(requestIndex, 1);
    await user.save();

    const friend = await User.findById(friendId);
    friend.friends.push(user._id);
    await friend.save();

    res.json({
      success: true,
      message: 'Friend request accepted'
    });
  } catch (error) {
    console.error('Accept friend request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error accepting friend request'
    });
  }
});

// @route   DELETE /api/friends/reject/:requestId
// @desc    Reject friend request
// @access  Private
router.delete('/reject/:requestId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    const requestIndex = user.friendRequests.findIndex(
      req => req._id.toString() === req.params.requestId
    );

    if (requestIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Friend request not found'
      });
    }

    user.friendRequests.splice(requestIndex, 1);
    await user.save();

    res.json({
      success: true,
      message: 'Friend request rejected'
    });
  } catch (error) {
    console.error('Reject friend request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting friend request'
    });
  }
});

// @route   GET /api/friends
// @desc    Get user's friends list
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('friends', 'username avatar race isAdmin');

    res.json({
      success: true,
      data: user.friends
    });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching friends'
    });
  }
});

// @route   GET /api/friends/requests
// @desc    Get pending friend requests
// @access  Private
router.get('/requests', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('friendRequests.from', 'username avatar race');

    res.json({
      success: true,
      data: user.friendRequests
    });
  } catch (error) {
    console.error('Get friend requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching friend requests'
    });
  }
});

// @route   DELETE /api/friends/:friendId
// @desc    Remove friend
// @access  Private
router.delete('/:friendId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const friend = await User.findById(req.params.friendId);

    if (!friend) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Remove from both users' friend lists
    user.friends = user.friends.filter(id => id.toString() !== friend._id.toString());
    friend.friends = friend.friends.filter(id => id.toString() !== user._id.toString());

    await user.save();
    await friend.save();

    res.json({
      success: true,
      message: 'Friend removed'
    });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing friend'
    });
  }
});

module.exports = router;
