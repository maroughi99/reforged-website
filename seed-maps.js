const mongoose = require('mongoose');
require('dotenv').config();

const Map = require('./server/models/Map');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/warcraft3-reforged');

const sampleMaps = [
  {
    title: 'DotA Allstars v6.88',
    description: 'The legendary Defense of the Ancients map. Choose your hero and battle across lanes in this iconic AoS map.',
    author: 'IceFrog',
    category: 'AoS',
    version: '6.88',
    players: '5v5',
    downloadUrl: 'https://wc3maps.com/maps/dota',
    tags: ['dota', 'aos', 'competitive', 'classic']
  },
  {
    title: 'Element TD',
    description: 'Build towers with elements and combine them for stronger defenses. One of the most popular TD maps.',
    author: 'Karawasa',
    category: 'TD',
    version: '5.0',
    players: '1-8',
    downloadUrl: 'https://wc3maps.com/maps/element-td',
    tags: ['td', 'tower defense', 'elements', 'strategy']
  },
  {
    title: 'Footmen Frenzy',
    description: 'Fast-paced footmen battles with hero support. Build your army and crush your opponents!',
    author: 'Various',
    category: 'Hero Arena',
    version: '7.3',
    players: '3v3',
    downloadUrl: 'https://wc3maps.com/maps/footmen-frenzy',
    tags: ['footmen', 'arena', 'pvp', 'fast-paced']
  },
  {
    title: 'Enfos Team Survival',
    description: 'Survive waves of increasingly difficult enemies with your team. Build defenses and heroes.',
    author: 'Silvenon',
    category: 'Survival',
    version: '2.7',
    players: '1-6',
    downloadUrl: 'https://wc3maps.com/maps/enfos',
    tags: ['survival', 'coop', 'waves', 'team']
  },
  {
    title: 'Warlock Brawl',
    description: 'Control a single warlock unit and battle other warlocks. Simple yet addicting gameplay!',
    author: 'Various',
    category: 'Mini Game',
    version: '1.2',
    players: '2-12',
    downloadUrl: 'https://wc3maps.com/maps/warlock',
    tags: ['warlock', 'pvp', 'minigame', 'fun']
  },
  {
    title: 'Trolls vs Elves',
    description: 'Elves must survive against waves of trolls. Classic asymmetric team game.',
    author: 'Various',
    category: 'Defense',
    version: '9.5',
    players: '5v5',
    downloadUrl: 'https://wc3maps.com/maps/tve',
    tags: ['tve', 'defense', 'asymmetric', 'team']
  },
  {
    title: 'Zombies',
    description: 'Survive the zombie apocalypse. Hold out as long as possible against endless undead.',
    author: 'Notexist',
    category: 'Survival',
    version: '2.1',
    players: '1-10',
    downloadUrl: 'https://wc3maps.com/maps/zombies',
    tags: ['zombies', 'survival', 'horror', 'coop']
  },
  {
    title: 'Gem TD',
    description: 'Build and combine gem towers for massive damage. Strategic tower defense.',
    author: 'Bryvx',
    category: 'TD',
    version: '4.2',
    players: '1-8',
    downloadUrl: 'https://wc3maps.com/maps/gem-td',
    tags: ['td', 'gems', 'combinations', 'strategy']
  },
  {
    title: 'Anime Fight',
    description: 'Choose your favorite anime character and battle in epic fights.',
    author: 'Various',
    category: 'Hero Arena',
    version: '3.1',
    players: '2-8',
    downloadUrl: 'https://wc3maps.com/maps/anime-fight',
    tags: ['anime', 'pvp', 'heroes', 'arena']
  },
  {
    title: 'Uther Party',
    description: 'Mini-game collection like Mario Party. Compete in various challenges!',
    author: 'Riki',
    category: 'Mini Game',
    version: '1.24',
    players: '2-12',
    downloadUrl: 'https://wc3maps.com/maps/uther-party',
    tags: ['party', 'minigames', 'multiplayer', 'fun']
  },
  {
    title: 'Hero Line Wars',
    description: 'Send units down lanes while building a hero. Classic line war map.',
    author: 'Various',
    category: 'Defense',
    version: '5.8',
    players: '2-10',
    downloadUrl: 'https://wc3maps.com/maps/hero-line-wars',
    tags: ['line wars', 'hero', 'strategy', 'lanes']
  },
  {
    title: 'Farmers vs Hunters',
    description: 'Farmers must grow crops while hunters try to stop them. Unique gameplay!',
    author: 'Riki',
    category: 'Other',
    version: '5.2',
    players: '4-8',
    downloadUrl: 'https://wc3maps.com/maps/farmers-vs-hunters',
    tags: ['farming', 'asymmetric', 'unique', 'team']
  },
  {
    title: 'Pyramid Escape',
    description: 'Escape the pyramid by solving puzzles and avoiding traps.',
    author: 'HorroR',
    category: 'RPG',
    version: '1.9',
    players: '1-8',
    downloadUrl: 'https://wc3maps.com/maps/pyramid-escape',
    tags: ['escape', 'puzzle', 'adventure', 'coop']
  },
  {
    title: 'Legion TD',
    description: 'Build towers and send units against your opponents. Strategic and competitive.',
    author: 'Lisk',
    category: 'TD',
    version: '3.5',
    players: '2-8',
    downloadUrl: 'https://wc3maps.com/maps/legion-td',
    tags: ['td', 'competitive', 'strategy', 'pvp']
  },
  {
    title: 'Island Defense',
    description: 'Defend your island from waves of attackers. Build defenses strategically.',
    author: 'Yixx',
    category: 'Defense',
    version: '12.0',
    players: '1-10',
    downloadUrl: 'https://wc3maps.com/maps/island-defense',
    tags: ['defense', 'island', 'waves', 'strategy']
  },
  {
    title: 'Battleships Crossfire',
    description: 'Control battleships in epic naval warfare. Tactical ship combat.',
    author: 'Hamed',
    category: 'Other',
    version: '8.0',
    players: '2-8',
    downloadUrl: 'https://wc3maps.com/maps/battleships',
    tags: ['battleships', 'naval', 'pvp', 'tactical']
  },
  {
    title: 'Wintermaul Wars',
    description: 'Build mazes to guide units into your enemy. Strategic TD meets PvP.',
    author: 'Wriggle',
    category: 'TD',
    version: '1.07',
    players: '2-8',
    downloadUrl: 'https://wc3maps.com/maps/wintermaul-wars',
    tags: ['td', 'maze', 'pvp', 'strategy']
  },
  {
    title: 'Tree Tag',
    description: 'Trees must survive against an infernal. Hide and escape!',
    author: 'Shrikez',
    category: 'Mini Game',
    version: '3.0',
    players: '2-16',
    downloadUrl: 'https://wc3maps.com/maps/tree-tag',
    tags: ['tag', 'survival', 'hide and seek', 'fun']
  },
  {
    title: 'Sheep Tag',
    description: 'Sheep must survive while the wolf hunts them down.',
    author: 'Ralle',
    category: 'Mini Game',
    version: '4.2',
    players: '2-12',
    downloadUrl: 'https://wc3maps.com/maps/sheep-tag',
    tags: ['tag', 'survival', 'hunt', 'fun']
  },
  {
    title: 'Castlefight',
    description: 'Build buildings that spawn units to destroy enemy castle.',
    author: 'Cokemonkey11',
    category: 'Other',
    version: '1.17',
    players: '2-12',
    downloadUrl: 'https://wc3maps.com/maps/castlefight',
    tags: ['castle', 'build', 'strategy', 'pvp']
  }
];

async function seedMaps() {
  try {
    console.log('🗺️  Seeding sample WC3 maps...\n');
    
    for (const mapData of sampleMaps) {
      const existing = await Map.findOne({ title: mapData.title });
      if (!existing) {
        const map = new Map(mapData);
        await map.save();
        console.log(`✅ Added: ${mapData.title}`);
      } else {
        console.log(`⏭️  Skipped: ${mapData.title} (already exists)`);
      }
    }
    
    const total = await Map.countDocuments();
    console.log(`\n🎉 Done! Total maps in database: ${total}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding maps:', error);
    process.exit(1);
  }
}

mongoose.connection.once('open', () => {
  console.log('✅ Connected to MongoDB\n');
  seedMaps();
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});
