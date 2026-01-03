const express = require('express');
const router = express.Router();
const Ladder = require('../models/Ladder');
const auth = require('../middleware/auth');
const { getLadderData, getHighestRankData, isWC3Connected, refreshLeaderboard, requestProfile, profileRequests } = require('../services/wc3WebSocket');

// @route   GET /api/ladder
// @desc    Get all ladder rankings
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { race, league, playerType, season, gameMode, page } = req.query;
    
    console.log('Ladder request params:', req.query);
    
    // Map game mode
    const gameModeMap = {
      '1v1': ['1v1'],
      '2v2': ['2v2'],
      '2v2 Arranged': ['2v2arranged'],
      '3v3': ['3v3'],
      '3v3 Arranged': ['3v3arranged'],
      '4v4': ['4v4'],
      '4v4 Arranged': ['4v4arranged'],
      'FFA': ['ffa', 'sffa']
    };
    const gameModes = gameModeMap[gameMode] || ['1v1'];
    
    // Get live data from WC3 WebSocket - combine all variants
    let liveData = [];
    gameModes.forEach(mode => {
      const modeData = getLadderData(mode);
      if (Array.isArray(modeData) && modeData.length > 0) {
        liveData = [...liveData, ...modeData];
      }
    });
    console.log(`🔍 DEBUG: Combined data for ${gameMode}: ${liveData.length} items from modes [${gameModes.join(', ')}]`);
    let filteredData = liveData || [];
    
    // Check WebSocket connection status but don't fail immediately
    const wc3Connected = isWC3Connected();
    if (!wc3Connected) {
      console.log('⚠️ WC3 not connected - attempting to use cached data');
    }
    
    // If no live data and not connected, try to get cached data from database
    if (filteredData.length === 0) {
      console.log('⚠️ No live data available, checking database for cached rankings...');
      try {
        const dbQuery = {};
        if (gameMode && gameMode !== 'All') dbQuery.gameMode = gameModes[0];
        if (race && race !== 'All Races') dbQuery.race = new RegExp(race, 'i');
        
        const cachedRankings = await Ladder.find(dbQuery)
          .sort({ mmr: -1, rating: -1 })
          .limit(100)
          .lean();
        
        if (cachedRankings.length > 0) {
          console.log(`✅ Found ${cachedRankings.length} cached rankings from database`);
          filteredData = cachedRankings.map((r, index) => ({
            rank: index + 1,
            battleTag: r.battleTag || 'Unknown',
            name: r.name || r.battleTag || 'Unknown Player',
            race: r.race || 'Random',
            league: r.league || 'Unranked',
            division: r.division || 0,
            mmr: r.mmr || r.rating || 0,
            wins: r.wins || 0,
            losses: r.losses || 0,
            winRate: r.wins > 0 ? ((r.wins / (r.wins + r.losses)) * 100).toFixed(1) : '0.0',
            gameMode: r.gameMode || gameModes[0]
          }));
        } else {
          console.log('⚠️ No cached data available in database');
          return res.json({
            success: true,
            message: wc3Connected ? 'Waiting for leaderboard data from WC3...' : 'WC3 not connected and no cached data available',
            data: [],
            pagination: {
              page: 1,
              limit: 25,
              total: 0,
              pages: 0
            }
          });
        }
      } catch (dbError) {
        console.error('Database error:', dbError);
        return res.json({
          success: false,
          message: 'Unable to retrieve ladder data',
          data: [],
          pagination: {
            page: 1,
            limit: 25,
            total: 0,
            pages: 0
          }
        });
      }
    } else {
      console.log(`✅ Using live WC3 data: ${filteredData.length} players`);
    }
    
    // Filter by race if specified and not "All Races"
    if (race && race !== 'all' && race !== 'All Races') {
      const normalizedRace = race.toLowerCase().replace(/\s+/g, '');
      filteredData = filteredData.filter(player => {
        const playerRace = player.race.toLowerCase().replace(/\s+/g, '');
        return playerRace === normalizedRace;
      });
    }
    
    // Filter by league if specified and not "all"
    if (league && league !== 'all') {
      filteredData = filteredData.filter(player => player.league.toLowerCase() === league.toLowerCase());
    }

    // Pagination
    const limit = 25;
    const currentPage = parseInt(page) || 1;
    const totalPages = Math.ceil(filteredData.length / limit);
    const startIndex = (currentPage - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    console.log(`Returning page ${currentPage}/${totalPages}: ${paginatedData.length} players (${filteredData.length} total)`);

    res.json({
      success: true,
      data: paginatedData,
      pagination: {
        page: currentPage,
        limit: limit,
        total: filteredData.length,
        pages: totalPages
      }
    });
  } catch (error) {
    console.error('Get ladder error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching ladder rankings' 
    });
  }
});

