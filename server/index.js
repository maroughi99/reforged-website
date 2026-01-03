const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { initWC3WebSocket } = require('./services/wc3WebSocket');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection (optional - server will run without MongoDB)
if (process.env.MONGODB_URI && process.env.MONGODB_URI !== 'mongodb://localhost:27017/warcraft3-reforged') {
  mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected successfully');
  })
  .catch((err) => console.error('❌ MongoDB connection error:', err.message));
} else {
  console.log('⚠️  MongoDB not configured - running without database');
  console.log('💡 To enable MongoDB, update MONGODB_URI in .env file');
  console.log('   Example: mongodb+srv://username:password@cluster.mongodb.net/warcraft3');
}

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/ladder', require('./routes/ladder'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/clips', require('./routes/clips'));
app.use('/api/users', require('./routes/users'));
app.use('/api/friends', require('./routes/friends'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/tournaments', require('./routes/tournaments'));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  
  // Initialize WC3 WebSocket connection for live ladder data
  console.log('🎮 Initializing WC3 WebSocket connection...');
  initWC3WebSocket();

  // Auto-fetch content if enabled
  if (process.env.AUTO_FETCH_ENABLED === 'true') {
    console.log('🔄 Starting auto-fetch service...');
    const { startAutoFetch } = require('../auto-fetch-all-sources');
    setTimeout(() => {
      startAutoFetch();
    }, 5000); // Wait 5 seconds for server to fully start
  } else {
    console.log('💡 Auto-fetch disabled. Set AUTO_FETCH_ENABLED=true in .env to enable');
    console.log('   Or run manually: npm run fetch-content');
  }
});
