# Auto-Fetch Content Setup Guide

This system automatically fetches new WC3 content from Twitch, YouTube, and Reddit.

## Features

- 🔄 **Auto-refresh every 2 hours** with new WC3 content
- 📺 **Twitch**: Clips from WC3 game category and popular streamers
- 🎥 **YouTube**: Latest WC3 videos and tournament content
- 🔴 **Reddit**: Posts from r/WC3, r/warcraft3, and r/WC3Reforged
- 🎯 **Smart filtering**: Only saves clips with minimum view counts
- 🚫 **Duplicate prevention**: Automatically skips content already in database

## Setup Instructions

### 1. Install Dependencies

```bash
npm install node-schedule
```

### 2. Get API Credentials

#### Twitch API
1. Go to https://dev.twitch.tv/console/apps
2. Create a new application
3. Get your **Client ID** and **Client Secret**

#### YouTube API
1. Go to https://console.cloud.google.com/
2. Create a new project
3. Enable YouTube Data API v3
4. Create credentials (API Key)

#### Reddit API
1. Go to https://www.reddit.com/prefs/apps
2. Create a new app (script type)
3. Get your **Client ID** and **Client Secret**

### 3. Configure Environment Variables

Add these to your `.env` file:

```env
# Twitch API
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_CLIENT_SECRET=your_twitch_secret

# YouTube API
YOUTUBE_API_KEY=your_youtube_api_key

# Reddit API (Optional)
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_secret

# MongoDB
MONGODB_URI=mongodb://localhost:27017/reforged-website
```

## Usage

### Run Once (Manual Fetch)
```bash
npm run fetch-content
```

This will fetch content once and exit.

### Run Continuously (Auto-fetch every 2 hours)
```bash
npm run auto-fetch
```

This will:
- Fetch content immediately
- Schedule automatic fetches every 2 hours
- Run in the background continuously

### Configuration Options

Edit `auto-fetch-all-sources.js` to customize:

```javascript
const FETCH_INTERVAL = '0 */2 * * *'; // Cron format (every 2 hours)
const CLIPS_PER_RUN = 20;              // Max new clips per fetch
const MIN_VIEWS_THRESHOLD = 100;        // Minimum views to save
```

## Content Sources

### Twitch Channels Monitored:
- Grubby
- Back2Warcraft
- WC3Champions
- moon_elf
- happy_wc3
- ToD
- Infi_wc3
- lyn_wc3
- focus_wc3
- sok_wc3

### YouTube Queries:
- "Warcraft 3 Reforged"
- "WC3 tournament"
- "Grubby WC3"
- "Happy Warcraft 3"
- "WC3Champions"
- "Back2Warcraft"

### Reddit Subreddits:
- r/WC3
- r/warcraft3
- r/WC3Reforged

## Monitoring

The script will output:
```
🔄 Starting auto-fetch at [timestamp]
📺 Fetching Twitch clips...
   ✅ Processed 15 Twitch clips
🎥 Fetching YouTube videos...
   ✅ Processed 10 YouTube videos
🔴 Fetching Reddit posts...
   ✅ Processed 8 Reddit posts

🎉 Fetch complete! Added 5 new clips to database
📊 Total clips in database: 125
```

## Running in Production

### Option 1: PM2 (Recommended)
```bash
npm install -g pm2
pm2 start auto-fetch-all-sources.js --name "wc3-auto-fetch"
pm2 save
pm2 startup
```

### Option 2: As a Service
Create a systemd service or Windows service to run automatically.

### Option 3: With Main Server
Add to your main server startup:

```javascript
// In server/index.js
const { startAutoFetch } = require('../auto-fetch-all-sources');

// After server starts
startAutoFetch();
```

## Troubleshooting

### No new content being added?
- Check API credentials are valid
- Verify MongoDB connection
- Check console output for errors
- Ensure content meets minimum view threshold

### Duplicate content?
The system automatically checks for duplicates by URL and title.

### Rate limiting?
- Twitch: 800 requests per minute
- YouTube: 10,000 requests per day
- Reddit: 60 requests per minute

The script is designed to stay well within these limits.

## Notes

- The script only saves video content (no text posts)
- Reddit posts must contain YouTube or Twitch links
- Clips are automatically tagged by source
- All content is stored with original metadata
