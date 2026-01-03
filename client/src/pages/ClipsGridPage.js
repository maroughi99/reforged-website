import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { clipService } from '../services/dataService';
import '../styles/ClipsGridPage.css';

const ClipsGridPage = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('all'); // all, youtube, twitch, uploaded
  const [sortBy, setSortBy] = useState('-createdAt');

  useEffect(() => {
    loadClips();
  }, [sortBy]);

  const loadClips = async () => {
    try {
      setLoading(true);
      const data = await clipService.getClips({ limit: 5000, sort: sortBy });
      
      // Only randomize if sort is random
      const ordered = sortBy === 'random' 
        ? data.data.sort(() => Math.random() - 0.5)
        : data.data;
      
      setClips(ordered);
    } catch (error) {
      console.error('Error loading clips:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClips = clips.filter(clip => {
    // Search filter
    const matchesSearch = !searchQuery || 
      clip.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clip.authorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clip.description?.toLowerCase().includes(searchQuery.toLowerCase());

    // Platform filter
    let matchesPlatform = true;
    if (filterPlatform === 'youtube') {
      matchesPlatform = clip.embedType === 'youtube';
    } else if (filterPlatform === 'twitch') {
      matchesPlatform = clip.embedType === 'twitch';
    } else if (filterPlatform === 'uploaded') {
      matchesPlatform = !clip.isEmbedded;
    }

    return matchesSearch && matchesPlatform;
  });

  const handleLike = async (clipId, e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      await clipService.likeClip(clipId);
      setClips(prevClips => prevClips.map(clip => {
        if (clip._id === clipId) {
          const isLiked = clip.likes?.includes(user?.id);
          return {
            ...clip,
            likes: isLiked 
              ? clip.likes.filter(id => id !== user.id)
              : [...(clip.likes || []), user.id]
          };
        }
        return clip;
      }));
    } catch (error) {
      console.error('Error liking clip:', error);
    }
  };

  const openClip = (clip) => {
    // Open clip in full screen view
    navigate(`/clips/${clip._id}`);
  };

  if (loading) {
    return <div className="clips-loading">Loading clips...</div>;
  }

  return (
    <div className="clips-grid-page">
      <div className="clips-grid-header">
        <div className="header-left">
          <Link to="/" className="btn-back">←</Link>
          <h1>Reels</h1>
        </div>
        
        <div className="header-center">
          <input
            type="text"
            className="search-input"
            placeholder="Search clips..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="header-right">
          <select 
            className="filter-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            title="Sort clips"
          >
            <option value="-createdAt">🕐 Newest First</option>
            <option value="createdAt">🕐 Oldest First</option>
            <option value="-views">👁️ Most Viewed</option>
            <option value="views">👁️ Least Viewed</option>
            <option value="-likes">❤️ Most Liked</option>
            <option value="random">🎲 Random</option>
          </select>
          
          <select 
            className="filter-select"
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
            title="Filter by platform"
          >
            <option value="all">All Platforms</option>
            <option value="youtube">YouTube</option>
            <option value="twitch">Twitch</option>
            <option value="uploaded">Uploaded</option>
          </select>
          
          {isAuthenticated && (
            <Link to="/clips/upload" className="btn-upload">
              + Upload
            </Link>
          )}
        </div>
      </div>

      <div className="clips-grid">
        {filteredClips.length === 0 ? (
          <div className="no-results">
            <p>No clips found</p>
          </div>
        ) : (
          filteredClips.map((clip) => {
            const isLiked = user && clip.likes?.includes(user.id);
            
            return (
              <div 
                key={clip._id} 
                className="clip-card"
                onClick={() => openClip(clip)}
              >
                <div className="clip-thumbnail">
                  {clip.thumbnail ? (
                    <img 
                      src={clip.thumbnail} 
                      alt={clip.title}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.querySelector('.no-thumbnail').style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className="no-thumbnail" style={{ display: clip.thumbnail ? 'none' : 'flex' }}>
                    <span>🎬</span>
                  </div>
                  
                  <div className="clip-platform-badge">
                    {clip.embedType === 'youtube' && '📺'}
                    {clip.embedType === 'twitch' && '🎮'}
                    {!clip.isEmbedded && '⬆️'}
                  </div>

                  <div className="clip-stats">
                    <span className="stat">👁️ {clip.views || 0}</span>
                    <span className="stat">❤️ {clip.likes?.length || 0}</span>
                  </div>
                </div>

                <div className="clip-info">
                  <h3 className="clip-title">{clip.title}</h3>
                  <p className="clip-author">{clip.authorName || clip.author?.username || 'Community'}</p>
                  
                  {clip.tags && clip.tags.length > 0 && (
                    <div className="clip-tags">
                      {clip.tags.slice(0, 3).map((tag, i) => (
                        <span key={i} className="tag">#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  className={`like-btn ${isLiked ? 'liked' : ''}`}
                  onClick={(e) => handleLike(clip._id, e)}
                >
                  ❤️
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ClipsGridPage;
