require('dotenv').config();
const mongoose = require('mongoose');
const Clip = require('./server/models/Clip');
const User = require('./server/models/User');

async function seedClips() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find your user (Wizzy) to use as author
    const user = await User.findOne({ username: 'Wizzy' });
    
    if (!user) {
      console.log('❌ User "Wizzy" not found. Please create a user first.');
      process.exit(1);
    }

    // Clear existing clips
    await Clip.deleteMany({});
    console.log('Cleared existing clips');

    // Sample video URLs that actually work (public domain test videos)
    const videoUrls = [
      'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
      'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
      'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
      'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
      'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4'
    ];

    const races = ['Human', 'Orc', 'Undead', 'NightElf', 'Random'];
    
    const clips = [
      {
        title: 'Insane 1v3 Comeback as Orc!',
        description: 'Watch how I turned around a 1v3 situation with perfect micro and blade master harass',
        race: 'Orc',
        tags: ['comeback', 'micro', 'blademaster'],
        likes: Array(45).fill(user._id),
        views: 1234
      },
      {
        title: 'Night Elf Moon Well Rush Strategy',
        description: 'New meta strat - moon well rush into mass archers. Works every time!',
        race: 'NightElf',
        tags: ['strategy', 'nightelf', 'rush'],
        likes: Array(23).fill(user._id),
        views: 567
      },
      {
        title: 'Human Tower Defense Master Class',
        description: 'Defending against orc rush with perfect tower placement',
        race: 'Human',
        tags: ['defense', 'towers', 'human'],
        likes: Array(67).fill(user._id),
        views: 2341
      },
      {
        title: 'Undead Nuke Compilation',
        description: 'Best death coil snipes from this season. That last one was *chefs kiss*',
        race: 'Undead',
        tags: ['undead', 'deathcoil', 'nuke'],
        likes: Array(89).fill(user._id),
        views: 3456
      },
      {
        title: 'When Everything Goes Wrong',
        description: 'This match was a disaster but somehow I won lol',
        race: 'Random',
        tags: ['funny', 'fail', 'comeback'],
        likes: Array(12).fill(user._id),
        views: 789
      },
      {
        title: 'Perfect Circle of Power Timing',
        description: 'Absolutely perfect execution on this TP timing',
        race: 'Human',
        tags: ['timing', 'perfect', 'tp'],
        likes: Array(34).fill(user._id),
        views: 1567
      },
      {
        title: 'Orc vs NE - The Classic Matchup',
        description: 'This matchup never gets old. Watch how I handle the archers',
        race: 'Orc',
        tags: ['orc', 'nightelf', 'classic'],
        likes: Array(56).fill(user._id),
        views: 2234
      },
      {
        title: 'Lich King Mode Activated',
        description: 'When your death knight gets to level 6 and its GG',
        race: 'Undead',
        tags: ['deathknight', 'hero', 'level6'],
        likes: Array(78).fill(user._id),
        views: 4567
      },
      {
        title: 'Mass Gryphon Rider Heaven',
        description: 'They said mass gryphons dont work. They were wrong.',
        race: 'Human',
        tags: ['gryphon', 'mass', 'air'],
        likes: Array(45).fill(user._id),
        views: 1890
      },
      {
        title: 'The Greatest Creep Jack Ever',
        description: 'Timing was PERFECT. His face must have been priceless',
        race: 'NightElf',
        tags: ['creepjack', 'timing', 'epic'],
        likes: Array(91).fill(user._id),
        views: 5678
      }
    ];

    // Create clips with the sample videos
    const createdClips = [];
    for (let i = 0; i < clips.length; i++) {
      const clip = new Clip({
        author: user._id,
        title: clips[i].title,
        description: clips[i].description,
        videoUrl: videoUrls[i],
        race: clips[i].race,
        tags: clips[i].tags,
        likes: clips[i].likes.slice(0, Math.floor(Math.random() * clips[i].likes.length)),
        views: clips[i].views,
        duration: 30 + Math.floor(Math.random() * 90),
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000))
      });
      
      await clip.save();
      createdClips.push(clip);
      console.log(`✅ Created clip: ${clip.title}`);
    }

    console.log(`\n🎬 Successfully created ${createdClips.length} clips!`);
    console.log('You can now view them at /clips');

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

seedClips();
