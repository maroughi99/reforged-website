const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const MAX_RESULTS = 50; // YouTube API max per request
const TOTAL_VIDEOS = 2000; // Target total videos to fetch
const MAX_PAGES_PER_QUERY = 5; // Fetch up to 5 pages per search query

// Search queries for different types of WC3 content
const searchQueries = [
  'Warcraft 3 Reforged gameplay',
  'WC3 Reforged tournament',
  'Warcraft 3 1v1',
  'Grubby Warcraft 3',
  'Moon Warcraft 3',
  'Happy Warcraft 3',
  'WC3 pro matches',
  'Warcraft 3 highlights',
  'WC3 grand finals',
  'Warcraft 3 championship',
  'WC3 professional',
  'Lyn Warcraft 3',
  'Infi Warcraft 3',
  'TH000 Warcraft 3',
  'FoCuS Warcraft 3',
  'Sok Warcraft 3',
  'WC3Champions',
  'Back2Warcraft',
  'WGL Warcraft 3',
  'WC3 ESL',
  'Warcraft 3 Gold League',
  'WC3 tournament highlights',
  'Warcraft 3 pro gameplay',
  'WC3 finals match'
];

async function fetchYouTubeVideos(query, maxResults = 50, pageToken = null) {
  try {
    const params = {
      part: 'snippet',
      q: query,
      type: 'video',
      maxResults: maxResults,
      key: YOUTUBE_API_KEY,
      order: 'relevance',
      videoDuration: 'any'
    };
    
    if (pageToken) {
      params.pageToken = pageToken;
    }

    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', { params });

    return {
      items: response.data.items || [],
      nextPageToken: response.data.nextPageToken
    };
  } catch (error) {
    console.error(`Error fetching videos for "${query}":`, error.message);
    return { items: [], nextPageToken: null };
  }
}

// Fetch multiple pages for a single query
async function fetchAllPagesForQuery(query, maxPages = 5) {
  let allVideos = [];
  let pageToken = null;
  let pageCount = 0;
  
  while (pageCount < maxPages) {
    const result = await fetchYouTubeVideos(query, MAX_RESULTS, pageToken);
    allVideos = allVideos.concat(result.items);
    pageCount++;
    
    console.log(`   Page ${pageCount}: ${result.items.length} videos`);
    
    if (!result.nextPageToken) break;
    pageToken = result.nextPageToken;
    
    // Delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return allVideos;
}

async function autoFetchClips() {
  try {
    if (!YOUTUBE_API_KEY) {
      console.error('❌ YOUTUBE_API_KEY not found in .env file');
      console.log('💡 Get a free API key from: https://console.cloud.google.com/apis/credentials');
      console.log('   Then add to .env: YOUTUBE_API_KEY=your_api_key_here');
      process.exit(1);
    }

    console.log('🔍 Fetching Warcraft 3 videos from YouTube...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const Clip = require('./server/models/Clip');
    
    let allVideos = [];

    // Fetch videos for each search query with pagination
    for (const query of searchQueries) {
      console.log(`\n🔎 Searching: "${query}"`);
      const videos = await fetchAllPagesForQuery(query, MAX_PAGES_PER_QUERY);
      console.log(`   Total for this query: ${videos.length} videos`);
      allVideos = allVideos.concat(videos);
      
      // Stop if we've reached our target
      if (allVideos.length >= TOTAL_VIDEOS) {
        console.log(`\n🎯 Reached target of ${TOTAL_VIDEOS} videos`);
        break;
      }
    }

    // Remove duplicates
    const uniqueVideos = Array.from(new Map(
      allVideos.map(v => [v.id.videoId, v])
    ).values());

    console.log(`\n📊 Total unique videos found: ${uniqueVideos.length}`);

    // Convert to clip format
    const clips = uniqueVideos.map(video => {
      const snippet = video.snippet;
      
      return {
        title: snippet.title.substring(0, 100), // Limit to 100 chars
        description: snippet.description.substring(0, 500), // Limit to 500 chars
        videoUrl: `https://www.youtube.com/embed/${video.id.videoId}`,
        authorName: snippet.channelTitle,
        isEmbedded: true,
        embedType: 'youtube',
        thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
        race: 'Random', // Can't detect race from video
        tags: extractTags(snippet.title, snippet.description)
      };
    });

    // Insert into database
    console.log('\n💾 Adding clips to database...');
    const inserted = await Clip.insertMany(clips);
    console.log(`✅ Successfully added ${inserted.length} clips!`);

    // Show some stats
    console.log('\n📈 Stats:');
    const totalClips = await Clip.countDocuments();
    const embeddedClips = await Clip.countDocuments({ isEmbedded: true });
    console.log(`   Total clips in database: ${totalClips}`);
    console.log(`   Embedded clips: ${embeddedClips}`);
    console.log(`   User uploaded: ${totalClips - embeddedClips}`);

    mongoose.connection.close();
    console.log('\n👋 Done!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Extract relevant tags from title and description
function extractTags(title, description) {
  const tags = [];
  const text = `${title} ${description}`.toLowerCase();

  // Race tags
  if (text.includes('human')) tags.push('human');
  if (text.includes('orc')) tags.push('orc');
  if (text.includes('undead')) tags.push('undead');
  if (text.includes('night elf') || text.includes('nightelf') || text.includes('ne')) tags.push('nightelf');

  // Game mode tags
  if (text.includes('1v1')) tags.push('1v1');
  if (text.includes('2v2')) tags.push('2v2');
  if (text.includes('3v3')) tags.push('3v3');
  if (text.includes('4v4')) tags.push('4v4');
  if (text.includes('ffa')) tags.push('ffa');

  // Content type tags
  if (text.includes('tournament')) tags.push('tournament');
  if (text.includes('pro') || text.includes('professional')) tags.push('pro');
  if (text.includes('highlight')) tags.push('highlights');
  if (text.includes('tutorial')) tags.push('tutorial');
  if (text.includes('guide')) tags.push('guide');
  if (text.includes('strategy')) tags.push('strategy');
  if (text.includes('funny')) tags.push('funny');
  if (text.includes('epic')) tags.push('epic');

  // Default tag
  if (tags.length === 0) tags.push('gameplay');

  return tags;
}

autoFetchClips();
