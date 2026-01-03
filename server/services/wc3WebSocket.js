const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Configuration
const WS_URL = 'ws://127.0.0.1:53602/webui-socket/10245920821244979827';
const DATA_FILE = path.join(__dirname, '../../ladder-data.json');
let ws = null;
let ladderData = {
    '1v1': [],
    '2v2': [],
    '2v2arranged': [],
    '3v3': [],
    '3v3arranged': [],
    '4v4': [],
    '4v4arranged': [],
    'ffa': [],
    'sffa': []
};
let highestRankData = null;
let isConnected = false;
let currentPage = 0;
let totalPages = 0;
let isFetchingAll = false;
let requestedPage = -1;
let lastReceivedPage = -1;
let stuckCount = 0;
let currentGameMode = '1v1';

// Track profile requests
const profileRequests = new Map(); // battleTag -> { resolve, reject, timeout }
let pendingProfileData = {}; // Temporary storage for profile data pieces
let pendingMatchHistories = new Map(); // battleTag -> { histories: {}, expectedModes: [], resolve, reject, timeout }

// Load saved data on startup
function loadSavedData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const savedData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            if (savedData.ladderData && typeof savedData.ladderData === 'object') {
                // Merge saved data with default structure
                Object.keys(savedData.ladderData).forEach(key => {
                    if (Array.isArray(savedData.ladderData[key])) {
                        ladderData[key] = savedData.ladderData[key];
                    }
                });
                const totalPlayers = Object.values(ladderData).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
                console.log(`📂 Loaded saved ladder data: ${totalPlayers} total players`);
                Object.keys(ladderData).forEach(mode => {
                    if (ladderData[mode].length > 0) {
                        console.log(`   ${mode}: ${ladderData[mode].length} players`);
                    }
                });
            }
            if (savedData.highestRankData) {
                highestRankData = savedData.highestRankData;
            }
        }
    } catch (error) {
        console.error('❌ Error loading saved data:', error.message);
    }
}

// Save data to file
function saveData() {
    try {
        const dataToSave = {
            ladderData,
            highestRankData,
            lastUpdated: new Date().toISOString()
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(dataToSave, null, 2));
        console.log('💾 Saved ladder data to disk');
    } catch (error) {
        console.error('❌ Error saving data:', error.message);
    }
}

// Initialize WC3 WebSocket connection
function initWC3WebSocket() {
    // Load saved data first
    loadSavedData();
    
    if (ws) {
        ws.close();
    }
    
    ws = new WebSocket(WS_URL);
    
    ws.on('open', () => {
        console.log('🎮 Connected to WC3 WebSocket');
        isConnected = true;
        
        // Don't auto-request data, wait for user to load leaderboard in WC3
    });
    
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            
            // Log ALL messages to file (temporarily for debugging profile navigation)
            if (message.messageType) {
                const logFile = path.join(__dirname, '../../wc3-messages.log');
                const logEntry = `${new Date().toISOString()} - ${message.messageType}\n`;
                fs.appendFileSync(logFile, logEntry);
                
                // Capture team stats and profile messages
                if (message.messageType.includes('Profile') || 
                    message.messageType.includes('profile') ||
                    message.messageType === 'MMStats' ||
                    message.messageType === 'ArrangedTeamStats' ||
                    message.messageType === 'MatchHistoryUpdate') {
                    console.log('📋 Important message:', message.messageType);
                    const detailFile = path.join(__dirname, '../../important-messages.json');
                    fs.appendFileSync(detailFile, JSON.stringify(message, null, 2) + '\n---\n');
                }
            }
            
            // Handle leaderboard data updates
            if (message.messageType === 'UpdateLeaderboardData') {
                handleLeaderboardData(message.payload);
            }
            
            // Handle highest rank data updates
            if (message.messageType === 'UpdateLeaderboardHighestRankData') {
                console.log('🏆 Received UpdateLeaderboardHighestRankData');
                handleHighestRankData(message.payload);
            }
            
            // Handle profile data
            if (message.messageType === 'UpdateProfileData') {
                handleProfileData(message.payload);
            }
            
            // Handle profile data with toon stats (final complete data)
            if (message.messageType === 'UpdateProfileDataWithToonStats') {
                handleProfileDataWithStats(message.payload);
            }
            
            // Handle match history updates
            if (message.messageType === 'MatchHistoryUpdate') {
                handleMatchHistoryUpdate(message.payload);
            }
        } catch (err) {
            // Ignore parse errors
        }
    });
    
    ws.on('error', (error) => {
        console.error('❌ WC3 WebSocket error:', error.message);
        isConnected = false;
    });
    
    ws.on('close', () => {
        console.log('🔌 WC3 WebSocket disconnected');
        isConnected = false;
        // Reconnect after 5 seconds
        setTimeout(initWC3WebSocket, 5000);
    });
}

