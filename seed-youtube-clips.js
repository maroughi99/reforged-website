const mongoose = require('mongoose');
require('dotenv').config();

// ADD YOUTUBE URLs HERE - Just paste YouTube video IDs
// To get video ID: from https://youtube.com/watch?v=ABC123 -> use ABC123
const videoIds = [
  // Example: 'dQw4w9WgXcQ',
  // Add your video IDs here, one per line
];

// Convert to full clip objects
const youtubeClips = videoIds.map(id => ({
  title: `Warcraft 3 Clip`,
  description: 'Epic WC3 gameplay',
  videoUrl: `https://www.youtube.com/embed/${id}`,
  authorName: 'Community',
  isEmbedded: true,
  embedType: 'youtube',
  thumbnail: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
  race: 'Random',
  tags: ['gameplay', 'wc3', 'community']
}));

async function seedYouTubeClips() {
  try {
    if (youtubeClips.length === 0) {
      console.log('⚠️  No video IDs found. Add video IDs to the videoIds array first.');
      console.log('💡 Get video IDs from YouTube URLs:');
      console.log('   https://youtube.com/watch?v=ABC123 -> use "ABC123"');
      process.exit(0);
    }

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get Clip model
    const Clip = require('./server/models/Clip');

    // Insert YouTube clips
    const inserted = await Clip.insertMany(youtubeClips);
    console.log(`✅ Added ${inserted.length} YouTube clips to database`);

    mongoose.connection.close();
    console.log('👋 Database connection closed');
  } catch (error) {
    console.error('❌ Error seeding clips:', error);
    process.exit(1);
  }
}

seedYouTubeClips();
