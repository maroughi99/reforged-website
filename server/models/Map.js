const mongoose = require('mongoose');

const MapSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  author: {
    type: String,
    default: 'Unknown'
  },
  category: {
    type: String,
    enum: ['AoS', 'TD', 'Hero Arena', 'RPG', 'Defense', 'Melee', 'Survival', 'Mini Game', 'Other'],
    default: 'Other'
  },
  version: {
    type: String,
    default: '1.0'
  },
  players: {
    type: String,
    default: '1-12'
  },
  size: {
    type: String,
    default: 'Unknown'
  },
  thumbnail: {
    type: String,
    default: null
  },
  downloadUrl: {
    type: String,
    required: true
  },
  externalUrl: {
    type: String,
    default: null
  },
  downloads: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String,
    trim: true
  }],
  featured: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

MapSchema.index({ title: 'text', description: 'text', author: 'text' });

module.exports = mongoose.model('Map', MapSchema);
