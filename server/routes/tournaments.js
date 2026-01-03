const express = require('express');
const router = express.Router();
const Tournament = require('../models/Tournament');
const auth = require('../middleware/auth');

// @route   GET /api/tournaments
// @desc    Get all tournaments
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { status, upcoming } = req.query;
    let query = {};

    if (status) {
      query.status = status;
    }

    if (upcoming === 'true') {
      query.startDate = { $gte: new Date() };
    }

    const tournaments = await Tournament.find(query)
      .populate('organizer', 'username')
      .populate('winner', 'username')
      .populate('runnerUp', 'username')
      .sort({ startDate: -1 });

    res.json({
      success: true,
      data: tournaments
    });
  } catch (error) {
    console.error('Get tournaments error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching tournaments' 
    });
  }
});

// @route   GET /api/tournaments/:id
// @desc    Get specific tournament
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('organizer', 'username race')
      .populate('participants.userId', 'username race')
      .populate('winner', 'username race')
      .populate('runnerUp', 'username race');

    if (!tournament) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tournament not found' 
      });
    }

    res.json({
      success: true,
      data: tournament
    });
  } catch (error) {
    console.error('Get tournament error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching tournament' 
    });
  }
});

// @route   POST /api/tournaments
// @desc    Create a tournament
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const tournament = new Tournament({
      ...req.body,
      organizer: req.user.id
    });

    await tournament.save();

    const populatedTournament = await Tournament.findById(tournament._id)
      .populate('organizer', 'username race');

    res.status(201).json({
      success: true,
      data: populatedTournament
    });
  } catch (error) {
    console.error('Create tournament error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating tournament' 
    });
  }
});

// @route   POST /api/tournaments/:id/register
// @desc    Register for a tournament
// @access  Private
router.post('/:id/register', auth, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tournament not found' 
      });
    }

    // Check if registration is open
    if (tournament.status !== 'registration-open') {
      return res.status(400).json({ 
        success: false, 
        message: 'Registration is closed for this tournament' 
      });
    }

    // Check if deadline passed
    if (new Date() > tournament.registrationDeadline) {
      return res.status(400).json({ 
        success: false, 
        message: 'Registration deadline has passed' 
      });
    }

    // Check if tournament is full
    if (tournament.participants.length >= tournament.maxParticipants) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tournament is full' 
      });
    }

    // Check if already registered
    const alreadyRegistered = tournament.participants.some(
      p => p.userId.toString() === req.user.id
    );

    if (alreadyRegistered) {
      return res.status(400).json({ 
        success: false, 
        message: 'You are already registered for this tournament' 
      });
    }

    // Add participant
    tournament.participants.push({
      userId: req.user.id,
      username: req.user.username,
      race: req.body.race || req.user.race
    });

    await tournament.save();

    const updatedTournament = await Tournament.findById(tournament._id)
      .populate('organizer', 'username race')
      .populate('participants.userId', 'username race');

    res.json({
      success: true,
      data: updatedTournament,
      message: 'Successfully registered for tournament'
    });
  } catch (error) {
    console.error('Register tournament error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error registering for tournament' 
    });
  }
});

// @route   DELETE /api/tournaments/:id/unregister
// @desc    Unregister from a tournament
// @access  Private
router.delete('/:id/unregister', auth, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tournament not found' 
      });
    }

    // Check if tournament hasn't started
    if (tournament.status === 'in-progress' || tournament.status === 'completed') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot unregister from a tournament that has started' 
      });
    }

    // Remove participant
    tournament.participants = tournament.participants.filter(
      p => p.userId.toString() !== req.user.id
    );

    await tournament.save();

    res.json({
      success: true,
      message: 'Successfully unregistered from tournament'
    });
  } catch (error) {
    console.error('Unregister tournament error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error unregistering from tournament' 
    });
  }
});

// @route   POST /api/tournaments/:id/checkin
// @desc    Check in to a tournament
// @access  Private
router.post('/:id/checkin', auth, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tournament not found' 
      });
    }

    if (!tournament.checkInEnabled) {
      return res.status(400).json({ 
        success: false, 
        message: 'Check-in is not enabled for this tournament' 
      });
    }

    const participant = tournament.participants.find(
      p => p.userId.toString() === req.user.id
    );

    if (!participant) {
      return res.status(400).json({ 
        success: false, 
        message: 'You are not registered for this tournament' 
      });
    }

    participant.checkedIn = true;
    await tournament.save();

    res.json({
      success: true,
      message: 'Successfully checked in'
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error checking in' 
    });
  }
});

