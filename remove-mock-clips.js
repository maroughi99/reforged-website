const mongoose = require('mongoose');
require('dotenv').config();

async function removeMockClips() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const Clip = require('./server/models/Clip');

    // Remove clips with example/mock data (from the original seed script)
    const result = await Clip.deleteMany({
      $or: [
        { videoUrl: { $regex: /example/ } },
        { videoUrl: { $regex: /dQw4w9WgXcQ/ } },
        { title: { $regex: /Epic Warcraft 3 1v1 Gameplay/ } },
        { title: { $regex: /Insane Orc Micro/ } },
        { title: { $regex: /Moon Night Elf Strategy/ } }
      ]
    });

    console.log(`🗑️  Removed ${result.deletedCount} mock clips`);

    const remaining = await Clip.countDocuments();
    console.log(`📊 Remaining clips: ${remaining}`);

    mongoose.connection.close();
    console.log('👋 Done!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

removeMockClips();
