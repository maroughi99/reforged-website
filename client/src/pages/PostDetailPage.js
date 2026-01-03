import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { postService } from '../services/dataService';
import '../styles/PostDetailPage.css';

const PostDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    loadPost();
  }, [id]);

  const loadPost = async () => {
    try {
      setLoading(true);
      const data = await postService.getPost(id);
      setPost(data.data);
      if (user) {
        setLiked(data.data.likes?.includes(user.id));
      }
    } catch (error) {
      console.error('Error loading post:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      await postService.likePost(id);
      setLiked(!liked);
      loadPost();
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;

    try {
      await postService.addComment(id, comment);
      setComment('');
      loadPost();
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    try {
      await postService.deletePost(id);
      navigate('/community');
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await postService.deleteComment(id, commentId);
      loadPost();
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="loading">Loading post...</div>;
  }

  if (!post) {
    return <div className="error">Post not found</div>;
  }

  const isAuthor = user && post.author._id === user.id;

  return (
    <div className="post-detail-page">
      <div className="container">
        <Link to="/community" className="back-link">← Back to Community</Link>

        <article className="post-detail">
          <div className="post-detail-header">
            <div className="post-badges">
              <span className="category-badge">{post.category}</span>
              {post.race && post.race !== 'All' && (
                <span className="race-badge">{post.race}</span>
              )}
            </div>
            
            {isAuthor && (
              <div className="post-actions">
                <button className="btn btn-edit">Edit</button>
                <button onClick={handleDelete} className="btn btn-delete">Delete</button>
              </div>
            )}
          </div>

          <h1 className="post-detail-title">{post.title}</h1>

          <div className="post-detail-meta">
            <div className="author-info">
              <span className="author-name">
                {post.author.username}
                {post.author.isAdmin && (
                  <span className="admin-badge">ADMIN</span>
                )}
              </span>
              {post.author.race && (
                <span className="author-race">• {post.author.race}</span>
              )}
            </div>
            <span className="post-date">{formatDate(post.createdAt)}</span>
          </div>

          <div className="post-content">
            {post.content.split('\n').map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>

          {post.tags && post.tags.length > 0 && (
            <div className="post-tags">
              {post.tags.map((tag, index) => (
                <span key={index} className="tag">#{tag}</span>
              ))}
            </div>
          )}

          <div className="post-stats-bar">
            <button 
              onClick={handleLike} 
              className={`btn btn-like ${liked ? 'liked' : ''}`}
              disabled={!isAuthenticated}
            >
              ❤️ {post.likes?.length || 0} {liked ? 'Liked' : 'Like'}
            </button>
            <span className="stat">👁️ {post.views} views</span>
            <span className="stat">💬 {post.comments?.length || 0} comments</span>
          </div>
        </article>

        <section className="comments-section">
          <h2>Comments ({post.comments?.length || 0})</h2>

          {isAuthenticated ? (
            <form onSubmit={handleComment} className="comment-form">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Write a comment..."
                className="comment-input"
                rows="3"
                maxLength="500"
              />
              <button type="submit" className="btn btn-primary">Post Comment</button>
            </form>
          ) : (
            <div className="login-prompt">
              <Link to="/login">Login</Link> to post a comment
            </div>
          )}

          <div className="comments-list">
            {post.comments && post.comments.length > 0 ? (
              post.comments.map((comment, index) => {
                const isCommentAuthor = user && comment.user?._id === user.id;
                const canDelete = isCommentAuthor || (user && user.isAdmin);
                
                return (
                  <div key={comment._id || index} className="comment">
                    <div className="comment-header">
                      <span className="comment-author">
                        {comment.username || comment.user?.username || 'Unknown'}
                        {(comment.user?.isAdmin) && (
                          <span className="admin-badge">ADMIN</span>
                        )}
                      </span>
                      <div className="comment-header-right">
                        <span className="comment-date">
                          {formatDate(comment.createdAt)}
                        </span>
                        {canDelete && (
                          <button 
                            onClick={() => handleDeleteComment(comment._id)}
                            className="btn-delete-comment"
                            title="Delete comment"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="comment-content">{comment.content}</p>
                  </div>
                );
              })
            ) : (
              <p className="no-comments">No comments yet. Be the first!</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default PostDetailPage;
