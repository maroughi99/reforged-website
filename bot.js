require('dotenv').config();
const { Client, GatewayIntentBits, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const { generateGameImage } = require('./gameImageGenerator');
const { generateGameListImage } = require('./gameListGenerator');
const express = require('express');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Configuration
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = '1372149095556317194'; 
const GAME_LIST_CHANNEL_ID = '1448534015970906185';
const API_URL = 'https://api.wc3stats.com/gamelist';
const POLL_INTERVAL = 30000; // 30 seconds
const GAME_LIST_UPDATE_INTERVAL = 60000; // 60 seconds
const PORT = process.env.PORT || 3000;

// WC3 WebSocket Configuration
const WS_URL = 'ws://127.0.0.1:62409/webui-socket/18285827158303798016';
let ws = null;
let wc3MapsByFolder = {
    'w3c': [],
    'download': [],
    'w3ladder': []
};
let selectedMap = null;
let lobbyCreated = false;
let currentLobbyName = '';
let waitingForPlayersToLoad = false;
let playersLoadedCount = 0;
let totalPlayersInGame = 0;
const seenPlayers = new Set();
const pendingStats = new Map(); // battleTag -> { name, stats, displayed }
let currentLobbyMembers = new Set(); // Track current lobby members for leave detection
const bannedPlayers = new Set(); // Track banned players
const MAP_FOLDERS = {
    'frozenthrone': 'frozenthrone'
};
let mapFoldersLoaded = new Set();

// Admin list for in-game commands
const ADMIN_BATTLETAGS = ['Wizkid#11720', 'chimchim#1324'];

// Registration system
const REGISTERED_USERS_FILE = path.join(__dirname, 'registeredUsers.json');
let registeredUsers = {}; // discordId -> battleTag

// Load registered users from file
function loadRegisteredUsers() {
    try {
        if (fs.existsSync(REGISTERED_USERS_FILE)) {
            const data = fs.readFileSync(REGISTERED_USERS_FILE, 'utf8');
            registeredUsers = JSON.parse(data);
            console.log(`✅ Loaded ${Object.keys(registeredUsers).length} registered users`);
        } else {
            registeredUsers = {};
            saveRegisteredUsers();
        }
    } catch (error) {
        console.error('❌ Error loading registered users:', error);
        registeredUsers = {};
    }
}

// Save registered users to file
function saveRegisteredUsers() {
    try {
        fs.writeFileSync(REGISTERED_USERS_FILE, JSON.stringify(registeredUsers, null, 2), 'utf8');
    } catch (error) {
        console.error('❌ Error saving registered users:', error);
    }
}

// Check if a Discord user is registered
function isRegistered(userId) {
    return registeredUsers[userId] !== undefined;
}

// Get Battle.net tag for a Discord user
function getBattleTag(userId) {
    return registeredUsers[userId];
}

// Check if a Battle.net tag is an admin
function isAdmin(battleTag) {
    return ADMIN_BATTLETAGS.includes(battleTag);
}

// Check if a Discord user is a registered admin
function isRegisteredAdmin(userId) {
    const battleTag = getBattleTag(userId);
    return battleTag && isAdmin(battleTag);
}


// Display player stats in game chat
function displayPlayerStats(battleTag, data) {
    if (!data || !data.stats) return;
    
    // Only send if lobby is active
    if (!lobbyCreated) {
        console.log(`  ⚠️ Lobby not created yet, skipping stats display`);
        return;
    }
    
    let statsMsg = '';
    const playerName = data.name || battleTag;
    
    // Find Season 7
    const season7 = data.stats.seasons?.find(s => s.season === 7);
    if (!season7) {
        console.log(`  No Season 7 stats for ${battleTag}`);
        statsMsg = `${playerName}: No Season 7 stats found`;
    } else {
        // Calculate totals
        let totalWins = 0;
        let totalLosses = 0;
        
        season7.races.forEach(raceData => {
            const wins = raceData.stats.find(s => s.statName === 'wins')?.sum || 0;
            const losses = raceData.stats.find(s => s.statName === 'losses')?.sum || 0;
            totalWins += wins;
            totalLosses += losses;
        });
        
        const totalGames = totalWins + totalLosses;
        const winRate = totalGames > 0 ? ((totalWins / totalGames) * 100).toFixed(1) : '0.0';
        
        statsMsg = `${playerName}: 1v1 (${totalWins}W-${totalLosses}L) ${winRate}%`;
    }
    
    // Send to game chat with a delay to ensure player is fully loaded
    console.log(`📊 Preparing to send: ${statsMsg}`);
    
    setTimeout(() => {
        if (ws && ws.readyState === WebSocket.OPEN && lobbyCreated) {
            ws.send(JSON.stringify({
                message: "SendGameChatMessage",
                payload: { content: statsMsg }
            }));
            console.log(`✅ Message sent to game lobby`);
        } else {
            console.log(`❌ WebSocket not ready or lobby closed`);
        }
    }, 1000); // Wait 1 second before sending
    
    pendingStats.delete(battleTag);
}

// Create simple web server to keep Replit alive
const app = express();
app.get('/', (req, res) => {
    res.send('WC3 Observer Bot is running! 🎮');
});
app.listen(PORT, () => {
    console.log(`🌐 Web server running on port ${PORT}`);
});

// Store tracked game IDs to avoid duplicate posts
const trackedGames = new Set();
let gameListMessage = null; // Store the game list message for updating
let currentPage = 0; // Current page for game list pagination
let allGames = []; // Store all games for pagination

// Track which folder we're expecting maps from
let expectedMapFolder = null;
const mapFolderQueue = [];

// Initialize WC3 WebSocket connection
function initWC3WebSocket() {
    if (ws) {
        ws.close();
    }
    
    // Reset map state
    wc3MapsByFolder = {
        'frozenthrone': []
    };
    mapFoldersLoaded.clear();
    
    ws = new WebSocket(WS_URL);
    
    ws.on('open', () => {
        console.log('🎮 Connected to WC3 WebSocket');
        expectedMapFolder = 'frozenthrone';
        console.log('📁 Requesting maps from root Maps folder...');
        ws.send(JSON.stringify({
            message: 'GetMapList',
            payload: {
                directory: 'Maps'
            }
        }));
    });
    
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            
            // Debug: log all message types
            if (message.messageType) {
                console.log(`🔍 WC3 Message: ${message.messageType}`);
            }
            
            if (message.messageType === 'MapList') {
                const allItems = message.payload.mapList.maps;
                const maps = allItems.filter(m => !m.isFolder);
                
                console.log(`📁 Loaded ${maps.length} maps from frozenthrone`);
                if (maps.length > 0) {
                    console.log(`   First map: ${maps[0].title || maps[0].filename}`);
                    console.log(`   Last map: ${maps[maps.length - 1].title || maps[maps.length - 1].filename}`);
                }
                
                wc3MapsByFolder['frozenthrone'] = maps;
                mapFoldersLoaded.add('frozenthrone');
                expectedMapFolder = null;
            }
            
            if (message.messageType === 'GameLobbySetup' && !lobbyCreated) {
                lobbyCreated = true;
                currentLobbyName = message.payload.lobbyName;
                console.log(`✅ Lobby created: ${message.payload.lobbyName}`);
                console.log(`   Map: ${message.payload.mapData.mapName}`);
                
                // Clear player tracking for new lobby
                seenPlayers.clear();
                pendingStats.clear();
                currentLobbyMembers.clear();
                
                // Debug: Log player info
                console.log('Players in lobby:');
                message.payload.players.forEach(p => {
                    console.log(`  - Slot ${p.slot}, Team ${p.team}, isSelf: ${p.isSelf}, isObserver: ${p.isObserver}, name: ${p.name}`);
                });
                
                // Move slot 0 (host) to observer
                setTimeout(() => {
                    ws.send(JSON.stringify({
                        message: 'SetTeam',
                        payload: {
                            slot: 0,
                            team: 24 // ObserverTeam
                        }
                    }));
                    console.log(`👁️ Sent SetTeam command to move slot 0 to observer`);
                }, 1000);
            }
            
            // Listen for chat messages in lobby
            if (message.messageType === 'ChatMessage' && lobbyCreated) {
                const chatMsg = message.payload.message;
                const content = chatMsg.content.trim();
                const sender = chatMsg.sender;
                
                // Check if sender is a registered admin
                const isAdminSender = Object.values(registeredUsers).includes(sender) && 
                                     isAdmin(sender);
                
                if (isAdminSender) {
                    // -start command
                    if (content.toLowerCase() === '-start') {
                        console.log(`🎮 Admin ${sender} requested game start`);
                        ws.send(JSON.stringify({
                            message: 'LobbyStart'
                        }));
                    }
                    
                    // -kick command
                    if (content.toLowerCase().startsWith('-kick ')) {
                        const playerToKick = content.substring(6).trim();
                        console.log(`👢 Admin ${sender} kicking ${playerToKick}`);
                        ws.send(JSON.stringify({
                            message: 'KickPlayerFromGameLobby',
                            payload: { battleTag: playerToKick }
                        }));
                        ws.send(JSON.stringify({
                            message: "SendGameChatMessage",
                            payload: { content: `${playerToKick} was kicked from the lobby` }
                        }));
                    }
                    
                    // -ban command
                    if (content.toLowerCase().startsWith('-ban ')) {
                        const playerToBan = content.substring(5).trim();
                        console.log(`🚫 Admin ${sender} banning ${playerToBan}`);
                        bannedPlayers.add(playerToBan);
                        ws.send(JSON.stringify({
                            message: 'BanPlayerFromGameLobby',
                            payload: { battleTag: playerToBan }
                        }));
                        ws.send(JSON.stringify({
                            message: "SendGameChatMessage",
                            payload: { content: `${playerToBan} was banned from the lobby` }
                        }));
                    }
                    
                    // -unban command
                    if (content.toLowerCase().startsWith('-unban ')) {
                        const playerToUnban = content.substring(7).trim();
                        console.log(`✅ Admin ${sender} unbanning ${playerToUnban}`);
                        bannedPlayers.delete(playerToUnban);
                        ws.send(JSON.stringify({
                            message: "SendGameChatMessage",
                            payload: { content: `${playerToUnban} was unbanned` }
                        }));
                    }
                }
            }
            
            // Listen for game starting
            if (message.messageType === 'GameLobbyGracefulExit') {
                console.log(`🚪 Lobby closing, game starting. Waiting for game to become active...`);
                waitingForPlayersToLoad = true;
                // Don't clear player tracking here - wait for next lobby creation
            }
            
            // Monitor for players joining lobby
            if (message.messageType === 'OnChannelUpdate' && lobbyCreated) {
                const gameChat = message.payload?.gameChat;
                
                if (gameChat && gameChat.members) {
                    const newLobbyMembers = new Set(gameChat.members.map(m => m.name));
                    
                    // Check for players who left
                    for (const player of currentLobbyMembers) {
                        if (!newLobbyMembers.has(player)) {
                            console.log(`👋 ${player} left the lobby`);
                            
                            // Send leave message to game chat
                            setTimeout(() => {
                                if (ws && ws.readyState === WebSocket.OPEN && lobbyCreated) {
                                    ws.send(JSON.stringify({
                                        message: "SendGameChatMessage",
                                        payload: { content: `${player} left the lobby` }
                                    }));
                                    console.log(`✅ Sent leave message to lobby chat`);
                                }
                            }, 500);
                            
                            seenPlayers.delete(player);
                            pendingStats.delete(player);
                        }
                    }
                    
                    // Update current members list
                    currentLobbyMembers = newLobbyMembers;
                    
                    // Check for new players
                    gameChat.members.forEach(member => {
                        const battleTag = member.name;
                        
                        // New player detected
                        if (battleTag && !seenPlayers.has(battleTag)) {
                            seenPlayers.add(battleTag);
                            console.log(`👤 ${battleTag} joined lobby`);
                            
                            // Check if player is banned
                            if (bannedPlayers.has(battleTag)) {
                                console.log(`🚫 Banned player ${battleTag} tried to join, kicking...`);
                                setTimeout(() => {
                                    ws.send(JSON.stringify({
                                        message: 'KickPlayerFromGameLobby',
                                        payload: { battleTag: battleTag }
                                    }));
                                }, 500);
                                return; // Don't send welcome messages for banned players
                            }
                            
                            // Send join message with Discord invite to game chat
                            setTimeout(() => {
                                if (ws && ws.readyState === WebSocket.OPEN && lobbyCreated) {
                                    ws.send(JSON.stringify({
                                        message: "SendGameChatMessage",
                                        payload: { content: `${battleTag} joined lobby | Join our discord https://discord.gg/SxYfB8pB2g` }
                                    }));
                                    console.log(`✅ Sent join message with Discord invite to lobby chat`);
                                }
                            }, 500);
                            
                            // Initialize pending stats
                            pendingStats.set(battleTag, { name: null, stats: null, displayed: false });
                            
                            // Request profile
                            ws.send(JSON.stringify({
                                message: "GetProfile",
                                payload: { battleTag: battleTag }
                            }));
                        }
                    });
                }
            }
            
            // Get player stats response
            if (message.messageType === 'UpdateProfileData') {
                const battleTagFull = message.payload?.details?.battle_tag_full;
                const details = message.payload?.details;
                
                if (battleTagFull && details) {
                    // Find which pending request this is for
                    for (const [battleTag, data] of pendingStats.entries()) {
                        if (battleTagFull.includes(battleTag.split('#')[0])) {
                            data.name = battleTagFull;
                            if (details.seasons) {
                                data.stats = details;
                                // Mark as complete but don't display yet, wait for WithToonStats
                                console.log(`  ✓ Got profile data for ${battleTagFull}`);
                            }
                            break;
                        }
                    }
                }
            }
            
            // Get stats with toon data (separate message) - this is the final one
            if (message.messageType === 'UpdateProfileDataWithToonStats') {
                const details = message.payload?.details;
                
                if (details?.seasons) {
                    console.log(`  📊 Got stats response`);
                    console.log(`  Pending players:`, Array.from(pendingStats.keys()));
                    
                    // Apply stats to first pending player that hasn't been displayed yet
                    for (const [battleTag, data] of pendingStats.entries()) {
                        if (!data.displayed) {
                            data.stats = details;
                            data.displayed = true;
                            console.log(`  ✓ Applying stats to ${battleTag}`);
                            displayPlayerStats(battleTag, data);
                            break;
                        }
                    }
                }
            }
            
            // Listen for game UI becoming active (all players loaded, game running)
            if (message.messageType === 'IsGameUIActive' && waitingForPlayersToLoad) {
                console.log(`🎮 Game is now active! All players loaded. Leaving in 1 second...`);
                
                setTimeout(() => {
                    ws.send(JSON.stringify({
                        message: 'LeaveGame'
                    }));
                    
                    // Reset state
                    waitingForPlayersToLoad = false;
                    lobbyCreated = false;
                    currentLobbyName = '';
                    console.log(`✅ Left game, ready to create new games`);
                }, 1000);
            }
        } catch (err) {
            // Ignore parse errors
        }
    });
    
    ws.on('error', (error) => {
        console.error('❌ WC3 WebSocket error:', error.message);
    });
    
    ws.on('close', () => {
        console.log('🔌 WC3 WebSocket disconnected');
        // Reconnect after 5 seconds
        setTimeout(initWC3WebSocket, 5000);
    });
}

