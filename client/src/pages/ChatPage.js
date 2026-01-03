import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import '../styles/ChatPage.css';

const ChatPage = () => {
  const { username } = useParams();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(username || null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadConversations();
  }, [isAuthenticated]);

  useEffect(() => {
    if (selectedUser) {
      loadMessages(selectedUser);
      const interval = setInterval(() => loadMessages(selectedUser), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/messages', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading conversations:', error);
      setLoading(false);
    }
  };

  const loadMessages = async (username) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/messages/${username}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data.data);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedUser) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/messages', 
        { recipientUsername: selectedUser, content: messageText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessageText('');
      loadMessages(selectedUser);
      loadConversations();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const selectConversation = (username) => {
    setSelectedUser(username);
    navigate(`/chat/${username}`);
  };

  if (loading) {
    return <div className="chat-loading">Loading messages...</div>;
  }

  return (
    <div className="chat-page">
      <div className="chat-container">
        <div className="chat-sidebar">
          <div className="chat-sidebar-header">
            <h2>Messages</h2>
            <button onClick={() => navigate(-1)} className="btn-back-chat">←</button>
          </div>
          <div className="conversations-list">
            {conversations.length === 0 ? (
              <p className="no-conversations">No conversations yet</p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv._id._id}
                  className={`conversation-item ${selectedUser === conv._id.username ? 'active' : ''}`}
                  onClick={() => selectConversation(conv._id.username)}
                >
                  <div className="conversation-avatar">
                    {conv._id.avatar ? (
                      <img src={conv._id.avatar} alt={conv._id.username} />
                    ) : (
                      <div className="avatar-placeholder-small">
                        {conv._id.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="conversation-info">
                    <div className="conversation-header">
                      <span className="conversation-username">{conv._id.username}</span>
                      {conv.unreadCount > 0 && (
                        <span className="unread-badge">{conv.unreadCount}</span>
                      )}
                    </div>
                    <p className="conversation-preview">
                      {conv.lastMessage.content.substring(0, 50)}...
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="chat-main">
          {selectedUser ? (
            <>
              <div className="chat-header">
                <h2>{selectedUser}</h2>
              </div>
              <div className="messages-container">
                {messages.length === 0 ? (
                  <p className="no-messages">No messages yet. Start the conversation!</p>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message._id}
                      className={`message ${message.sender.username === user.username ? 'sent' : 'received'}`}
                    >
                      <div className="message-content">
                        <p>{message.content}</p>
                        <span className="message-time">
                          {new Date(message.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              <form className="message-input-form" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="message-input"
                />
                <button type="submit" className="btn-send-message">
                  Send
                </button>
              </form>
            </>
          ) : (
            <div className="no-chat-selected">
              <h2>Select a conversation to start messaging</h2>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
