import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { postService } from '../services/dataService';
import '../styles/CreatePostPage.css';

const CreatePostPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'Discussion',
    race: 'All',
    tags: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.title.length < 5) {
      setError('Title must be at least 5 characters');
      return;
    }

    if (formData.content.length < 10) {
      setError('Content must be at least 10 characters');
      return;
    }

    try {
      setLoading(true);
      const tags = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const response = await postService.createPost({
        ...formData,
        tags
      });

      if (response.success) {
        navigate(`/community/${response.data._id}`);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Error creating post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-post-page">
      <div className="container">
        <div className="create-post-header">
          <h1>Create New Post</h1>
          <button onClick={() => navigate('/community')} className="btn btn-secondary">
            Cancel
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="create-post-form">
          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter post title..."
              maxLength="100"
              required
              className="form-input"
            />
            <span className="char-count">{formData.title.length}/100</span>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="form-select"
              >
                <option value="Discussion">Discussion</option>
                <option value="Strategy">Strategy</option>
                <option value="News">News</option>
                <option value="Guide">Guide</option>
                <option value="Tournament">Tournament</option>
                <option value="Patch Notes">Patch Notes</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="race">Race</label>
              <select
                id="race"
                name="race"
                value={formData.race}
                onChange={handleChange}
                className="form-select"
              >
                <option value="All">All Races</option>
                <option value="Human">Human</option>
                <option value="Orc">Orc</option>
                <option value="Undead">Undead</option>
                <option value="NightElf">Night Elf</option>
                <option value="Random">Random</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="content">Content *</label>
            <textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={handleChange}
              placeholder="Write your post content..."
              maxLength="5000"
              rows="12"
              required
              className="form-textarea"
            />
            <span className="char-count">{formData.content.length}/5000</span>
          </div>

          <div className="form-group">
            <label htmlFor="tags">Tags (comma-separated)</label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              placeholder="e.g., strategy, beginners, tips"
              className="form-input"
            />
          </div>

          <div className="form-actions">
            <button 
              type="submit" 
              className="btn btn-primary btn-large"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePostPage;
