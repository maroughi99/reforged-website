const mongoose = require('mongoose');

const LadderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  battleTag: {
    type: String,
    required: [true, 'Battle Tag is required'],
    trim: true
  },
  rank: {
    type: Number,
    required: true
  },
  race: {
    type: String,
    required: true,
    enum: ['Human', 'Orc', 'Undead', 'NightElf', 'Random']
  },
  wins: {
    type: Number,
    default: 0,
    min: 0
  },
  losses: {
    type: Number,
    default: 0,
    min: 0
  },
  mmr: {
    type: Number,
    required: true,
    default: 1500
  },
  league: {
    type: String,
    enum: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster'],
    default: 'Bronze'
  },
  division: {
    type: Number,
    min: 1,
    max: 5,
    default: 5
  },
  winRate: {
    type: Number,
    default: 0
  },
  gamesPlayed: {
    type: Number,
    default: 0
  },
  season: {
    type: String,
    default: 'Season 1'
  },
  lastPlayed: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Calculate win rate before saving
LadderSchema.pre('save', function(next) {
  this.gamesPlayed = this.wins + this.losses;
  this.winRate = this.gamesPlayed > 0 
    ? Math.round((this.wins / this.gamesPlayed) * 100) 
    : 0;
  this.updatedAt = Date.now();
  next();
});

// Index for efficient querying
LadderSchema.index({ mmr: -1, rank: 1 });
LadderSchema.index({ season: 1, mmr: -1 });

module.exports = mongoose.model('Ladder', LadderSchema);