// @route   PUT /api/tournaments/:id
// @desc    Update tournament
// @access  Private (Organizer only)
router.put('/:id', auth, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tournament not found' 
      });
    }

    // Check if user is organizer
    if (tournament.organizer.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to update this tournament' 
      });
    }

    // Update fields
    const allowedUpdates = ['name', 'description', 'status', 'rules', 'prizePool', 
                           'streamUrl', 'discordUrl', 'checkInEnabled', 'checkInDeadline'];
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        tournament[field] = req.body[field];
      }
    });

    await tournament.save();

    const updatedTournament = await Tournament.findById(tournament._id)
      .populate('organizer', 'username race')
      .populate('participants.userId', 'username race');

    res.json({
      success: true,
      data: updatedTournament
    });
  } catch (error) {
    console.error('Update tournament error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating tournament' 
    });
  }
});

// @route   POST /api/tournaments/:id/start
// @desc    Start tournament and generate brackets
// @access  Private (Organizer only)
router.post('/:id/start', auth, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tournament not found' 
      });
    }

    if (tournament.organizer.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized' 
      });
    }

    if (tournament.participants.length < 2) {
      return res.status(400).json({ 
        success: false, 
        message: 'Need at least 2 participants to start' 
      });
    }

    // Generate brackets (single elimination)
    const participants = [...tournament.participants];
    
    // Shuffle participants for seeding
    for (let i = participants.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [participants[i], participants[j]] = [participants[j], participants[i]];
    }

    // Assign seeds
    participants.forEach((p, index) => {
      p.seed = index + 1;
    });

    // Generate first round matches
    const matches = [];
    let matchNumber = 1;
    
    for (let i = 0; i < participants.length; i += 2) {
      if (i + 1 < participants.length) {
        matches.push({
          round: 1,
          matchNumber: matchNumber++,
          player1: participants[i],
          player2: participants[i + 1],
          status: 'pending'
        });
      } else {
        // Bye - player advances automatically
        matches.push({
          round: 1,
          matchNumber: matchNumber++,
          player1: participants[i],
          player2: null,
          winner: participants[i].userId,
          status: 'completed'
        });
      }
    }

    tournament.matches = matches;
    tournament.status = 'in-progress';
    await tournament.save();

    const updatedTournament = await Tournament.findById(tournament._id)
      .populate('organizer', 'username race')
      .populate('participants.userId', 'username race');

    res.json({
      success: true,
      data: updatedTournament,
      message: 'Tournament started and brackets generated'
    });
  } catch (error) {
    console.error('Start tournament error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error starting tournament' 
    });
  }
});

// @route   PUT /api/tournaments/:id/matches/:matchId
// @desc    Update match result
// @access  Private (Organizer only)
router.put('/:id/matches/:matchId', auth, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tournament not found' 
      });
    }

    if (tournament.organizer.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized' 
      });
    }

    const match = tournament.matches.id(req.params.matchId);
    
    if (!match) {
      return res.status(404).json({ 
        success: false, 
        message: 'Match not found' 
      });
    }

    const { winnerId, score } = req.body;

    match.winner = winnerId;
    match.status = 'completed';
    match.completedAt = new Date();
    
    if (score) {
      match.score = score;
    }

    await tournament.save();

    res.json({
      success: true,
      data: tournament,
      message: 'Match result updated'
    });
  } catch (error) {
    console.error('Update match error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating match' 
    });
  }
});

// @route   DELETE /api/tournaments/:id
// @desc    Delete tournament
// @access  Private (Organizer only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tournament not found' 
      });
    }

    if (tournament.organizer.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized' 
      });
    }

    await tournament.deleteOne();

    res.json({
      success: true,
      message: 'Tournament deleted'
    });
  } catch (error) {
    console.error('Delete tournament error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting tournament' 
    });
  }
});

module.exports = router;
