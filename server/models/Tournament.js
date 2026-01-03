const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  race: String,
  seed: Number,
  checkedIn: {
    type: Boolean,
    default: false
  },
  registeredAt: {
    type: Date,
    default: Date.now
  }
});

const matchSchema = new mongoose.Schema({
  round: {
    type: Number,
    required: true
  },
  matchNumber: {
    type: Number,
    required: true
  },
  player1: {
    type: participantSchema,
    default: null
  },
  player2: {
    type: participantSchema,
    default: null
  },
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  score: {
    player1Score: { type: Number, default: 0 },
    player2Score: { type: Number, default: 0 }
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed'],
    default: 'pending'
  },
  scheduledTime: Date,
  completedAt: Date
});

const tournamentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: Date,
  registrationDeadline: {
    type: Date,
    required: true
  },
  maxParticipants: {
    type: Number,
    required: true,
    default: 32
  },
  format: {
    type: String,
    enum: ['single-elimination', 'double-elimination', 'round-robin', 'swiss'],
    default: 'single-elimination'
  },
  game: {
    type: String,
    enum: ['1v1', '2v2', '3v3', '4v4', 'FFA'],
    default: '1v1'
  },
  status: {
    type: String,
    enum: ['upcoming', 'registration-open', 'registration-closed', 'in-progress', 'completed', 'cancelled'],
    default: 'registration-open'
  },
  participants: [participantSchema],
  matches: [matchSchema],
  rules: {
    type: String,
    default: ''
  },
  prizePool: {
    type: String,
    default: ''
  },
  streamUrl: String,
  discordUrl: String,
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  runnerUp: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  checkInEnabled: {
    type: Boolean,
    default: false
  },
  checkInDeadline: Date
}, {
  timestamps: true
});

// Index for efficient queries
tournamentSchema.index({ status: 1, startDate: -1 });
tournamentSchema.index({ organizer: 1 });

// Virtual for current participant count
tournamentSchema.virtual('participantCount').get(function() {
  return this.participants.length;
});

// Virtual for spots remaining
tournamentSchema.virtual('spotsRemaining').get(function() {
  return this.maxParticipants - this.participants.length;
});

// Virtual for registration status
tournamentSchema.virtual('canRegister').get(function() {
  return this.status === 'registration-open' && 
         this.participants.length < this.maxParticipants &&
         new Date() < this.registrationDeadline;
});

tournamentSchema.set('toJSON', { virtuals: true });
tournamentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Tournament', tournamentSchema);