// Request leaderboard data from WC3
function requestLeaderboardData(page = 0, resetData = false) {
    if (!ws || !isConnected) {
        console.log('⚠️ Cannot request leaderboard - not connected');
        return;
    }
    
    // Don't actually request - just wait for WC3 to send data when user changes leaderboard
    console.log('⚠️ requestLeaderboardData called but we wait for WC3 to send data passively');
}

// Handle leaderboard data
function handleLeaderboardData(payload) {
    if (!payload || !payload.message) {
        console.log('⚠️ No message in payload');
        return;
    }
    
    const message = payload.message;
    const rows = message.rows || [];
    
    console.log(`🔍 DEBUG: Received ${rows.length} rows from WC3`);
    
    if (rows.length === 0) {
        console.log('⚠️ No rows in leaderboard data');
        return;
    }
    
    // Detect game mode from the data
    const gameMode = message.gameMode || message.gametype || '1v1';
    console.log(`🎮 Detected game mode: ${gameMode}`);
    
    // No auto-pagination, just store whatever WC3 sends
    
    // Update pagination info
    currentPage = message.currentpage || 0;
    totalPages = message.totalpages || 1;
    
    // Transform WC3 leaderboard data to our format
    const newPlayers = rows.map((entry) => {
        const player = entry.players?.[0]; // Get first player from team
        const totalGames = (entry.wins || 0) + (entry.losses || 0);
        const winRate = totalGames > 0 ? ((entry.wins / totalGames) * 100).toFixed(1) : 0;
        
        // Get all team members with their races and avatars
        const teammates = entry.players?.map(p => ({
            battleTag: p.battleTag,
            race: mapRace(p.race),
            portrait: p.avatarId || 0
        })).filter(p => p.battleTag) || [];
        
        return {
            _id: player?.battleTag || `player-${entry.rank}`,
            battleTag: player?.battleTag || 'Unknown',
            teammates: teammates, // Include all team members with races and portraits
            rank: entry.rank || 0,
            race: mapRace(entry.race || player?.race),
            portrait: player?.avatarId || 0,
            wins: entry.wins || 0,
            losses: entry.losses || 0,
            mmr: entry.mmr || 0,
            league: mapLeague(entry.division),
            division: entry.division || 1,
            winRate: parseFloat(winRate),
            level: entry.level || 0,
            xp: entry.xp || 0
        };
    });
    
    // Replace data for this game mode (since WC3 shows current page only)
    if (!ladderData[gameMode]) {
        ladderData[gameMode] = [];
    }
    ladderData[gameMode] = newPlayers;
    
    console.log(`✅ Updated ${gameMode} ladder data: ${ladderData[gameMode].length} players (Page ${currentPage + 1}/${totalPages})`);
    
    // Save data
    saveData();
}

// Handle highest rank data
function handleHighestRankData(payload) {
    if (!payload) {
        return;
    }
    
    highestRankData = {
        battleTag: payload.battleTag || 'Unknown',
        rank: payload.rank || 0,
        mmr: payload.mmr || payload.rating || 0,
        season: payload.season || 'Current'
    };
    
    console.log(`✅ Updated highest rank data: ${highestRankData.battleTag} - Rank ${highestRankData.rank}`);
    saveData(); // Save when highest rank data updates
}

// Map race ID/name to our format
function mapRace(race) {
    if (typeof race === 'number') {
        const raceMap = {
            1: 'human',
            2: 'orc',
            4: 'nightelf',
            8: 'undead',
            32: 'random'
        };
        return raceMap[race] || 'human';
    }
    
    if (typeof race === 'string') {
        // Handle both "night_elf" and "nightelf" formats
        return race.toLowerCase().replace('_', '');
    }
    
    return 'human';
}

// Map league/tier to our format (based on division numbers from WC3)
function mapLeague(division) {
    if (typeof division === 'number') {
        const leagueMap = {
            7: 'grandmaster',
            6: 'master',
            5: 'diamond',
            4: 'platinum',
            3: 'gold',
            2: 'silver',
            1: 'bronze',
            0: 'unranked'
        };
        return leagueMap[division] || 'unranked';
    }
    
    if (typeof division === 'string') {
        return division.toLowerCase();
    }
    
    return 'unranked';
}

// Get current ladder data
function getLadderData(gameMode = '1v1') {
    return ladderData[gameMode] || [];
}

