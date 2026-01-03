import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Navbar.css';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <span className="logo-text">Warcraft III</span>
          <span className="logo-subtext">Reforged</span>
        </Link>

        <div className="hamburger" onClick={toggleMobileMenu}>
          <span className={isMobileMenuOpen ? 'bar active' : 'bar'}></span>
          <span className={isMobileMenuOpen ? 'bar active' : 'bar'}></span>
          <span className={isMobileMenuOpen ? 'bar active' : 'bar'}></span>
        </div>
        
        <ul className={isMobileMenuOpen ? 'nav-menu active' : 'nav-menu'}>
          <li className="nav-item">
            <Link to="/" className="nav-link" onClick={closeMobileMenu}>Home</Link>
          </li>
          <li className="nav-item">
            <Link to="/ladder" className="nav-link" onClick={closeMobileMenu}>Ladder</Link>
          </li>
          <li className="nav-item">
            <Link to="/community" className="nav-link" onClick={closeMobileMenu}>Community</Link>
          </li>
          <li className="nav-item">
            <Link to="/clips" className="nav-link" onClick={closeMobileMenu}>Reels</Link>
          </li>
          <li className="nav-item">
            <Link to="/tournaments" className="nav-link" onClick={closeMobileMenu}>Tournaments</Link>
          </li>

          <li className="nav-item nav-auth-mobile">
            {isAuthenticated ? (
              <>
                <Link to="/profile" className="nav-link profile-link" onClick={closeMobileMenu}>
                  <span className="username">{user.username}</span>
                  {user.race && <span className="race-badge">{user.race}</span>}
                </Link>
                <button onClick={() => { logout(); closeMobileMenu(); }} className="btn btn-logout">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-login" onClick={closeMobileMenu}>Login</Link>
                <Link to="/register" className="btn btn-register" onClick={closeMobileMenu}>Register</Link>
              </>
            )}
          </li>
        </ul>

        <div className="nav-auth nav-auth-desktop">
          {isAuthenticated ? (
            <>
              <Link to="/profile" className="nav-link profile-link">
                <span className="username">{user.username}</span>
                {user.race && <span className="race-badge">{user.race}</span>}
              </Link>
              <button onClick={logout} className="btn btn-logout">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-login">Login</Link>
              <Link to="/register" className="btn btn-register">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
