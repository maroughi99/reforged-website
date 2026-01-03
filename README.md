# Warcraft 3 Reforged - Ladder & Community Website

A comprehensive website for Warcraft 3 Reforged featuring ladder rankings, community posts, and user authentication.

## Features

- 🏆 **Ladder Rankings**: View and track player rankings with stats
- 💬 **Community Posts**: Share strategies, updates, and discussions
- 🔐 **Authentication**: Secure login/logout with JWT tokens
- 🎨 **Warcraft 3 Theme**: Authentic UI using game assets

## Tech Stack

- **Frontend**: React, React Router, Axios
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)

## Installation

1. Install dependencies for both server and client:
```bash
npm run install-all
```

2. Create a `.env` file in the root directory (use `.env.example` as template):
```bash
cp .env.example .env
```

3. Make sure MongoDB is running locally or update `MONGODB_URI` in `.env`

4. Start the development servers:
```bash
npm run dev
```

This will start:
- Backend server on http://localhost:5000
- Frontend React app on http://localhost:3000

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Ladder Rankings
- `GET /api/ladder` - Get all ladder rankings
- `GET /api/ladder/:id` - Get specific player ranking
- `POST /api/ladder` - Add/update player ranking (protected)

### Community Posts
- `GET /api/posts` - Get all community posts
- `GET /api/posts/:id` - Get specific post
- `POST /api/posts` - Create new post (protected)
- `PUT /api/posts/:id` - Update post (protected, author only)
- `DELETE /api/posts/:id` - Delete post (protected, author only)

## Project Structure

```
ReforgedWebsite/
├── server/
│   ├── index.js              # Express server entry point
│   ├── models/               # Mongoose models
│   ├── routes/               # API routes
│   └── middleware/           # Auth & validation middleware
├── client/
│   ├── public/               # Static files & game assets
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── pages/            # Page components
│   │   ├── context/          # Auth context
│   │   ├── services/         # API services
│   │   └── styles/           # CSS styling
│   └── package.json
├── package.json
└── .env
```

## Usage

1. **Register/Login**: Create an account or login
2. **View Ladder**: Check current player rankings
3. **Community Posts**: Read and create posts (requires login)
4. **Profile**: Manage your account

## Development

- Backend runs on port 5000
- Frontend proxies API requests to backend
- Hot reload enabled for both frontend and backend

## License

ISC