// Get highest rank data
function getHighestRankData() {
    return highestRankData;
}

// Check if connected
function isWC3Connected() {
    return isConnected;
}

// Refresh leaderboard data manually
function refreshLeaderboard() {
    if (isConnected) {
        requestLeaderboardData(0, true);
    }
}

// Request player profile from WC3
function requestProfile(battleTag) {
    const logFile = path.join(__dirname, '../../profile-debug.json');
    const log = (msg) => {
        const entry = `${new Date().toISOString()} - ${msg}\n`;
        fs.appendFileSync(logFile, entry);
        console.log(msg);
    };
    
    if (!ws || !isConnected) {
        log('⚠️ Cannot request profile - not connected');
        throw new Error('WC3 WebSocket not connected');
    }
    
    if (ws.readyState !== WebSocket.OPEN) {
        log('⚠️ WebSocket not in OPEN state: ' + ws.readyState);
        throw new Error('WC3 WebSocket not ready');
    }
    
    log(`📤 Requesting profile for: ${battleTag}`);
    fs.appendFileSync(logFile, '\n=== NEW PROFILE REQUEST ===\n');
    fs.appendFileSync(logFile, `BattleTag: ${battleTag}\n\n`);
    
    try {
        // Send single profile request (don't overwhelm WC3)
        ws.send(JSON.stringify({
            message: "GetProfile",
            payload: { battleTag: battleTag }
        }));
        log(`✅ Profile request sent successfully`);
        
        // DISABLED: Match history requests to prevent overwhelming WC3
        // These requests were causing the game to crash
        log(`⚠️ Match history requests disabled to prevent game crashes`);
        
        /* DISABLED CODE
        // Request match history with delay to prevent overwhelming WC3
        const gameModes = ['1v1', '2v2', '3v3', '4v4'];
        log(`⚠️ Match history requests disabled to prevent game crashes`);
        
        /* DISABLED CODE
        // Request match history with delay to prevent overwhelming WC3
        const gameModes = ['1v1', '2v2', '3v3', '4v4'];
        log(`📤 Requesting match histories (throttled)...`);
        
        let delay = 100; // Start with 100ms delay
        
        gameModes.forEach((gameMode, index) => {
            setTimeout(() => {
                if (!ws || ws.readyState !== WebSocket.OPEN) return;
                
                // Request solo/unranked matches
                ws.send(JSON.stringify({
                    message: "GetMatchHistory",
                    payload: {
                        battleTag: battleTag,
                        gameMode: gameMode,
                        arrangedTeams: false,
                        gatewayId: 0
                    }
                }));
                log(`  Sent ${gameMode} request`);
                
                // Request arranged team matches (skip for 1v1)
                if (gameMode !== '1v1') {
                    setTimeout(() => {
                        if (!ws || ws.readyState !== WebSocket.OPEN) return;
                        ws.send(JSON.stringify({
                            message: "GetMatchHistory",
                            payload: {
                                battleTag: battleTag,
                                gameMode: gameMode,
                                arrangedTeams: true,
                                gatewayId: 0
                            }
                        }));
                        log(`  Sent ${gameMode} AT request`);
                    }, 50);
                }
            }, delay * index);
        });
        
        log(`✅ Match history requests queued with throttling`);
        */
    } catch (error) {
        log('❌ Error sending profile request: ' + error);
        throw error;
    }
}

