import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/HomePage.css';

const HomePage = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">WC3 Arena</h1>
          <p className="hero-subtitle">Join the Battle • Climb the Ladder • Compete in Tournaments • Conquer Azeroth</p>
          <div className="hero-buttons">
            <Link to="/ladder" className="btn btn-primary btn-large">
              View Ladder Rankings
            </Link>
            <Link to="/tournaments" className="btn btn-secondary btn-large">
              Join Tournaments
            </Link>
            <a 
              href="https://us.shop.battle.net/en-us/product/warcraft-3-reforged" 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn btn-primary btn-large"
            >
              Buy Warcraft III: Reforged
            </a>
            {!isAuthenticated && (
              <Link to="/register" className="btn btn-accent btn-large">
                Create Account
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="features-section">
        <div className="container">
          <h2 className="section-title">What We Offer</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🏆</div>
              <h3>Ladder Rankings</h3>
              <p>Track your progress and compete with players worldwide. View detailed stats, MMR, and league standings in real-time.</p>
              <Link to="/ladder" className="feature-link">View Ladder →</Link>
            </div>

            <div className="feature-card">
              <div className="feature-icon">💬</div>
              <h3>Community Hub</h3>
              <p>Share strategies, discuss patches, and connect with fellow players. Create posts, comment, and engage with the community.</p>
              <Link to="/community" className="feature-link">Visit Community →</Link>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🎬</div>
              <h3>Epic Reels</h3>
              <p>Watch and share amazing gameplay moments, pro plays, and entertaining clips from the Warcraft III community.</p>
              <Link to="/clips" className="feature-link">Watch Reels →</Link>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🏅</div>
              <h3>Tournaments</h3>
              <p>Compete in organized tournaments, sign up for events, track brackets, and prove you're the ultimate champion.</p>
              <Link to="/tournaments" className="feature-link">View Tournaments →</Link>
            </div>

            <div className="feature-card">
              <div className="feature-icon">💬</div>
              <h3>Live Chat</h3>
              <p>Connect with other players instantly. Send direct messages, make friends, and coordinate matches in real-time.</p>
              <Link to="/chat" className="feature-link">Open Chat →</Link>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Player Profiles</h3>
              <p>Detailed statistics including wins, losses, win rate, favorite race, and complete match history for every player.</p>
              <Link to="/ladder" className="feature-link">View Stats →</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="races-section">
        <div className="container">
          <h2 className="section-title">Choose Your Race</h2>
          <div className="races-grid">
            <div className="race-card human">
              <h3>Human</h3>
              <p>The resilient Alliance forces with powerful Paladins and versatile units.</p>
            </div>
            <div className="race-card orc">
              <h3>Orc</h3>
              <p>The mighty Horde with brutal strength and powerful shamanic magic.</p>
            </div>
            <div className="race-card undead">
              <h3>Undead</h3>
              <p>The relentless Scourge with necromantic powers and dark magic.</p>
            </div>
            <div className="race-card nightelf">
              <h3>Night Elf</h3>
              <p>The ancient Kaldorei with agile units and nature-based abilities.</p>
            </div>
          </div>
        </div>
      </section>

      {!isAuthenticated && (
        <section className="cta-section">
          <div className="cta-content">
            <h2>Ready to Join?</h2>
            <p>Create an account to track your progress and engage with the community</p>
            <Link to="/register" className="btn btn-cta">Create Account</Link>
          </div>
        </section>
      )}
    </div>
  );
};

export default HomePage;