// Create WC3 custom game
function createCustomGame(mapPath, gameName = "1v1 WC3 Obs Crew", isPrivate = false) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        throw new Error('WebSocket not connected');
    }
    
    lobbyCreated = false;
    
    const lobbySettings = {
        message: "CreateLobby",
        payload: {
            filename: mapPath,
            gameName: gameName,
            gameSpeed: 2,
            privateGame: isPrivate,
            mapSettings: {
                flagLockTeams: true,
                flagPlaceTeamsTogether: true,
                flagFullSharedUnitControl: false,
                flagRandomRaces: false,
                flagRandomHero: false,
                settingObservers: 3, // Full observers
                settingVisibility: 0, // Full map visibility
            }
        }
    };
    
    ws.send(JSON.stringify(lobbySettings));
}

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Fetch games from API
async function fetchGames() {
    try {
        const response = await axios.get(API_URL);
        if (response.data && response.data.status === 'OK' && response.data.body) {
            return response.data.body;
        }
        return [];
    } catch (error) {
        console.error('Error fetching games:', error.message);
        return [];
    }
}

// Post new games to Discord
async function checkAndPostGames() {
    const games = await fetchGames();
    const channel = client.channels.cache.get(CHANNEL_ID);

    if (!channel) {
        console.error('Channel not found!');
        return;
    }

    let newGamesCount = 0;

    for (const game of games) {
        // Only post games we haven't seen before
        if (!trackedGames.has(game.id)) {
            trackedGames.add(game.id);
            
            // Filter: Only games with "obs" as a separate word (not part of other words like "noobs")
            const nameLower = game.name.toLowerCase();
            const hasObs = /\bobs\b/.test(nameLower);
            
            // Only post if the game is relatively new (uptime < 5 minutes) AND matches filters
            if (game.uptime < 300 && hasObs) {
                try {
                    // Generate image for the game
                    const imageBuffer = await generateGameImage(game);
                    const attachment = new AttachmentBuilder(imageBuffer, { name: 'game.png' });
                    
                    await channel.send({ 
                        content: `**New Game Hosted!**\n<@&1372146756745433119> <@&1372146948160884868>`,
                        files: [attachment] 
                    });
                    newGamesCount++;
                    console.log(`Posted game: ${game.name} (ID: ${game.id}) - OBS game`);
                    
                    // Add small delay between posts to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (error) {
                    console.error(`Error posting game ${game.id}:`, error.message);
                }
            }
        }
    }

    // Clean up old game IDs (keep only last 500)
    if (trackedGames.size > 500) {
        const idsArray = Array.from(trackedGames);
        trackedGames.clear();
        idsArray.slice(-500).forEach(id => trackedGames.add(id));
    }

    if (newGamesCount > 0) {
        console.log(`Posted ${newGamesCount} new game(s)`);
    }
}