// Handle profile data (first response with basic info)
function handleProfileData(payload) {
    const logFile = path.join(__dirname, '../../profile-debug.json');
    const log = (msg, data = null) => {
        fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`);
        if (data) {
            fs.appendFileSync(logFile, JSON.stringify(data, null, 2) + '\n');
        }
        console.log(msg);
    };
    
    log(`📊 handleProfileData called`);
    log('Full payload:', payload);
    
    const battleTagFull = payload?.details?.battle_tag_full;
    const details = payload?.details;
    
    if (battleTagFull && details) {
        const battleTagNormalized = battleTagFull.toLowerCase();
        log(`📊 Received profile data for: ${battleTagFull} (normalized: ${battleTagNormalized})`);
        if (!pendingProfileData[battleTagNormalized]) {
            pendingProfileData[battleTagNormalized] = {};
        }
        pendingProfileData[battleTagNormalized].basicData = details;
        log(`  Stored basic data at key: ${battleTagNormalized}`);
    } else {
        log(`⚠️ Profile data payload missing details`);
    }
}

// Handle match history update
function handleMatchHistoryUpdate(payload) {
    const logFile = path.join(__dirname, '../../profile-debug.json');
    const log = (msg, data = null) => {
        fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`);
        if (data) {
            fs.appendFileSync(logFile, JSON.stringify(data, null, 2) + '\n');
        }
        console.log(msg);
    };
    
    log(`📊 handleMatchHistoryUpdate called`);
    log(`  Payload keys: ${Object.keys(payload || {}).join(', ')}`);
    
    const matchHistory = payload?.matchHistory;
    
    if (!matchHistory) {
        log(`⚠️ No match history in payload`);
        log('Full payload:', payload);
        return;
    }
    
    // Extract game mode from the payload (matchHistory has keys like '1v1', '2v2', etc.)
    const gameModes = Object.keys(matchHistory);
    log(`  Game modes in match history: ${gameModes.join(', ')}`);
    
    gameModes.forEach(gameMode => {
        const matches = matchHistory[gameMode]?.matches || [];
        
        log(`  ${gameMode}: ${matches.length} matches`);
        
        if (matches.length === 0) return;
        
        // Get battleTag from first match
        const firstMatch = matches[0];
        const battleTag = firstMatch.teamMembers?.[0]?.battleTag;
        
        if (!battleTag) {
            log(`⚠️ No battleTag found in match history for ${gameMode}`);
            return;
        }
        
        const battleTagNormalized = battleTag.toLowerCase();
        log(`📊 Processing ${matches.length} ${gameMode} matches for ${battleTag} (normalized: ${battleTagNormalized})`);
        
        // Calculate stats from matches
        let wins = 0;
        let losses = 0;
        
        matches.forEach(match => {
            // Find the player in teamMembers
            const playerMember = match.teamMembers?.find(m => m.battleTag === battleTag);
            if (playerMember?.matchStats?.victory === 1) {
                wins++;
            } else if (playerMember?.matchStats?.victory === 0) {
                losses++;
            }
        });
        
        log(`  ${gameMode} Stats: ${wins}W-${losses}L`);
        
        // Store stats for this battleTag
        if (!pendingProfileData[battleTagNormalized]) {
            pendingProfileData[battleTagNormalized] = {};
        }
        if (!pendingProfileData[battleTagNormalized].matchStats) {
            pendingProfileData[battleTagNormalized].matchStats = {};
        }
        pendingProfileData[battleTagNormalized].matchStats[gameMode] = {
            wins,
            losses,
            totalGames: wins + losses
        };
        
        log(`  Total stats stored at key ${battleTagNormalized}: ${Object.keys(pendingProfileData[battleTagNormalized].matchStats).join(', ')}`);
    });
}

