const mongoose = require('mongoose');
const axios = require('axios');
const schedule = require('node-schedule');
require('dotenv').config();

// API credentials
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID;
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET;

// Configuration
const FETCH_INTERVAL = '0 */2 * * *'; // Every 2 hours
const CLIPS_PER_RUN = 20; // Fetch 20 new clips per run
const MIN_VIEWS_THRESHOLD = 100; // Minimum views to consider

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/reforged-website', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const Clip = require('./server/models/Clip');

// ==================== TWITCH ====================
let twitchToken = null;
let twitchTokenExpiry = null;

async function getTwitchToken() {
  if (twitchToken && twitchTokenExpiry && Date.now() < twitchTokenExpiry) {
    return twitchToken;
  }

  try {
    const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
      params: {
        client_id: TWITCH_CLIENT_ID,
        client_secret: TWITCH_CLIENT_SECRET,
        grant_type: 'client_credentials'
      }
    });
    twitchToken = response.data.access_token;
    twitchTokenExpiry = Date.now() + (response.data.expires_in * 1000);
    return twitchToken;
  } catch (error) {
    console.error('❌ Error getting Twitch token:', error.message);
    return null;
  }
}

async function fetchTwitchClips() {
  const token = await getTwitchToken();
  if (!token) return [];

  const clips = [];
  const wc3Channels = [
    'Grubby', 'Back2Warcraft', 'WC3Champions', 'moon_elf', 'happy_wc3',
    'ToD', 'Infi_wc3', 'lyn_wc3', 'focus_wc3', 'sok_wc3'
  ];

  try {
    // Get WC3 game ID
    const gameResponse = await axios.get('https://api.twitch.tv/helix/games', {
      params: { name: 'Warcraft III' },
      headers: {
        'Client-ID': TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${token}`
      }
    });

    if (gameResponse.data.data && gameResponse.data.data.length > 0) {
      const gameId = gameResponse.data.data[0].id;

      // Fetch top clips for the game
      const clipsResponse = await axios.get('https://api.twitch.tv/helix/clips', {
        params: {
          game_id: gameId,
          first: Math.min(CLIPS_PER_RUN, 100),
          started_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        },
        headers: {
          'Client-ID': TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${token}`
        }
      });

      clips.push(...(clipsResponse.data.data || []));
    }

    // Also fetch from specific channels
    for (const channel of wc3Channels.slice(0, 3)) {
      const userResponse = await axios.get('https://api.twitch.tv/helix/users', {
        params: { login: channel },
        headers: {
          'Client-ID': TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${token}`
        }
      });

      if (userResponse.data.data && userResponse.data.data.length > 0) {
        const broadcasterId = userResponse.data.data[0].id;

        const channelClips = await axios.get('https://api.twitch.tv/helix/clips', {
          params: {
            broadcaster_id: broadcasterId,
            first: 10
          },
          headers: {
            'Client-ID': TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${token}`
          }
        });

        clips.push(...(channelClips.data.data || []));
      }
    }

    return clips;
  } catch (error) {
    console.error('❌ Error fetching Twitch clips:', error.message);
    return [];
  }
}

// ==================== YOUTUBE ====================
async function fetchYouTubeVideos() {
  if (!YOUTUBE_API_KEY) return [];

  const videos = [];
  const queries = [
    'Warcraft 3 Reforged',
    'WC3 tournament',
    'Grubby WC3',
    'Happy Warcraft 3',
    'WC3Champions',
    'Back2Warcraft'
  ];

  try {
    for (const query of queries.slice(0, 3)) {
      const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          part: 'snippet',
          q: query,
          type: 'video',
          maxResults: 5,
          key: YOUTUBE_API_KEY,
          order: 'date',
          publishedAfter: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      });

      videos.push(...(response.data.items || []));
    }

    return videos;
  } catch (error) {
    console.error('❌ Error fetching YouTube videos:', error.message);
    return [];
  }
}

// ==================== REDDIT ====================
let redditToken = null;
let redditTokenExpiry = null;

async function getRedditToken() {
  if (redditToken && redditTokenExpiry && Date.now() < redditTokenExpiry) {
    return redditToken;
  }

  if (!REDDIT_CLIENT_ID || !REDDIT_CLIENT_SECRET) return null;

  try {
    const auth = Buffer.from(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`).toString('base64');
    const response = await axios.post('https://www.reddit.com/api/v1/access_token', 
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'ReforgedWebsite/1.0'
        }
      }
    );

    redditToken = response.data.access_token;
    redditTokenExpiry = Date.now() + (response.data.expires_in * 1000);
    return redditToken;
  } catch (error) {
    console.error('❌ Error getting Reddit token:', error.message);
    return null;
  }
}

async function fetchRedditPosts() {
  const token = await getRedditToken();
  if (!token) return [];

  const posts = [];
  const subreddits = ['WC3', 'warcraft3', 'WC3Reforged'];

  try {
    for (const subreddit of subreddits) {
      const response = await axios.get(`https://oauth.reddit.com/r/${subreddit}/hot`, {
        params: { limit: 10 },
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'ReforgedWebsite/1.0'
        }
      });

      if (response.data.data && response.data.data.children) {
        posts.push(...response.data.data.children.map(child => child.data));
      }
    }

    return posts;
  } catch (error) {
    console.error('❌ Error fetching Reddit posts:', error.message);
    return [];
  }
}

