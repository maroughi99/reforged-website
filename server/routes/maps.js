const express = require('express');
const router = express.Router();
const Map = require('../models/Map');
const auth = require('../middleware/auth');

// @route   GET /api/maps
// @desc    Get all maps
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 24,
      sort = '-downloads',
      category,
      search
    } = req.query;

    const query = {};
    
    if (category && category !== 'All') {
      query.category = category;
    }

    if (search) {
      query.$text = { $search: search };
    }

    const skip = (page - 1) * limit;

    const maps = await Map.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Map.countDocuments(query);

    res.json({
      success: true,
      data: maps,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get maps error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching maps' 
    });
  }
});

// @route   GET /api/maps/:id
// @desc    Get specific map
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const map = await Map.findById(req.params.id);

    if (!map) {
      return res.status(404).json({ 
        success: false, 
        message: 'Map not found' 
      });
    }

    res.json({
      success: true,
      data: map
    });
  } catch (error) {
    console.error('Get map error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching map' 
    });
  }
});

// @route   POST /api/maps/:id/download
// @desc    Increment download count
// @access  Public
router.post('/:id/download', async (req, res) => {
  try {
    const map = await Map.findById(req.params.id);

    if (!map) {
      return res.status(404).json({ 
        success: false, 
        message: 'Map not found' 
      });
    }

    map.downloads += 1;
    await map.save();

    res.json({
      success: true,
      data: map
    });
  } catch (error) {
    console.error('Download map error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error recording download' 
    });
  }
});

module.exports = router;
