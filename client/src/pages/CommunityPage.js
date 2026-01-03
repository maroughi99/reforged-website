import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { postService } from '../services/dataService';
import '../styles/CommunityPage.css';

const CommunityPage = () => {
  const { isAuthenticated } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: '',
    race: '',
    page: 1
  });
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    loadPosts();
  }, [filters]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const data = await postService.getPosts(filters);
      setPosts(data.data);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCategoryColor = (category) => {
    const colors = {
      Strategy: '#4caf50',
      News: '#2196f3',
      Discussion: '#ff9800',
      Guide: '#9c27b0',
      Tournament: '#f44336',
      'Patch Notes': '#00bcd4',
      Other: '#757575'
    };
    return colors[category] || '#757575';
  };

  return (
    <div className="community-page">
      <div className="container">
        <div className="community-header">
          <div>
            <h1>Community Hub</h1>
            <p className="subtitle">Share strategies, discuss, and connect</p>
          </div>
          {isAuthenticated && (
            <Link to="/community/create" className="btn btn-create">
              Create Post
            </Link>
          )}
        </div>

        <div className="community-controls">
          <div className="filters">
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value, page: 1 })}
              className="wc3-dropdown"
            >
              <option value="">All Categories</option>
              <option value="Strategy">Strategy</option>
              <option value="News">News</option>
              <option value="Discussion">Discussion</option>
              <option value="Guide">Guide</option>
              <option value="Tournament">Tournament</option>
              <option value="Patch Notes">Patch Notes</option>
              <option value="Other">Other</option>
            </select>

            <select
              value={filters.race}
              onChange={(e) => setFilters({ ...filters, race: e.target.value, page: 1 })}
              className="wc3-dropdown"
            >
              <option value="">All Races</option>
              <option value="Human">Human</option>
              <option value="Orc">Orc</option>
              <option value="Undead">Undead</option>
              <option value="NightElf">Night Elf</option>
              <option value="All">General</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading">Loading posts...</div>
        ) : posts.length === 0 ? (
          <div className="no-posts">
            <p>No posts found. Be the first to create one!</p>
            {isAuthenticated && (
              <Link to="/community/create" className="btn btn-primary">
                Create First Post
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="posts-list">
              {posts.map((post) => (
                <Link 
                  key={post._id} 
                  to={`/community/${post._id}`} 
                  className="post-card"
                >
                  <div className="post-header">
                    <div className="post-meta">
                      <span 
                        className="category-badge"
                        style={{ backgroundColor: getCategoryColor(post.category) }}
                      >
                        {post.category}
                      </span>
                      {post.race && post.race !== 'All' && (
                        <span className="race-badge-small">{post.race}</span>
                      )}
                      {post.isPinned && (
                        <span className="pinned-badge">📌 Pinned</span>
                      )}
                    </div>
                  </div>

                  <h3 className="post-title">{post.title}</h3>
                  
                  <p className="post-preview">
                    {post.content.substring(0, 150)}
                    {post.content.length > 150 && '...'}
                  </p>

                  <div className="post-footer">
                    <div className="post-author">
                      <span className="author-name">
                        {post.author?.username || 'Unknown'}
                        {post.author?.isAdmin && (
                          <span className="admin-badge">ADMIN</span>
                        )}
                      </span>
                      {post.author?.race && (
                        <span className="author-race">• {post.author.race}</span>
                      )}
                    </div>
                    <div className="post-stats">
                      <span>👁️ {post.views}</span>
                      <span>❤️ {post.likes?.length || 0}</span>
                      <span>💬 {post.comments?.length || 0}</span>
                      <span className="post-date">{formatDate(post.createdAt)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {pagination.pages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                  disabled={filters.page === 1}
                  className="btn btn-pagination"
                >
                  Previous
                </button>
                <span className="page-info">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                  disabled={filters.page === pagination.pages}
                  className="btn btn-pagination"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CommunityPage;
