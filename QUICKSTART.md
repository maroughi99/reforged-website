# Quick Start Commands

## First Time Setup
```powershell
# 1. Install all dependencies (already done!)
npm run install-all

# 2. Make sure MongoDB is running
mongod

# 3. Start the development servers
npm run dev
```

## Daily Development
```powershell
# Start both frontend and backend
npm run dev

# Or start them separately:
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend
npm run client
```

## URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- API Health Check: http://localhost:5000/api/health

## Testing the API

### Register a User
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"username":"TestPlayer","email":"test@example.com","password":"password123","race":"Human"}'
```

### Login
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"test@example.com","password":"password123"}'
```

## MongoDB Options

### Local MongoDB
```powershell
# Start MongoDB
mongod

# Or as Windows Service
net start MongoDB
```

### MongoDB Atlas (Cloud - Recommended)
1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account
3. Create cluster
4. Get connection string
5. Update .env: `MONGODB_URI=mongodb+srv://...`

## Features to Test

1. **Homepage** - View hero section and features
2. **Register** - Create a new account
3. **Login** - Sign in with your account
4. **Ladder** - View rankings (will be empty initially)
5. **Community** - Browse and create posts
6. **Profile** - Update your profile settings

## Adding Sample Data

You can add sample ladder rankings through the API after logging in:

```javascript
// In browser console after logging in:
fetch('/api/ladder', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  },
  body: JSON.stringify({
    battleTag: 'Player#1234',
    race: 'Human',
    wins: 50,
    losses: 30,
    mmr: 2500,
    league: 'Diamond',
    division: 3
  })
}).then(r => r.json()).then(console.log)
```
