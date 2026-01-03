import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { clipService } from '../services/dataService';
import '../styles/ClipUploadPage.css';

const ClipUploadPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    race: '',
    tags: ''
  });
  const [videoFile, setVideoFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

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

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        setError('Video must be under 100MB');
        return;
      }
      setVideoFile(file);
      setPreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!videoFile) {
      setError('Please select a video file');
      return;
    }

    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const data = new FormData();
      data.append('video', videoFile);
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('race', formData.race);
      data.append('tags', JSON.stringify(
        formData.tags.split(',').map(t => t.trim()).filter(t => t)
      ));

      await clipService.uploadClip(data);
      navigate('/clips');
    } catch (err) {
      setError(err.response?.data?.message || 'Error uploading clip');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="clip-upload-page">
      <div className="container">
        <h1>Upload Reel</h1>

        <form onSubmit={handleSubmit} className="upload-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="video">Video File *</label>
            <input
              type="file"
              id="video"
              accept="video/mp4,video/mov,video/avi,video/webm"
              onChange={handleVideoChange}
              className="file-input"
            />
            <p className="help-text">Max 100MB. Formats: MP4, MOV, AVI, WebM</p>
          </div>

          {preview && (
            <div className="video-preview">
              <video src={preview} controls />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              maxLength="100"
              className="form-input"
              placeholder="Epic 1v3 comeback!"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              maxLength="500"
              rows="3"
              className="form-textarea"
              placeholder="Describe your clip..."
            />
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
              <option value="">Select a race</option>
              <option value="Human">Human</option>
              <option value="Orc">Orc</option>
              <option value="Undead">Undead</option>
              <option value="NightElf">Night Elf</option>
              <option value="Random">Random</option>
              <option value="All">All Races</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="tags">Tags</label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              className="form-input"
              placeholder="comeback, micro, funny (comma separated)"
            />
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              onClick={() => navigate('/clips')}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload Clip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClipUploadPage;
