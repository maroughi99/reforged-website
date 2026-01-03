# Warcraft 3 Reforged Website - Setup Guide

## 🎮 Quick Start Guide

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn package manager

### Installation Steps

#### 1. Install Dependencies

```powershell
# Install server dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

#### 2. Configure Environment

Create a `.env` file in the root directory:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/warcraft3-reforged
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d
NODE_ENV=development
```

#### 3. Start MongoDB

Make sure MongoDB is running. If you have MongoDB installed locally:

```powershell
# Start MongoDB service
mongod
```

Or use MongoDB Atlas (cloud):
- Sign up at https://www.mongodb.com/cloud/atlas
- Create a cluster
- Get your connection string
- Update `MONGODB_URI` in `.env`

#### 4. Run the Application

**Option A: Development Mode (Recommended)**

Run both frontend and backend simultaneously:

```powershell
npm run dev
```

This starts:
- Backend API: http://localhost:5000
- Frontend React App: http://localhost:3000

**Option B: Separate Terminals**

Terminal 1 (Backend):
```powershell
npm run server
```

Terminal 2 (Frontend):
```powershell
npm run client
```

#### 5. Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

## 🏗️ Project Structure

```
ReforgedWebsite/
├── server/
│   ├── index.js              # Express server
│   ├── models/               # MongoDB models
│   │   ├── User.js          # User model
│   │   ├── Ladder.js        # Ladder rankings
│   │   └── Post.js          # Community posts
│   ├── routes/              # API routes
│   │   ├── auth.js          # Authentication
│   │   ├── ladder.js        # Ladder rankings
│   │   └── posts.js         # Community posts
│   └── middleware/          # Custom middleware
│       └── auth.js          # JWT authentication
├── client/
│   ├── public/              # Static files
│   └── src/
│       ├── components/      # React components
│       │   └── Navbar.js
│       ├── pages/           # Page components
│       │   ├── HomePage.js
│       │   ├── LadderPage.js
│       │   ├── CommunityPage.js
│       │   ├── PostDetailPage.js
│       │   ├── CreatePostPage.js
│       │   ├── LoginPage.js
│       │   ├── RegisterPage.js
│       │   └── ProfilePage.js
│       ├── context/         # React context
│       │   └── AuthContext.js
│       ├── services/        # API services
│       │   ├── api.js
│       │   └── dataService.js
│       ├── styles/          # CSS files
│       ├── App.js
│       └── index.js
├── package.json
├── .env
└── README.md
```

## 🔑 Key Features

### 1. Ladder Rankings
- View player rankings by MMR
- Filter by race, league, season
- Search players by Battle Tag
- Detailed player statistics (W/L, Win Rate, Games Played)

### 2. Community Posts
- Create, read, update, delete posts
- Categories: Strategy, News, Discussion, Guide, Tournament, etc.
- Like/Unlike posts
- Comment system
- Filter by category and race

### 3. Authentication
- User registration and login
- JWT-based authentication
- Profile management
- Protected routes for authenticated users

### 4. Warcraft 3 Theming
- Dark fantasy theme
- Race-specific colors (Human, Orc, Undead, Night Elf)
- Gold accents inspired by WC3 UI
- Responsive design for mobile and desktop

## 📡 API Endpoints

### Authentication
```
POST   /api/auth/register    - Register new user
POST   /api/auth/login       - Login user
GET    /api/auth/me          - Get current user (protected)
PUT    /api/auth/profile     - Update profile (protected)
```

### Ladder Rankings
```
GET    /api/ladder           - Get all rankings
GET    /api/ladder/search    - Search by Battle Tag
GET    /api/ladder/:id       - Get specific ranking
POST   /api/ladder           - Add/Update ranking (protected)
DELETE /api/ladder/:id       - Delete ranking (protected)
```

### Community Posts
```
GET    /api/posts            - Get all posts
GET    /api/posts/:id        - Get specific post
POST   /api/posts            - Create post (protected)
PUT    /api/posts/:id        - Update post (protected, author only)
DELETE /api/posts/:id        - Delete post (protected, author only)
POST   /api/posts/:id/like   - Like/Unlike post (protected)
POST   /api/posts/:id/comment - Add comment (protected)
```

## 🎨 Customization

### Adding Game Assets

You can enhance the visual theme by adding Warcraft 3 assets from the UI folder:

1. Copy assets from `ui/` folder to `client/public/assets/`
2. Update CSS to reference the assets
3. Common assets to use:
   - Buttons: `ui/buttons/`
   - Cursors: `ui/cursor/`
   - Race icons: from `ui/console/`

### Color Scheme

The website uses Warcraft 3-inspired colors defined in `client/src/App.css`:

```css
--primary-gold: #ffd700;      /* Warcraft gold */
--human-color: #4a90e2;       /* Alliance blue */
--orc-color: #d32f2f;         /* Horde red */
--undead-color: #9c27b0;      /* Scourge purple */
--nightelf-color: #00bcd4;    /* Nature cyan */
```

## 🔧 Development Tips

### Adding Test Data

You can add sample ladder rankings and posts via the API or create seed scripts.

Example: Create a test user and ranking using Postman or curl:

```powershell
# Register a user
curl -X POST http://localhost:5000/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{\"username\":\"TestPlayer\",\"email\":\"test@example.com\",\"password\":\"password123\",\"race\":\"Human\"}'
```

### Running in Production

```powershell
# Build the React frontend
cd client
npm run build

# Start the server (serves both API and static files)
cd ..
npm start
```

## 🐛 Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running
- Check connection string in `.env`
- Verify network/firewall settings

### Port Already in Use
- Change PORT in `.env` file
- Kill process using the port:
  ```powershell
  netstat -ano | findstr :5000
  taskkill /PID <PID> /F
  ```

### CORS Errors
- Verify proxy setting in `client/package.json`
- Check CORS configuration in `server/index.js`

## 📝 Next Steps

1. **Add More Features**
   - Match history tracking
   - Tournament brackets
   - Clan/guild system
   - Real-time chat

2. **Enhance UI**
   - Add more game assets from UI folder
   - Implement race-specific themes
   - Add loading animations

3. **Improve Performance**
   - Add Redis caching
   - Implement pagination
   - Optimize database queries

4. **Deploy**
   - Deploy backend to Heroku/Railway/Render
   - Deploy frontend to Netlify/Vercel
   - Use MongoDB Atlas for database

## 🤝 Contributing

Feel free to enhance the website with:
- Additional game data from the UI folder
- New features and improvements
- Bug fixes and optimizations

## 📜 License

ISC

---

**For the Horde! For the Alliance! For Azeroth!** ⚔️
