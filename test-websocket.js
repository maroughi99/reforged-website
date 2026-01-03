const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Configuration
const WS_URL = 'ws://127.0.0.1:60928/webui-socket/4763707965438818736';
const LOG_FILE = path.join(__dirname, 'websocket-log.txt');

// Create/clear log file
fs.writeFileSync(LOG_FILE, '');

// Helper function to log to both console and file
function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(message);
    fs.appendFileSync(LOG_FILE, logMessage + '\n');
}

log('🎮 Testing WC3 WebSocket connection...');
log(`📡 Connecting to: ${WS_URL}`);

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
    log('✅ Connected to WC3 WebSocket!');
    log('⏳ Listening for messages...');
});

ws.on('message', (data) => {
    try {
        const message = JSON.parse(data);
        
        if (message.messageType) {
            log(`📨 Received: ${message.messageType}`);
            
            // Log full payload for leaderboard messages
            if (message.messageType === 'UpdateLeaderboardData') {
                const formatted = JSON.stringify(message.payload, null, 2);
                log('📊 LEADERBOARD DATA:');
                log(formatted);
            }
            
            if (message.messageType === 'UpdateLeaderboardHighestRankData') {
                const formatted = JSON.stringify(message.payload, null, 2);
                log('🏆 HIGHEST RANK DATA:');
                log(formatted);
            }
        } else {
            log('📦 Received message without messageType: ' + JSON.stringify(message, null, 2));
        }
    } catch (err) {
        log('📦 Received non-JSON data: ' + data.toString());
    }
});

ws.on('error', (error) => {
    log('❌ WebSocket error: ' + error.message);
});

ws.on('close', () => {
    log('🔌 WebSocket disconnected');
    log(`📝 Log saved to: ${LOG_FILE}`);
    process.exit(0);
});

// Keep process alive
log('Press Ctrl+C to exit');
log(`📝 Logging to: ${LOG_FILE}`);