// ==================== SAVE TO DATABASE ====================
async function saveTwitchClip(clip) {
  try {
    const existingClip = await Clip.findOne({ videoUrl: clip.url });
    if (existingClip) return false;

    const newClip = new Clip({
      title: clip.title,
      description: `Twitch clip by ${clip.broadcaster_name}`,
      videoUrl: clip.url,
      isEmbedded: true,
      embedType: 'twitch',
      thumbnail: clip.thumbnail_url,
      authorName: clip.broadcaster_name,
      views: clip.view_count || 0,
      duration: clip.duration || 0,
      tags: ['twitch', 'clip'],
      createdAt: new Date(clip.created_at)
    });

    await newClip.save();
    return true;
  } catch (error) {
    console.error('Error saving Twitch clip:', error.message);
    return false;
  }
}

async function saveYouTubeVideo(video) {
  try {
    const videoId = video.id.videoId;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    const existingClip = await Clip.findOne({ videoUrl });
    if (existingClip) return false;

    const newClip = new Clip({
      title: video.snippet.title,
      description: video.snippet.description.substring(0, 500),
      videoUrl,
      isEmbedded: true,
      embedType: 'youtube',
      thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default.url,
      authorName: video.snippet.channelTitle,
      tags: ['youtube'],
      createdAt: new Date(video.snippet.publishedAt)
    });

    await newClip.save();
    return true;
  } catch (error) {
    console.error('Error saving YouTube video:', error.message);
    return false;
  }
}

async function saveRedditPost(post) {
  try {
    // Only save posts with video content
    if (!post.is_video && !post.url.includes('youtube.com') && !post.url.includes('youtu.be') && !post.url.includes('clips.twitch.tv')) {
      return false;
    }

    const existingClip = await Clip.findOne({ 
      $or: [
        { videoUrl: post.url },
        { title: post.title }
      ]
    });
    if (existingClip) return false;

    let embedType = null;
    let videoUrl = post.url;

    if (post.url.includes('youtube.com') || post.url.includes('youtu.be')) {
      embedType = 'youtube';
    } else if (post.url.includes('clips.twitch.tv') || post.url.includes('twitch.tv')) {
      embedType = 'twitch';
    }

    if (!embedType) return false;

    const newClip = new Clip({
      title: post.title,
      description: post.selftext ? post.selftext.substring(0, 500) : `From r/${post.subreddit}`,
      videoUrl,
      isEmbedded: true,
      embedType,
      thumbnail: post.thumbnail !== 'default' ? post.thumbnail : null,
      authorName: `u/${post.author}`,
      tags: ['reddit', post.subreddit],
      views: post.ups || 0,
      createdAt: new Date(post.created_utc * 1000)
    });

    await newClip.save();
    return true;
  } catch (error) {
    console.error('Error saving Reddit post:', error.message);
    return false;
  }
}

// ==================== MAIN FETCH FUNCTION ====================
async function fetchAllSources() {
  console.log('\n🔄 Starting auto-fetch at', new Date().toLocaleString());
  let newClips = 0;

  try {
    // Fetch from Twitch
    console.log('📺 Fetching Twitch clips...');
    const twitchClips = await fetchTwitchClips();
    for (const clip of twitchClips) {
      if (clip.view_count >= MIN_VIEWS_THRESHOLD) {
        const saved = await saveTwitchClip(clip);
        if (saved) newClips++;
      }
    }
    console.log(`   ✅ Processed ${twitchClips.length} Twitch clips`);

    // Fetch from YouTube
    console.log('🎥 Fetching YouTube videos...');
    const youtubeVideos = await fetchYouTubeVideos();
    for (const video of youtubeVideos) {
      const saved = await saveYouTubeVideo(video);
      if (saved) newClips++;
    }
    console.log(`   ✅ Processed ${youtubeVideos.length} YouTube videos`);

    // Fetch from Reddit
    console.log('🔴 Fetching Reddit posts...');
    const redditPosts = await fetchRedditPosts();
    for (const post of redditPosts) {
      const saved = await saveRedditPost(post);
      if (saved) newClips++;
    }
    console.log(`   ✅ Processed ${redditPosts.length} Reddit posts`);

    console.log(`\n🎉 Fetch complete! Added ${newClips} new clips to database`);
    console.log(`📊 Total clips in database: ${await Clip.countDocuments()}`);
  } catch (error) {
    console.error('❌ Error during fetch:', error);
  }
}

// ==================== SCHEDULER ====================
async function startAutoFetch() {
  console.log('🚀 WC3 Auto-Fetch Service Starting...');
  console.log(`⏰ Schedule: ${FETCH_INTERVAL} (Every 2 hours)`);
  console.log(`🎯 Clips per run: ${CLIPS_PER_RUN}`);
  console.log(`📊 Min views threshold: ${MIN_VIEWS_THRESHOLD}`);
  
  // Run immediately on start
  await fetchAllSources();

  // Schedule periodic fetches
  schedule.scheduleJob(FETCH_INTERVAL, async () => {
    await fetchAllSources();
  });

  console.log('\n✅ Auto-fetch service is running!');
  console.log('   Press Ctrl+C to stop\n');
}

// ==================== MANUAL RUN ====================
if (require.main === module) {
  mongoose.connection.once('open', () => {
    console.log('✅ Connected to MongoDB');
    
    // Check if we want to run once or continuously
    const args = process.argv.slice(2);
    
    if (args.includes('--once')) {
      console.log('📍 Running fetch once...');
      fetchAllSources().then(() => {
        console.log('✅ Done!');
        process.exit(0);
      });
    } else {
      startAutoFetch();
    }
  });

  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });
}

module.exports = { fetchAllSources, startAutoFetch };
