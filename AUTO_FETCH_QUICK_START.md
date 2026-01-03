# 🎮 WC3 Reforged - Auto Content Updates

## ✅ What's New

Your reels section now **automatically updates** with new WC3 content from:
- 📺 **Twitch** - Clips from top WC3 streamers (Grubby, Happy, Moon, etc.)
- 🎥 **YouTube** - Latest WC3 videos and tournaments
- 🔴 **Reddit** - Hot posts from WC3 subreddits

## 🚀 Quick Start

### 1. Get API Keys (Required)

**Twitch** (5 minutes):
- Visit: https://dev.twitch.tv/console/apps
- Click "Register Your Application"
- Name: "WC3 Reforged Site"
- OAuth Redirect: http://localhost:3000
- Category: Website Integration
- Copy **Client ID** and **Client Secret**

**YouTube** (5 minutes):
- Visit: https://console.cloud.google.com/
- Create new project → Enable "YouTube Data API v3"
- Create credentials → API Key
- Copy the **API Key**

**Reddit** (Optional, 5 minutes):
- Visit: https://www.reddit.com/prefs/apps
- Create "script" app
- Copy **Client ID** and **Secret**

### 2. Configure .env File

```env
# Add these lines to your .env file:
AUTO_FETCH_ENABLED=true

TWITCH_CLIENT_ID=paste_your_twitch_client_id
TWITCH_CLIENT_SECRET=paste_your_twitch_secret

YOUTUBE_API_KEY=paste_your_youtube_api_key

REDDIT_CLIENT_ID=paste_your_reddit_id
REDDIT_CLIENT_SECRET=paste_your_reddit_secret
```

### 3. Run It!

**Option A: Auto-fetch with server (Recommended)**
```bash
npm start
```
Server will fetch new content every 2 hours automatically.

**Option B: Manual fetch**
```bash
npm run fetch-content
```
Fetches content once and exits.

**Option C: Continuous background**
```bash
npm run auto-fetch
```
Runs in background, fetching every 2 hours.

## 📊 What Gets Added

✅ Top viewed Twitch clips (100+ views)
✅ Latest YouTube videos from WC3 channels
✅ Reddit posts with video links
✅ Content from both pros and casual players
✅ Tournament highlights and gameplay

❌ Text-only posts
❌ Low-quality clips (<100 views)
❌ Duplicate content

## 🎯 Monitored Sources

**Twitch Streamers:**
- Grubby, Back2Warcraft, WC3Champions
- moon_elf, happy_wc3, ToD
- Infi_wc3, lyn_wc3, focus_wc3, sok_wc3

**YouTube Channels:**
- Grubby, Happy, WC3Champions
- Back2Warcraft, Tournament channels

**Reddit:**
- r/WC3, r/warcraft3, r/WC3Reforged

## ⚙️ Customization

Edit `auto-fetch-all-sources.js`:

```javascript
// Fetch every 2 hours (default)
const FETCH_INTERVAL = '0 */2 * * *';

// Max clips per fetch (default 20)
const CLIPS_PER_RUN = 20;

// Minimum views to save (default 100)
const MIN_VIEWS_THRESHOLD = 100;
```

## 📈 Monitoring

Watch the console output:
```
🔄 Starting auto-fetch at 2:00 PM
📺 Fetching Twitch clips...
   ✅ Processed 15 Twitch clips
🎥 Fetching YouTube videos...
   ✅ Processed 10 YouTube videos
🔴 Fetching Reddit posts...
   ✅ Processed 8 Reddit posts

🎉 Fetch complete! Added 5 new clips to database
📊 Total clips in database: 125
```

## 🛠️ Troubleshooting

**No content appearing?**
- Check API keys are correct in .env
- Verify MongoDB is connected
- Check console for errors

**Want more frequent updates?**
Change `FETCH_INTERVAL` to `'0 * * * *'` (every hour)

**Want less content?**
Increase `MIN_VIEWS_THRESHOLD` to 500 or 1000

**Stop auto-fetch?**
Set `AUTO_FETCH_ENABLED=false` in .env

## 📝 Notes

- Free tier limits: Twitch (800/min), YouTube (10k/day), Reddit (60/min)
- System automatically prevents duplicates
- Content is tagged by source for filtering
- Original metadata preserved (views, author, date)
- Only video content is saved (no text posts)

---

**Need help?** Check `AUTO_FETCH_SETUP.md` for detailed documentation.
