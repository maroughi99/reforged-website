const axios = require('axios');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
require('dotenv').config();

const Map = require('./server/models/Map');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/warcraft3-reforged', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const BASE_URL = 'https://wc3maps.com';

async function fetchMapsList(page = 1) {
  try {
    console.log(`📥 Fetching page ${page}...`);
    const response = await axios.get(`${BASE_URL}/maps?page=${page}`);
    const $ = cheerio.load(response.data);
    const maps = [];

    $('.map-item, .card, .map-card').each((i, elem) => {
      try {
        const $elem = $(elem);
        const title = $elem.find('.map-title, h3, .title').first().text().trim();
        const link = $elem.find('a').first().attr('href');
        const thumbnail = $elem.find('img').first().attr('src');
        const author = $elem.find('.author, .map-author').first().text().trim();
        const category = $elem.find('.category, .map-category').first().text().trim();

        if (title && link) {
          maps.push({
            title,
            link: link.startsWith('http') ? link : `${BASE_URL}${link}`,
            thumbnail: thumbnail?.startsWith('http') ? thumbnail : thumbnail ? `${BASE_URL}${thumbnail}` : null,
            author: author || 'Unknown',
            category: category || 'Other'
          });
        }
      } catch (err) {
        console.error('Error parsing map item:', err.message);
      }
    });

    return maps;
  } catch (error) {
    console.error(`Error fetching page ${page}:`, error.message);
    return [];
  }
}

async function saveMap(mapData) {
  try {
    const existing = await Map.findOne({ title: mapData.title });
    if (existing) {
      return false;
    }

    const newMap = new Map({
      title: mapData.title,
      author: mapData.author,
      category: mapData.category,
      thumbnail: mapData.thumbnail,
      downloadUrl: mapData.link,
      externalUrl: mapData.link,
      description: `${mapData.category} map by ${mapData.author}`,
      tags: [mapData.category.toLowerCase()]
    });

    await newMap.save();
    return true;
  } catch (error) {
    console.error('Error saving map:', error.message);
    return false;
  }
}

async function fetchAllMaps() {
  console.log('🗺️  Starting WC3 Maps Fetch...\n');
  let totalMaps = 0;
  let newMaps = 0;

  // Fetch first 10 pages
  for (let page = 1; page <= 10; page++) {
    const maps = await fetchMapsList(page);
    
    if (maps.length === 0) {
      console.log('No more maps found, stopping...');
      break;
    }

    console.log(`   Found ${maps.length} maps on page ${page}`);
    
    for (const map of maps) {
      const saved = await saveMap(map);
      if (saved) newMaps++;
      totalMaps++;
    }

    // Be nice to the server
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\n✅ Fetch complete!`);
  console.log(`📊 Processed ${totalMaps} maps`);
  console.log(`🆕 Added ${newMaps} new maps to database`);
  console.log(`💾 Total maps in database: ${await Map.countDocuments()}`);
}

mongoose.connection.once('open', async () => {
  console.log('✅ Connected to MongoDB\n');
  
  await fetchAllMaps();
  
  process.exit(0);
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});