// Update game list browser
async function updateGameList() {
    try {
        const games = await fetchGames();
        allGames = games; // Store for pagination
        const gameListChannel = client.channels.cache.get(GAME_LIST_CHANNEL_ID);
        
        if (!gameListChannel) {
            console.error('Game list channel not found!');
            return;
        }

        // Generate animated game list for current page
        const gamesPerPage = 30;
        const totalPages = Math.ceil(games.length / gamesPerPage);
        const startIndex = currentPage * gamesPerPage;
        const endIndex = Math.min(startIndex + gamesPerPage, games.length);
        const pageGames = games.slice(startIndex, endIndex);
        
        const imageBuffer = await generateGameListImage(pageGames);
        const attachment = new AttachmentBuilder(imageBuffer, { name: 'gamelist.png' });
        
        // Create navigation buttons
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('first_page')
                    .setLabel('⏮️ First')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage === 0),
                new ButtonBuilder()
                    .setCustomId('prev_page')
                    .setLabel('◀️ Previous')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(currentPage === 0),
                new ButtonBuilder()
                    .setCustomId('page_info')
                    .setLabel(`Page ${currentPage + 1}/${totalPages}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('next_page')
                    .setLabel('Next ▶️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(currentPage >= totalPages - 1),
                new ButtonBuilder()
                    .setCustomId('last_page')
                    .setLabel('Last ⏭️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage >= totalPages - 1)
            );
        
        // Update or create message
        if (gameListMessage) {
            try {
                await gameListMessage.edit({
                    files: [attachment],
                    components: [row]
                });
                console.log(`📋 Updated game list (${games.length} games)`);
            } catch (error) {
                // Message might have been deleted, create new one
                gameListMessage = await gameListChannel.send({
                    files: [attachment],
                    components: [row]
                });
            }
        } else {
            gameListMessage = await gameListChannel.send({
                files: [attachment],
                components: [row]
            });
            console.log(`📋 Created game list (${games.length} games)`);
        }
    } catch (error) {
        console.error('Error updating game list:', error.message);
    }
}

// Bot ready event
client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    console.log(`📡 Monitoring WC3Stats API every ${POLL_INTERVAL / 1000} seconds`);
    console.log(`📢 Posting to channel: ${CHANNEL_ID}`);
    
    // Load registered users
    loadRegisteredUsers();
    
    // Initialize WC3 WebSocket connection
    initWC3WebSocket();
    console.log(`🎮 WC3 Commands: !register <BattleTag>, !maplist, !load <mapname>, !pub <gamename>, !priv <gamename>, !unhost, !whoami`);
    
    // Debug: List all available channels
    console.log(`\n🔍 Available channels:`);
    client.channels.cache.forEach(channel => {
        console.log(`  - ${channel.name || 'DM'} (ID: ${channel.id}, Type: ${channel.type})`);
    });
    
    const targetChannel = client.channels.cache.get(CHANNEL_ID);
    if (targetChannel) {
        console.log(`\n✅ Target channel found: ${targetChannel.name}`);
    } else {
        console.log(`\n❌ Target channel NOT found! Double-check the ID: ${CHANNEL_ID}`);
    }
    
    // Initial fetch to populate tracked games (without posting)
    fetchGames().then(games => {
        games.forEach(game => trackedGames.add(game.id));
        console.log(`🎯 Initialized with ${trackedGames.size} existing games`);
        
        // Start polling for new OBS games
        setInterval(checkAndPostGames, POLL_INTERVAL);
        
        // Start game list browser updates
        updateGameList(); // Initial update
        setInterval(updateGameList, GAME_LIST_UPDATE_INTERVAL);
        console.log(`📋 Game list browser will update every ${GAME_LIST_UPDATE_INTERVAL / 1000} seconds`);
    });
});

// Handle button interactions
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;
    
    const gamesPerPage = 30;
    const totalPages = Math.ceil(allGames.length / gamesPerPage);
    
    // Update current page based on button clicked
    switch (interaction.customId) {
        case 'first_page':
            currentPage = 0;
            break;
        case 'prev_page':
            if (currentPage > 0) currentPage--;
            break;
        case 'next_page':
            if (currentPage < totalPages - 1) currentPage++;
            break;
        case 'last_page':
            currentPage = totalPages - 1;
            break;
        default:
            return;
    }
    
    // Generate new page
    const startIndex = currentPage * gamesPerPage;
    const endIndex = Math.min(startIndex + gamesPerPage, allGames.length);
    const pageGames = allGames.slice(startIndex, endIndex);
    
    const imageBuffer = await generateGameListImage(pageGames);
    const attachment = new AttachmentBuilder(imageBuffer, { name: 'gamelist.png' });
    
    // Update navigation buttons
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('first_page')
                .setLabel('⏮️ First')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage === 0),
            new ButtonBuilder()
                .setCustomId('prev_page')
                .setLabel('◀️ Previous')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage === 0),
            new ButtonBuilder()
                .setCustomId('page_info')
                .setLabel(`Page ${currentPage + 1}/${totalPages}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId('next_page')
                .setLabel('Next ▶️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage >= totalPages - 1),
            new ButtonBuilder()
                .setCustomId('last_page')
                .setLabel('Last ⏭️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage >= totalPages - 1)
        );
    
    await interaction.update({
        files: [attachment],
        components: [row]
    });
    
    console.log(`📄 Navigated to page ${currentPage + 1}/${totalPages}`);
});

// Handle Discord messages for WC3 commands
client.on('messageCreate', async message => {
    // Ignore bot messages
    if (message.author.bot) return;
    
    const content = message.content.trim();
    
    // !maplist command - show available maps
    if (content.toLowerCase().startsWith('!maplist')) {
        const maps = wc3MapsByFolder['frozenthrone'];
        
        if (!maps || maps.length === 0) {
            await message.reply('❌ No maps loaded yet.');
            return;
        }
        
        // Format maps in chunks to avoid message length limit
        const mapNames = maps.map(m => m.title || m.name || m.filename).sort();
        const chunkSize = 30;
        let response = `**📁 Available Maps (${mapNames.length} total)**\n\`\`\`\n`;
        
        for (let i = 0; i < Math.min(chunkSize, mapNames.length); i++) {
            response += `${i + 1}. ${mapNames[i]}\n`;
        }
        
        response += '\`\`\`';
        
        if (mapNames.length > chunkSize) {
            response += `\n*Showing first ${chunkSize} maps. Use \`!load <mapname>\` to select a map.*`;
        }
        
        await message.reply(response);
        return;
    }
    
    // !load [folder] <mapname> command - select a map by regex from specific folder or all
    if (content.toLowerCase().startsWith('!load ')) {
        // Check if user is registered
        if (!isRegistered(message.author.id)) {
            await message.reply('❌ You must register first before using bot commands.\nUse: `!register <YourBattleTag#12345>`');
            return;
        }
        
        const args = content.substring(6).trim().split(' ');
        const searchTerm = args.join(' ');
        
        if (!searchTerm) {
            await message.reply('❌ Please specify a map name. Usage: `!load <mapname>`');
            return;
        }
        
        const maps = wc3MapsByFolder['frozenthrone'];
        
        if (!maps || maps.length === 0) {
            await message.reply('❌ No maps loaded yet.');
            return;
        }
        
        try {
            // Search for map using regex (case-insensitive)
            const regex = new RegExp(searchTerm, 'i');
            const matchedMap = maps.find(m => {
                const title = m.title || m.name || m.filename;
                return regex.test(title);
            });
            
            if (!matchedMap) {
                await message.reply(`❌ No map found matching "${searchTerm}". Use \`!maplist\` to see available maps.`);
                return;
            }
            
            selectedMap = matchedMap;
            const mapName = selectedMap.title || selectedMap.name || selectedMap.filename;
            await message.reply(`✅ Map loaded: **${mapName}**\nUse \`!pub <gamename>\` to create the lobby.`);
            
        } catch (err) {
            await message.reply(`❌ Invalid search pattern: ${err.message}`);
        }
        
        return;
    }
    
    // !pub <gamename> command - create the lobby with selected map and custom game name
    if (content.toLowerCase().startsWith('!pub')) {
        // Check if user is registered
        if (!isRegistered(message.author.id)) {
            await message.reply('❌ You must register first before using bot commands.\nUse: `!register <YourBattleTag#12345>`');
            return;
        }
        
        // Check if a lobby is already active
        if (lobbyCreated) {
            await message.reply(`❌ A lobby is already active: **${currentLobbyName}**\nWait for the game to finish or use \`!unhost\` first.`);
            return;
        }
        
        // Extract custom game name from command
        const customGameName = content.substring(4).trim();
        
        if (!customGameName) {
            await message.reply('❌ Please specify a game name. Usage: `!pub <gamename>`\nExample: `!pub 1v1 obs WC3`');
            return;
        }
        
        if (!selectedMap) {
            await message.reply('❌ No map selected. Use `!load <mapname>` first.');
            return;
        }
        
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            await message.reply('❌ Not connected to WC3. Please try again later.');
            return;
        }
        
        try {
            const mapPath = selectedMap.filepath + selectedMap.filename;
            const mapName = selectedMap.title || selectedMap.name || selectedMap.filename;
            
            createCustomGame(mapPath, customGameName);
            
            await message.reply(`🎮 Creating lobby with map: **${mapName}**\nGame name: **${customGameName}**`);
            
            // Reset selected map
            selectedMap = null;
            
        } catch (err) {
            await message.reply(`❌ Error creating game: ${err.message}`);
        }
        
        return;
    }
    
    // !priv <gamename> command - create a PRIVATE lobby with selected map and custom game name
    if (content.toLowerCase().startsWith('!priv')) {
        // Check if user is registered
        if (!isRegistered(message.author.id)) {
            await message.reply('❌ You must register first before using bot commands.\nUse: `!register <YourBattleTag#12345>`');
            return;
        }
        
        // Check if a lobby is already active
        if (lobbyCreated) {
            await message.reply(`❌ A lobby is already active: **${currentLobbyName}**\nWait for the game to finish or use \`!unhost\` first.`);
            return;
        }
        
        // Extract custom game name from command
        const customGameName = content.substring(5).trim();
        
        if (!customGameName) {
            await message.reply('❌ Please specify a game name. Usage: `!priv <gamename>`\nExample: `!priv 1v1 obs WC3`');
            return;
        }
        
        if (!selectedMap) {
            await message.reply('❌ No map selected. Use `!load <mapname>` first.');
            return;
        }
        
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            await message.reply('❌ Not connected to WC3. Please try again later.');
            return;
        }
        
        try {
            const mapPath = selectedMap.filepath + selectedMap.filename;
            const mapName = selectedMap.title || selectedMap.name || selectedMap.filename;
            
            createCustomGame(mapPath, customGameName, true); // true = private game
            
            await message.reply(`🔒 Creating PRIVATE lobby with map: **${mapName}**\nGame name: **${customGameName}**`);
            
            // Reset selected map
            selectedMap = null;
            
        } catch (err) {
            await message.reply(`❌ Error creating game: ${err.message}`);
        }
        
        return;
    }
    
    // !register <BattleTag> command - register your Battle.net tag
    if (content.toLowerCase().startsWith('!register ')) {
        const battleTag = content.substring(10).trim();
        
        // Validate Battle.net tag format (Name#12345)
        const battleTagRegex = /^[a-zA-Z0-9]+#[0-9]+$/;
        if (!battleTagRegex.test(battleTag)) {
            await message.reply('❌ Invalid Battle.net tag format. Please use: `!register YourName#12345`');
            return;
        }
        
        // Check if already registered
        if (isRegistered(message.author.id)) {
            const currentTag = getBattleTag(message.author.id);
            await message.reply(`⚠️ You are already registered as **${currentTag}**.\nContact an admin if you need to update your tag.`);
            return;
        }
        
        // Check if this Battle.net tag is already registered by someone else
        const existingUser = Object.keys(registeredUsers).find(userId => registeredUsers[userId] === battleTag);
        if (existingUser) {
            await message.reply('❌ This Battle.net tag is already registered by another user.');
            return;
        }
        
        // Register the user
        registeredUsers[message.author.id] = battleTag;
        saveRegisteredUsers();
        
        const isAdminUser = isAdmin(battleTag);
        let response = `✅ Successfully registered as **${battleTag}**!`;
        if (isAdminUser) {
            response += '\n🔑 Admin privileges enabled - you can use `-start` command in-game.';
        }
        
        await message.reply(response);
        console.log(`✅ User ${message.author.tag} registered as ${battleTag}${isAdminUser ? ' (ADMIN)' : ''}`);
        return;
    }
    
    // !whoami command - check your registration status
    if (content.toLowerCase() === '!whoami') {
        if (!isRegistered(message.author.id)) {
            await message.reply('❌ You are not registered yet.\nUse: `!register <YourBattleTag#12345>`');
            return;
        }
        
        const battleTag = getBattleTag(message.author.id);
        const isAdminUser = isAdmin(battleTag);
        
        let response = `✅ Registered as: **${battleTag}**`;
        if (isAdminUser) {
            response += '\n🔑 Admin status: **YES**';
        }
        
        await message.reply(response);
        return;
    }
    
    // !unhost command - leave/cancel the hosted game (ADMIN ONLY)
    if (content.toLowerCase() === '!unhost') {
        // Check if user is a registered admin
        if (!isRegisteredAdmin(message.author.id)) {
            await message.reply('❌ Only registered admins can use this command.');
            return;
        }
        
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            await message.reply('❌ Not connected to WC3.');
            return;
        }
        
        if (!lobbyCreated) {
            await message.reply('❌ No lobby is currently active.');
            return;
        }
        
        try {
            // Stop game advertisements first
            ws.send(JSON.stringify({
                message: 'StopGameAdvertisements'
            }));
            
            // Then leave the game
            setTimeout(() => {
                ws.send(JSON.stringify({
                    message: 'LeaveGame'
                }));
            }, 100);
            
            const gameName = currentLobbyName || 'Unknown';
            lobbyCreated = false;
            currentLobbyName = '';
            await message.reply(`✅ Unhosting game "${gameName}".`);
            console.log(`🚪 Left game lobby via !unhost command`);
            
        } catch (err) {
            await message.reply(`❌ Error leaving game: ${err.message}`);
        }
        
        return;
    }
});

// Error handling
client.on('error', error => {
    console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

// Login to Discord
client.login(DISCORD_TOKEN);
