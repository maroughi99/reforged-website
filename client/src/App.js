import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LadderPage from './pages/LadderPage';
import CommunityPage from './pages/CommunityPage';
import PostDetailPage from './pages/PostDetailPage';
import CreatePostPage from './pages/CreatePostPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import UserProfilePage from './pages/UserProfilePage';
import ClipsPage from './pages/ClipsPage';
import ClipsGridPage from './pages/ClipsGridPage';
import ClipUploadPage from './pages/ClipUploadPage';
import TournamentsPage from './pages/TournamentsPage';
import ChatPage from './pages/ChatPage';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/ladder" element={<LadderPage />} />
              <Route path="/community" element={<CommunityPage />} />
              <Route path="/community/:id" element={<PostDetailPage />} />
              <Route path="/community/create" element={<CreatePostPage />} />
              <Route path="/clips" element={<ClipsGridPage />} />
              <Route path="/clips/:id" element={<ClipsPage />} />
              <Route path="/clips/upload" element={<ClipUploadPage />} />
              <Route path="/tournaments" element={<TournamentsPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/profile/:username" element={<UserProfilePage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/chat/:username" element={<ChatPage />} />
            </Routes>
          </main>
          <footer className="footer">
            <p>&copy; 2025 Warcraft 3 Reforged Community. Built with passion for the Horde and Alliance.</p>
          </footer>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
