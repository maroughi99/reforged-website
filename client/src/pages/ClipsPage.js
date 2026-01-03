import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { clipService } from '../services/dataService';
import '../styles/ClipsSinglePage.css';

const ClipsPage = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [clips, setClips] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [embedError, setEmbedError] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const [sortBy, setSortBy] = useState('-createdAt');
  const [showFilters, setShowFilters] = useState(false);
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const lastTapRef = useRef(0);
  
  const clip = clips[currentIndex];

  useEffect(() => {
    if (id) {
      loadClips();
    }
  }, [id, sortBy]);
  
  // Handle scroll to change clips
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      
      const scrollTop = containerRef.current.scrollTop;
      const itemHeight = containerRef.current.offsetHeight;
      const newIndex = Math.round(scrollTop / itemHeight);
      
      if (newIndex !== currentIndex && newIndex >= 0 && newIndex < clips.length) {
        setCurrentIndex(newIndex);
        setEmbedError(false);
        setShowComments(false);
        // Update URL without reloading
        window.history.replaceState(null, '', `/clips/${clips[newIndex]._id}`);
      }
    };
    
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [currentIndex, clips]);

  // Track view after 2 seconds
  useEffect(() => {
    if (clip) {
      const timer = setTimeout(() => {
        clipService.incrementClipViews(clip._id).catch(err => 
          console.log('Error tracking view:', err)
        );
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [clip]);

  const loadClips = async () => {
    try {
      setLoading(true);
      // Load all clips with selected sort
      const data = await clipService.getClips({ limit: 5000, sort: sortBy });
      
      // Find the index of the current clip BEFORE shuffling
      const index = data.data.findIndex(c => c._id === id);
      
      if (index !== -1) {
        // Put the selected clip first, then add the rest
        const selectedClip = data.data[index];
        const otherClips = data.data.filter((c, i) => i !== index);
        
        // Only shuffle if sort is random, otherwise keep the order
        const orderedClips = sortBy === 'random' 
          ? otherClips.sort(() => Math.random() - 0.5)
          : otherClips;
        
        setClips([selectedClip, ...orderedClips]);
        setCurrentIndex(0);
      } else {
        // If clip not found in initial load, fetch it and add to beginning
        const clipData = await clipService.getClip(id);
        const orderedClips = sortBy === 'random'
          ? data.data.sort(() => Math.random() - 0.5)
          : data.data;
        setClips([clipData.data, ...orderedClips]);
        setCurrentIndex(0);
      }
    } catch (error) {
      console.error('Error loading clips:', error);
      navigate('/clips');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      setShowLikeAnimation(true);
      setTimeout(() => setShowLikeAnimation(false), 1000);
      
      await clipService.likeClip(clip._id);
      
      setClips(prevClips => prevClips.map((c, i) => 
        i === currentIndex ? {
          ...c,
          likes: c.likes?.includes(user?.id)
            ? c.likes.filter(id => id !== user.id)
            : [...(c.likes || []), user.id]
        } : c
      ));
    } catch (error) {
      console.error('Error liking clip:', error);
    }
  };

  const handleDoubleTap = (e) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      handleLike(e);
    }
    lastTapRef.current = now;
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!commentText.trim()) return;

    try {
      const data = await clipService.addClipComment(clip._id, commentText);
      setClips(prevClips => prevClips.map((c, i) => 
        i === currentIndex ? data.data : c
      ));
      setCommentText('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleAddReply = async (commentId, e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!replyText.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/clips/${clip._id}/comment/${commentId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: replyText })
      });

      const data = await response.json();
      
      if (data.success) {
        setClips(prevClips => prevClips.map((c, i) => 
          i === currentIndex ? data.data : c
        ));
        setReplyText('');
        setReplyingTo(null);
      }
    } catch (error) {
      console.error('Error adding reply:', error);
    }
  };

  const handleDeleteComment = async (commentId, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const data = await clipService.deleteClipComment(clip._id, commentId);
      setClips(prevClips => prevClips.map((c, i) => 
        i === currentIndex ? data.data : c
      ));
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this clip?')) return;
    
    try {
      await clipService.deleteClip(clip._id);
      navigate('/clips');
    } catch (error) {
      console.error('Error deleting clip:', error);
    }
  };

  const renderVideo = () => {
    if (clip.isEmbedded) {
      if (clip.embedType === 'youtube') {
        let videoId = '';
        try {
          if (clip.videoUrl.includes('youtube.com/watch')) {
            videoId = new URL(clip.videoUrl).searchParams.get('v');
          } else if (clip.videoUrl.includes('youtu.be/')) {
            videoId = clip.videoUrl.split('youtu.be/')[1].split('?')[0];
          } else if (clip.videoUrl.includes('youtube.com/embed/')) {
            videoId = clip.videoUrl.split('youtube.com/embed/')[1].split('?')[0];
          } else {
            // Fallback: try to extract anything that looks like a video ID
            videoId = clip.videoUrl.split('/').pop().split('?')[0];
          }
        } catch (error) {
          console.error('Error parsing YouTube URL:', clip.videoUrl, error);
        }
        
        if (!videoId) {
          return (
            <div className="video-error">
              <div className="error-icon">❌</div>
              <p className="error-message">Unable to load YouTube video</p>
              <p className="error-hint">Invalid video URL</p>
            </div>
          );
        }
        
        return (
          <iframe
            key={currentIndex}
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`}
            title={clip.title}
            frameBorder="0"
            allow="autoplay; encrypted-media"
            allowFullScreen
            className="video-iframe"
          />
        );
      } else if (clip.embedType === 'twitch') {
        // Get the current domain for parent parameter
        const parentDomain = window.location.hostname || 'localhost';
        
        // The videoUrl is already a full embed URL from the database
        let embedUrl = clip.videoUrl;
        
        // If it's just a slug or regular URL, convert it to embed URL
        if (!embedUrl.includes('embed')) {
          let clipSlug = embedUrl.split('/').pop().split('?')[0];
          embedUrl = `https://clips.twitch.tv/embed?clip=${clipSlug}&parent=${parentDomain}&autoplay=true`;
        } else {
          // Ensure parent parameter matches current domain
          const url = new URL(embedUrl);
          url.searchParams.set('parent', parentDomain);
          url.searchParams.set('autoplay', 'true');
          url.searchParams.delete('muted');
          embedUrl = url.toString();
        }
        
        console.log('Twitch embed URL:', embedUrl);
        
        if (embedError) {
          const clipSlug = embedUrl.includes('clip=') 
            ? embedUrl.split('clip=')[1].split('&')[0]
            : embedUrl.split('/').pop();
            
          return (
            <div className="embed-fallback">
              <div className="fallback-icon">🎮</div>
              <h3>Unable to embed this Twitch clip</h3>
              <p>This clip requires content classification or has embed restrictions.</p>
              <a 
                href={`https://clips.twitch.tv/${clipSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-watch-twitch"
              >
                Watch on Twitch →
              </a>
            </div>
          );
        }
        
        return (
          <iframe
            key={currentIndex}
            src={embedUrl}
            title={clip.title}
            frameBorder="0"
            allow="autoplay; fullscreen"
            allowFullScreen
            className="video-iframe"
            height="100%"
            width="100%"
          />
        );
      }
    }

    return (
      <video
        ref={videoRef}
        src={clip.videoUrl}
        controls
        autoPlay
        muted
        loop
        className="video-player"
        onDoubleClick={handleDoubleTap}
      />
    );
  };

  if (loading) {
    return <div className="clips-loading">Loading...</div>;
  }

  if (!clips.length || !clip) {
    return (
      <div className="clips-loading">
        <p>Clip not found</p>
        <Link to="/clips" className="btn-back-error">← Back to Clips</Link>
      </div>
    );
  }

  const isLiked = user && clip.likes?.includes(user.id);
  const isAdmin = user?.isAdmin === true;
  const isAuthor = user && clip.author?._id === user.id;

  return (
    <div className="clip-single-page">
      <div className="clips-scroll-container" ref={containerRef}>
        {clips.map((c, index) => (
          <div key={c._id} className="clip-scroll-item">
            <div className="clip-content">
              <div className="video-container" onDoubleClick={handleDoubleTap}>
                {index === currentIndex ? (
                  <>
                    {error ? (
                      <div className="video-error">
                        <div className="error-icon">👻</div>
                        <p className="error-message">{error}</p>
                        <p className="error-hint">This clip may have been removed or is no longer available</p>
                        {(isAdmin || isAuthor) && (
                          <button onClick={handleDelete} className="btn-delete-clip">
                            Remove from Database
                          </button>
                        )}
                      </div>
                    ) : (
                      renderVideo()
                    )}
                    {showLikeAnimation && (
                      <div className="like-animation">❤️</div>
                    )}
                    
                    {/* Action buttons overlaid on video */}
                    <div className="clip-actions">
                      <button
                        className={`action-btn like ${isLiked ? 'active' : ''}`}
                        onClick={handleLike}
                      >
                        <span className="icon">❤️</span>
                        <span className="count">{c.likes?.length || 0}</span>
                      </button>

                      <button
                        className="action-btn comment"
                        onClick={() => setShowComments(!showComments)}
                      >
                        <span className="icon">💬</span>
                        <span className="count">{c.comments?.length || 0}</span>
                      </button>

                      <div className="action-btn views">
                        <span className="icon">👁️</span>
                        <span className="count">{c.views || 0}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="clip-placeholder">
                    {c.thumbnail && (
                      <img src={c.thumbnail} alt={c.title} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                    )}
                  </div>
                )}
              </div>

              {index === currentIndex && (
                <div className="clip-sidebar">
                  <div className="sidebar-header">
                    <h3>Comments ({c.comments?.length || 0})</h3>
                  </div>
                  
                  <div className="sidebar-content">
                    <div className="clip-info">
                      <div className="author-info">
                        <span className="author-name">
                          {c.authorName || c.author?.username || 'Community'}
                        </span>
                        {c.embedType && (
                          <span className="platform-badge">
                            {c.embedType === 'youtube' && '📺 YouTube'}
                            {c.embedType === 'twitch' && '🎮 Twitch'}
                          </span>
                        )}
                      </div>

                      {c.description && (
                        <p className="description">{c.description}</p>
                      )}

                      {c.tags && c.tags.length > 0 && (
                        <div className="tags">
                          {c.tags.map((tag, i) => (
                            <span key={i} className="tag">#{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="comments-section">
                      {isAuthenticated && (
                        <form onSubmit={handleAddComment} className="comment-form">
                          <input
                            type="text"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Add a comment..."
                            className="comment-input"
                          />
                          <button type="submit" className="btn-submit">
                            Post
                          </button>
                        </form>
                      )}

                      <div className="comments-list">
                        {c.comments?.map((comment) => (
                          <div key={comment._id} className="comment">
                            <div className="comment-header">
                              {comment.username ? (
                                <Link 
                                  to={`/profile/${comment.username}`} 
                                  className="comment-author"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {comment.username}
                                </Link>
                              ) : (
                                <span className="comment-author">
                                  Anonymous
                                </span>
                              )}
                              <span className="comment-date">
                                {new Date(comment.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="comment-text">{comment.content}</p>
                            
                            <div className="comment-actions">
                              {isAuthenticated && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReplyingTo(replyingTo === comment._id ? null : comment._id);
                                  }}
                                  className="btn-reply"
                                >
                                  Reply
                                </button>
                              )}
                              {(isAdmin || (user && comment.user === user.id)) && (
                                <button
                                  onClick={(e) => handleDeleteComment(comment._id, e)}
                                  className="btn-delete-comment"
                                >
                                  Delete
                                </button>
                              )}
                            </div>

                            {/* Replies */}
                            {comment.replies && comment.replies.length > 0 && (
                              <div className="replies-list">
                                {comment.replies.map((reply) => (
                                  <div key={reply._id} className="reply">
                                    <div className="comment-header">
                                      {reply.username ? (
                                        <Link 
                                          to={`/profile/${reply.username}`} 
                                          className="comment-author"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {reply.username}
                                        </Link>
                                      ) : (
                                        <span className="comment-author">
                                          Anonymous
                                        </span>
                                      )}
                                      <span className="comment-date">
                                        {new Date(reply.createdAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <p className="comment-text">{reply.content}</p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Reply Form */}
                            {replyingTo === comment._id && (
                              <form onSubmit={(e) => handleAddReply(comment._id, e)} className="reply-form">
                                <input
                                  type="text"
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  placeholder={`Reply to ${comment.username}...`}
                                  className="comment-input"
                                  autoFocus
                                />
                                <div className="reply-form-actions">
                                  <button type="submit" className="btn-submit">
                                    Reply
                                  </button>
                                  <button 
                                    type="button" 
                                    onClick={() => {
                                      setReplyingTo(null);
                                      setReplyText('');
                                    }}
                                    className="btn-cancel"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </form>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClipsPage;