// @route   GET /api/ladder/search
// @desc    Search ladder by battle tag or username
// @access  Public
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ 
        success: false, 
        message: 'Search query required' 
      });
    }

    const results = mockLadderData.filter(player => 
      player.battleTag.toLowerCase().includes(query.toLowerCase())
    );

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Search ladder error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error searching ladder' 
    });
  }
});

// @route   GET /api/ladder/profile
// @desc    Get player profile from WC3
// @access  Public
router.get('/profile', async (req, res) => {
  try {
    const { battleTag } = req.query;
    
    if (!battleTag) {
      return res.status(400).json({
        success: false,
        message: 'Battle tag required'
      });
    }
    
    if (!isWC3Connected()) {
      return res.status(503).json({
        success: false,
        message: 'WC3 not connected. Please ensure Warcraft 3 is running.'
      });
    }
    
    console.log(`📊 Profile request for: ${battleTag}`);
    
    // Check if there's already a pending request
    if (profileRequests.has(battleTag)) {
      console.log(`⚠️ Profile request already pending for: ${battleTag}`);
      return res.status(429).json({
        success: false,
        message: 'Profile request already in progress'
      });
    }
    
    // Create promise that will be resolved when profile data arrives
    const profilePromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        profileRequests.delete(battleTag);
        console.log(`⏱️ Profile request timed out for ${battleTag} - using fallback data`);
        
        // Generate mock profile data from ladder data as fallback
        const ladderData = getLadderData();
        const allPlayers = Object.values(ladderData).flat();
        const player = allPlayers.find(p => p.battleTag.toLowerCase() === battleTag.toLowerCase());
        
        if (player) {
          console.log(`📊 Using ladder data as fallback for ${battleTag}`);
          const mockProfile = {
            battle_tag_full: battleTag,
            seasons: [{
              season: 7,
              races: [{
                race: player.race === 'human' ? 1 : player.race === 'orc' ? 2 : player.race === 'undead' ? 8 : 4,
                stats: [
                  { statName: 'wins', sum: player.wins || 0 },
                  { statName: 'losses', sum: player.losses || 0 },
                  { statName: 'win_loss_ratio', sum: player.winRate ? player.winRate / 100 : 0 }
                ]
              }]
            }],
            matchStats: {}
          };
          resolve(mockProfile);
        } else {
          reject(new Error('Player not found in ladder data. WC3 did not respond to profile request.'));
        }
      }, 5000); // Reduced timeout to 5 seconds for faster fallback
      
      profileRequests.set(battleTag, { resolve, reject, timeout });
    });
    
    // Request profile from WC3 WebSocket
    try {
      requestProfile(battleTag);
    } catch (wsError) {
      profileRequests.delete(battleTag);
      throw new Error(`Failed to send profile request: ${wsError.message}. Make sure WC3 is running.`);
    }
    
    // Wait for profile data
    const profileData = await profilePromise;
    
    console.log(`✅ Profile data retrieved for: ${battleTag}`);
    
    res.json({
      success: true,
      data: profileData
    });
    
  } catch (error) {
    console.error('Get profile error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching player profile'
    });
  }
});

