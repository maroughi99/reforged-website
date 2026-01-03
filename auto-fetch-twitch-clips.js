const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
const MAX_CLIPS = 1000; // Target number of clips to fetch

// Popular WC3 streamers and categories
const wc3Channels = [
  'Grubby',
  'Back2Warcraft',
  'WC3Champions',
  'moon_elf',
  'happy_wc3',
  'ToD',
  'Infi_wc3',
  'lyn_wc3',
  'focus_wc3',
  'sok_wc3'
];

// Get Twitch OAuth token
async function getTwitchToken() {
  try {
    const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
      params: {
        client_id: TWITCH_CLIENT_ID,
        client_secret: TWITCH_CLIENT_SECRET,
        grant_type: 'client_credentials'
      }
    });
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting Twitch token:', error.message);
    throw error;
  }
}

// Fetch clips for a specific channel
async function fetchChannelClips(channelName, token, limit = 100) {
  try {
    // First, get the user ID
    const userResponse = await axios.get('https://api.twitch.tv/helix/users', {
      params: { login: channelName },
      headers: {
        'Client-ID': TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${token}`
      }
    });

    if (!userResponse.data.data || userResponse.data.data.length === 0) {
      console.log(`   Channel not found: ${channelName}`);
      return [];
    }

    const broadcasterId = userResponse.data.data[0].id;

    // Get clips for this broadcaster
    const clipsResponse = await axios.get('https://api.twitch.tv/helix/clips', {
      params: {
        broadcaster_id: broadcasterId,
        first: Math.min(limit, 100)
      },
      headers: {
        'Client-ID': TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${token}`
      }
    });

    return clipsResponse.data.data || [];
  } catch (error) {
    console.error(`Error fetching clips for ${channelName}:`, error.message);
    return [];
  }
}

// Fetch top Warcraft 3 clips by game
async function fetchGameClips(token, limit = 100) {
  try {
    // Get Warcraft 3 game ID
    const gameResponse = await axios.get('https://api.twitch.tv/helix/games', {
      params: { name: 'Warcraft III' },
      headers: {
        'Client-ID': TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${token}`
      }
    });

    if (!gameResponse.data.data || gameResponse.data.data.length === 0) {
      console.log('   Warcraft III game not found');
      return [];
    }

    const gameId = gameResponse.data.data[0].id;

    // Get clips for this game
    const clipsResponse = await axios.get('https://api.twitch.tv/helix/clips', {
      params: {
        game_id: gameId,
        first: Math.min(limit, 100)
      },
      headers: {
        'Client-ID': TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${token}`
      }
    });

    return clipsResponse.data.data || [];
  } catch (error) {
    console.error('Error fetching game clips:', error.message);
    return [];
  }
}

async function autoFetchTwitchClips() {
  try {
    if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
      console.error('❌ Twitch API credentials not found in .env file');
      console.log('💡 Get credentials from: https://dev.twitch.tv/console/apps');
      console.log('   Then add to .env:');
      console.log('   TWITCH_CLIENT_ID=your_client_id');
      console.log('   TWITCH_CLIENT_SECRET=your_client_secret');
      process.exit(1);
    }

    console.log('🎮 Fetching Warcraft 3 clips from Twitch...');

    // Get OAuth token
    console.log('🔑 Getting Twitch OAuth token...');
    const token = await getTwitchToken();
    console.log('✅ Token obtained');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const Clip = require('./server/models/Clip');
    
    let allClips = [];

    // Fetch clips from top WC3 game category
    console.log('\n🔎 Fetching top Warcraft 3 clips...');
    const gameClips = await fetchGameClips(token, 100);
    console.log(`   Found ${gameClips.length} clips from game category`);
    allClips = allClips.concat(gameClips);

    // Fetch clips from specific streamers
    for (const channel of wc3Channels) {
      console.log(`\n🔎 Fetching clips from ${channel}...`);
      const channelClips = await fetchChannelClips(channel, token, 50);
      console.log(`   Found ${channelClips.length} clips`);
      allClips = allClips.concat(channelClips);
      
      // Delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (allClips.length >= MAX_CLIPS) break;
    }

    // Remove duplicates
    const uniqueClips = Array.from(new Map(
      allClips.map(c => [c.id, c])
    ).values());

    console.log(`\n📊 Total unique clips found: ${uniqueClips.length}`);

    // Convert to our clip format
    const clips = uniqueClips.map(twitchClip => {
      return {
        title: twitchClip.title.substring(0, 100),
        description: `Clipped by ${twitchClip.creator_name}`,
        videoUrl: `https://clips.twitch.tv/embed?clip=${twitchClip.id}&parent=localhost&parent=127.0.0.1`,
        authorName: twitchClip.broadcaster_name,
        isEmbedded: true,
        embedType: 'twitch',
        thumbnail: twitchClip.thumbnail_url,
        race: 'Random',
        tags: ['twitch', 'clip', twitchClip.game_id ? 'wc3' : 'gameplay'],
        views: twitchClip.view_count || 0
      };
    });

    // Insert into database
    console.log('\n💾 Adding clips to database...');
    const inserted = await Clip.insertMany(clips);
    console.log(`✅ Successfully added ${inserted.length} Twitch clips!`);

    // Show stats
    console.log('\n📈 Stats:');
    const totalClips = await Clip.countDocuments();
    const embeddedClips = await Clip.countDocuments({ isEmbedded: true });
    const twitchClips = await Clip.countDocuments({ embedType: 'twitch' });
    const youtubeClips = await Clip.countDocuments({ embedType: 'youtube' });
    console.log(`   Total clips in database: ${totalClips}`);
    console.log(`   Embedded clips: ${embeddedClips}`);
    console.log(`   YouTube clips: ${youtubeClips}`);
    console.log(`   Twitch clips: ${twitchClips}`);
    console.log(`   User uploaded: ${totalClips - embeddedClips}`);

    mongoose.connection.close();
    console.log('\n👋 Done!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

autoFetchTwitchClips();