// Handle profile data with stats (complete data)
function handleProfileDataWithStats(payload) {
    const logFile = path.join(__dirname, '../../profile-debug.json');
    const dataLogFile = path.join(__dirname, '../../profile-responses.json');
    
    const log = (msg, data = null) => {
        fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`);
        if (data) {
            fs.appendFileSync(logFile, JSON.stringify(data, null, 2) + '\n');
        }
        console.log(msg);
    };
    
    log(`📊 handleProfileDataWithStats called`);
    log(`  Payload keys: ${Object.keys(payload || {}).join(', ')}`);
    
    const details = payload?.details;
    
    if (details?.seasons) {
        // The battleTag might not be in this message, so find it from pending data
        let battleTagNormalized = null;
        let battleTag = details.battle_tag_full;
        
        // If no battleTag in this message, find it from pending data
        if (!battleTag || battleTag === 'unknown') {
            // Look through pending data to find which request this belongs to
            const pendingKeys = Object.keys(pendingProfileData);
            if (pendingKeys.length > 0) {
                // Use the first pending key (should only be one active request)
                battleTagNormalized = pendingKeys[0];
                battleTag = pendingProfileData[battleTagNormalized]?.basicData?.battle_tag_full || battleTagNormalized;
                log(`🔍 Found battleTag from pending data: ${battleTag}`);
            }
        }
        
        if (!battleTagNormalized) {
            battleTagNormalized = (battleTag || 'unknown').toLowerCase();
        }
        
        // Save the complete profile response to a separate log
        const timestamp = new Date().toISOString();
        const profileResponse = {
            timestamp,
            battleTag,
            battleTagNormalized,
            details,
            pendingData: pendingProfileData[battleTagNormalized] || {}
        };
        fs.appendFileSync(dataLogFile, JSON.stringify(profileResponse, null, 2) + '\n---\n');
        log(`💾 Saved complete profile response for: ${battleTag} (key: ${battleTagNormalized})`);
        
        log(`📊 Received complete profile stats`);
        log(`  Pending requests: ${Array.from(profileRequests.keys()).join(', ')}`);
        log(`  Pending profile data keys: ${Object.keys(pendingProfileData).join(', ')}`);
        
        // Find matching pending request (now everything is lowercase)
        for (const [requestedBattleTag, request] of profileRequests.entries()) {
            log(`  Checking request for: ${requestedBattleTag} against ${battleTagNormalized}`);
            
            // Direct match since everything is now normalized to lowercase
            if (requestedBattleTag.toLowerCase() === battleTagNormalized) {
                log(`  ✅ Found matching request for ${requestedBattleTag}`);
                
                // Check if basicData exists
                if (!pendingProfileData[battleTagNormalized].basicData) {
                    log(`  ⚠️ No basic data yet for ${battleTagNormalized}, storing seasons and waiting...`);
                    pendingProfileData[battleTagNormalized].seasons = details.seasons;
                    continue;
                }
                
                // Clear the original timeout
                if (request.timeout) {
                    clearTimeout(request.timeout);
                }
                
                // Wait 2 seconds for match history data to arrive before resolving
                log(`  Waiting 2 seconds for match history data...`);
                const delayedTimeout = setTimeout(() => {
                    try {
                        // Check if request still exists (might have been cancelled)
                        if (!profileRequests.has(requestedBattleTag)) {
                            log(`  Request was cancelled for ${requestedBattleTag}`);
                            return;
                        }
                        
                        // Check if data still exists
                        if (!pendingProfileData[battleTagNormalized]) {
                            log(`  ⚠️ Pending data was cleared for ${battleTagNormalized}`);
                            return;
                        }
                        
                        // Parse seasons data to extract match stats by race
                        const matchStats = {};
                        if (details.seasons && details.seasons.length > 0) {
                            const currentSeason = details.seasons[details.seasons.length - 1]; // Get latest season
                            
                            // Map race IDs to names
                            const raceMap = {
                                1: 'Human',
                                2: 'Orc',
                                3: 'Undead', 
                                4: 'Night Elf',
                                5: 'Random',
                                6: 'All Races',
                                8: 'Undead'
                            };
                            
                            if (currentSeason.races) {
                                currentSeason.races.forEach(raceData => {
                                    const winsEntry = raceData.stats?.find(s => s.statName === 'wins');
                                    const lossesEntry = raceData.stats?.find(s => s.statName === 'losses');
                                    
                                    const wins = winsEntry ? winsEntry.sum || 0 : 0;
                                    const losses = lossesEntry ? lossesEntry.sum || 0 : 0;
                                    
                                    if (wins > 0 || losses > 0) {
                                        const raceName = raceMap[raceData.race] || `Race ${raceData.race}`;
                                        matchStats[raceName] = {
                                            wins: wins,
                                            losses: losses,
                                            totalGames: wins + losses
                                        };
                                        log(`  📊 ${raceName}: ${wins}W-${losses}L`);
                                    }
                                });
                            }
                        }
                        
                        // Merge with any match history stats we might have
                        const existingMatchStats = pendingProfileData[battleTagNormalized].matchStats || {};
                        Object.assign(matchStats, existingMatchStats);
                        
                        const profileData = {
                            ...(pendingProfileData[battleTagNormalized].basicData || {}),
                            seasons: details.seasons,
                            matchStats: matchStats
                        };
                        
                        log(`  Match stats collected: ${Object.keys(profileData.matchStats).join(', ')}`);
                        log('Full match stats:', profileData.matchStats);
                        
                        // Resolve promise
                        if (request.resolve) {
                            request.resolve(profileData);
                        }
                        
                        // Cleanup
                        profileRequests.delete(requestedBattleTag);
                        delete pendingProfileData[battleTagNormalized];
                        
                        log(`✅ Profile request completed for: ${requestedBattleTag}`);
                        fs.appendFileSync(logFile, '\n=== REQUEST COMPLETED ===\n\n');
                    } catch (error) {
                        log(`❌ Error in delayed resolution: ${error.message}`);
                        if (request.reject) {
                            request.reject(error);
                        }
                        profileRequests.delete(requestedBattleTag);
                    }
                }, 2000);
                
                // Update the timeout reference
                request.timeout = delayedTimeout;
                
                break;
            } else {
                log(`  No match: "${requestedBattleTag.toLowerCase()}" !== "${battleTagNormalized}"`);
            }
        }
    } else {
        log(`⚠️ Profile stats payload missing seasons`);
        log('Full payload:', payload);
    }
}

module.exports = {
    initWC3WebSocket,
    getLadderData,
    getHighestRankData,
    isWC3Connected,
    refreshLeaderboard,
    requestProfile,
    profileRequests
};
