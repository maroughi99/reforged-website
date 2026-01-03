const mongoose = require('mongoose');

const ReplySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: String,
  content: {
    type: String,
    required: true,
    maxlength: 500
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const CommentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: String,
  content: {
    type: String,
    required: true,
    maxlength: 500
  },
  replies: [ReplySchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const ClipSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false  // Not required for scraped content
  },
  authorName: {
    type: String,
    default: 'Community'
  },
  title: {
    type: String,
    required: [true, 'Clip title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  videoUrl: {
    type: String,
    required: true
  },
  isEmbedded: {
    type: Boolean,
    default: false  // true for YouTube/Twitch embeds, false for uploaded files
  },
  embedType: {
    type: String,
    enum: ['youtube', 'twitch', 'uploaded', null],
    default: null
  },
  thumbnail: {
    type: String
  },
  race: {
    type: String,
    enum: ['Human', 'Orc', 'Undead', 'NightElf', 'Random', 'All', null],
    default: null
  },
  tags: [{
    type: String,
    trim: true
  }],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [CommentSchema],
  views: {
    type: Number,
    default: 0
  },
  duration: {
    type: Number, // in seconds
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient querying
ClipSchema.index({ createdAt: -1 });
ClipSchema.index({ views: -1 });
ClipSchema.index({ likes: -1 });

module.exports = mongoose.model('Clip', ClipSchema);