// @route   GET /api/ladder/:id
// @desc    Get specific player ranking
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const ranking = await Ladder.findById(req.params.id)
      .populate('user', 'username avatar race');

    if (!ranking) {
      return res.status(404).json({ 
        success: false, 
        message: 'Player ranking not found' 
      });
    }

    res.json({
      success: true,
      data: ranking
    });
  } catch (error) {
    console.error('Get ranking error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching player ranking' 
    });
  }
});

// @route   POST /api/ladder
// @desc    Add or update player ranking
// @access  Private (Admin only in production)
router.post('/', auth, async (req, res) => {
  try {
    const { battleTag, race, wins, losses, mmr, league, division, season } = req.body;

    // Check if ranking exists for this user in this season
    let ranking = await Ladder.findOne({ 
      user: req.user._id, 
      season: season || 'Season 1' 
    });

    if (ranking) {
      // Update existing ranking
      ranking.battleTag = battleTag || ranking.battleTag;
      ranking.race = race || ranking.race;
      ranking.wins = wins !== undefined ? wins : ranking.wins;
      ranking.losses = losses !== undefined ? losses : ranking.losses;
      ranking.mmr = mmr || ranking.mmr;
      ranking.league = league || ranking.league;
      ranking.division = division || ranking.division;
      ranking.lastPlayed = Date.now();
    } else {
      // Create new ranking
      ranking = new Ladder({
        user: req.user._id,
        battleTag: battleTag || req.user.battleTag || req.user.username,
        race: race || req.user.race || 'Random',
        wins: wins || 0,
        losses: losses || 0,
        mmr: mmr || 1500,
        league: league || 'Bronze',
        division: division || 5,
        season: season || 'Season 1',
        rank: 0 // Will be calculated
      });
    }

    await ranking.save();

    // Recalculate ranks for the season
    await recalculateRanks(ranking.season);

    const updatedRanking = await Ladder.findById(ranking._id)
      .populate('user', 'username avatar');

    res.json({
      success: true,
      data: updatedRanking
    });
  } catch (error) {
    console.error('Add/Update ranking error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error adding/updating ranking' 
    });
  }
});

// @route   DELETE /api/ladder/:id
// @desc    Delete player ranking
// @access  Private (Admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const ranking = await Ladder.findById(req.params.id);

    if (!ranking) {
      return res.status(404).json({ 
        success: false, 
        message: 'Ranking not found' 
      });
    }

    // Check if user owns this ranking or is admin
    if (ranking.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to delete this ranking' 
      });
    }

    await ranking.deleteOne();

    res.json({
      success: true,
      message: 'Ranking deleted successfully'
    });
  } catch (error) {
    console.error('Delete ranking error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting ranking' 
    });
  }
});

// Helper function to recalculate ranks
async function recalculateRanks(season) {
  const rankings = await Ladder.find({ season }).sort({ mmr: -1 });
  
  for (let i = 0; i < rankings.length; i++) {
    rankings[i].rank = i + 1;
    await rankings[i].save();
  }
}

// @route   GET /api/ladder/wc3/status
// @desc    Check WC3 WebSocket connection status
// @access  Public
router.get('/wc3/status', (req, res) => {
  res.json({
    success: true,
    connected: isWC3Connected(),
    dataAvailable: getLadderData().length > 0,
    playerCount: getLadderData().length,
    highestRank: getHighestRankData()
  });
});

// @route   POST /api/ladder/wc3/refresh
// @desc    Manually refresh leaderboard data from WC3
// @access  Public
router.post('/wc3/refresh', (req, res) => {
  try {
    if (!isWC3Connected()) {
      return res.status(503).json({
        success: false,
        message: 'WC3 WebSocket not connected'
      });
    }
    
    refreshLeaderboard();
    
    res.json({
      success: true,
      message: 'Leaderboard refresh requested'
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Error refreshing leaderboard'
    });
  }
});

module.exports = router;
