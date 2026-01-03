import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import '../styles/UserProfilePage.css';

const UserProfilePage = () => {
  const { username } = useParams();
  const { user: currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFriend, setIsFriend] = useState(false);
  const [friendRequestSent, setFriendRequestSent] = useState(false);
  const [userClips, setUserClips] = useState([]);
  const [userPosts, setUserPosts] = useState([]);

  useEffect(() => {
    loadProfile();
    loadUserActivity();
  }, [username]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:5000/api/users/profile/${username}`);
      setProfile(response.data.data);
    } catch (error) {
      console.error('Error loading profile:', error);
      setError('User not found');
    } finally {
      setLoading(false);
    }
  };

  const loadUserActivity = async () => {
    try {
      const [clipsRes, postsRes] = await Promise.all([
        axios.get(`http://localhost:5000/api/clips?author=${username}&limit=10`),
        axios.get(`http://localhost:5000/api/posts?author=${username}&limit=10`)
      ]);
      setUserClips(clipsRes.data.data || []);
      setUserPosts(postsRes.data.data || []);
    } catch (error) {
      console.error('Error loading activity:', error);
    }
  };

  const handleAddFriend = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/friends/request`, 
        { recipientUsername: username },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFriendRequestSent(true);
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  const handleMessage = () => {
    navigate(`/chat/${username}`);
  };

  if (loading) {
    return <div className="user-profile-loading">Loading profile...</div>;
  }

  if (error || !profile) {
    return (
      <div className="user-profile-error">
        <h2>❌ User Not Found</h2>
        <Link to="/" className="btn-back">← Back to Home</Link>
      </div>
    );
  }

  const isOwnProfile = currentUser && currentUser.username === username;

  return (
    <div className="user-profile-page">
      <div className="user-profile-header">
        <button onClick={() => navigate(-1)} className="btn-back">←</button>
        <h1>Profile</h1>
      </div>

      <div className="user-profile-content">
        <div className="user-profile-card">
          <div className="user-profile-avatar">
            {profile.avatar && profile.avatar !== 'default-avatar.jpg' ? (
              <img src={`http://localhost:5000/uploads/avatars/${profile.avatar}`} alt={profile.username} />
            ) : (
              <div className="avatar-placeholder">
                {profile.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <h2 className="user-profile-username">{profile.username}</h2>
          
          {profile.race && (
            <div className="user-profile-race">
              <span className="race-badge">{profile.race}</span>
            </div>
          )}

          {profile.isAdmin && (
            <div className="admin-badge">⚡ Admin</div>
          )}

          <div className="user-profile-stats">
            <div className="stat-item">
              <span className="stat-value">{profile.clipsCount || 0}</span>
              <span className="stat-label">Clips</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{profile.friendsCount || 0}</span>
              <span className="stat-label">Friends</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{profile.postsCount || 0}</span>
              <span className="stat-label">Posts</span>
            </div>
          </div>

          {!isOwnProfile && isAuthenticated && (
            <div className="user-profile-actions">
              {isFriend ? (
                <button className="btn-message" onClick={handleMessage}>
                  💬 Message
                </button>
              ) : friendRequestSent ? (
                <button className="btn-pending" disabled>
                  ⏳ Request Sent
                </button>
              ) : (
                <button className="btn-add-friend" onClick={handleAddFriend}>
                  ➕ Add Friend
                </button>
              )}
            </div>
          )}

          {isOwnProfile && (
            <div className="user-profile-actions">
              <Link to="/profile" className="btn-edit-profile">
                ⚙️ Edit Profile
              </Link>
            </div>
          )}
        </div>

        <div className="user-profile-activity">
          <h3>Recent Activity</h3>
          
          {userClips.length === 0 && userPosts.length === 0 ? (
            <p className="coming-soon">No activity yet</p>
          ) : (
            <div className="activity-content">
              {userClips.length > 0 && (
                <div className="activity-section">
                  <h4>Recent Clips ({userClips.length})</h4>
                  <div className="activity-items">
                    {userClips.map(clip => (
                      <div key={clip._id} className="activity-item" onClick={() => navigate(`/clips/${clip._id}`)}>
                        {clip.thumbnail && (
                          <img src={clip.thumbnail} alt={clip.title} className="activity-thumbnail" />
                        )}
                        <div className="activity-details">
                          <h5>{clip.title}</h5>
                          <p>{clip.views || 0} views • {clip.likes?.length || 0} likes</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {userPosts.length > 0 && (
                <div className="activity-section">
                  <h4>Recent Posts ({userPosts.length})</h4>
                  <div className="activity-items">
                    {userPosts.map(post => (
                      <div key={post._id} className="activity-item" onClick={() => navigate(`/community/${post._id}`)}>
                        <div className="activity-details">
                          <h5>{post.title}</h5>
                          <p>{post.likes?.length || 0} likes • {post.comments?.length || 0} comments</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;
