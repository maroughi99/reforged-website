import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import '../styles/ProfilePage.css';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, updateProfile, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    battleTag: user?.battleTag || '',
    race: user?.race || '',
    avatar: user?.avatar || ''
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

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

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;

    setUploadingAvatar(true);
    setMessage('');
    setError('');

    try {
      const formData = new FormData();
      formData.append('avatar', avatarFile);

      const token = localStorage.getItem('token');
      const response = await axios.put('http://localhost:5000/api/users/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setMessage('Avatar updated successfully!');
        setAvatarFile(null);
        setAvatarPreview(null);
        // Reload user data
        window.location.reload();
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    const result = await updateProfile(formData);
    
    if (result.success) {
      setMessage('Profile updated successfully!');
    } else {
      setError(result.message);
    }
    
    setLoading(false);
  };

  return (
    <div className="profile-page">
      <div className="container">
        <div className="profile-header">
          <h1>My Profile</h1>
        </div>

        <div className="profile-content">
          <div className="profile-info-card">
            <h2>Account Information</h2>
            <div className="info-row">
              <span className="info-label">Username:</span>
              <span className="info-value">{user.username}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Email:</span>
              <span className="info-value">{user.email}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Member Since:</span>
              <span className="info-value">
                {new Date(user.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="profile-edit-card">
            <h2>Edit Profile</h2>
            
            {message && <div className="success-message">{message}</div>}
            {error && <div className="error-message">{error}</div>}

            <div className="avatar-section">
              <h3>Profile Picture</h3>
              <div className="avatar-upload">
                <div className="avatar-preview">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar preview" />
                  ) : (
                    <img 
                      src={user.avatar ? `http://localhost:5000/uploads/avatars/${user.avatar}` : '/default-avatar.jpg'} 
                      alt={user.username}
                    />
                  )}
                </div>
                <div className="avatar-controls">
                  <input
                    type="file"
                    id="avatar-input"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="avatar-input" className="btn btn-secondary">
                    Choose Image
                  </label>
                  {avatarFile && (
                    <button 
                      onClick={handleAvatarUpload}
                      className="btn btn-primary"
                      disabled={uploadingAvatar}
                    >
                      {uploadingAvatar ? 'Uploading...' : 'Upload'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="profile-form">
              <div className="form-group">
                <label htmlFor="battleTag">Battle Tag</label>
                <input
                  type="text"
                  id="battleTag"
                  name="battleTag"
                  value={formData.battleTag}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="YourName#1234"
                />
              </div>

              <div className="form-group">
                <label htmlFor="race">Favorite Race</label>
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
                </select>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
