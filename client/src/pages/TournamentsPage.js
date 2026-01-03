import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import '../styles/TournamentsPage.css';

const TournamentsPage = () => {
  const { user, isAuthenticated } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [view, setView] = useState('list'); // 'list', 'detail', 'create'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'upcoming', 'in-progress', 'completed'

  // Create tournament form
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    registrationDeadline: '',
    maxParticipants: 32,
    format: 'single-elimination',
    game: '1v1',
    rules: '',
    prizePool: '',
    streamUrl: '',
    discordUrl: ''
  });

  useEffect(() => {
    fetchTournaments();
  }, [filter]);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const params = {};
      
      if (filter === 'upcoming') {
        params.upcoming = 'true';
      } else if (filter !== 'all') {
        params.status = filter;
      }

      const response = await axios.get('http://localhost:5000/api/tournaments', { params });
      setTournaments(response.data.data);
    } catch (err) {
      setError('Failed to load tournaments');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTournamentDetail = async (id) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/tournaments/${id}`);
      setSelectedTournament(response.data.data);
      setView('detail');
    } catch (err) {
      setError('Failed to load tournament details');
      console.error(err);
    }
  };

  const handleCreateTournament = async (e) => {
    e.preventDefault();
    setError('');

    if (!isAuthenticated) {
      setError('You must be logged in to create a tournament');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5000/api/tournaments',
        formData,
        { headers: { 'x-auth-token': token } }
      );

      setTournaments([response.data.data, ...tournaments]);
      setView('list');
      setFormData({
        name: '',
        description: '',
        startDate: '',
        registrationDeadline: '',
        maxParticipants: 32,
        format: 'single-elimination',
        game: '1v1',
        rules: '',
        prizePool: '',
        streamUrl: '',
        discordUrl: ''
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create tournament');
    }
  };

  const handleRegister = async (tournamentId) => {
    if (!isAuthenticated) {
      setError('You must be logged in to register');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://localhost:5000/api/tournaments/${tournamentId}/register`,
        { race: user?.race },
        { headers: { 'x-auth-token': token } }
      );

      setSelectedTournament(response.data.data);
      alert('Successfully registered for tournament!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register');
    }
  };

  const handleUnregister = async (tournamentId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `http://localhost:5000/api/tournaments/${tournamentId}/unregister`,
        { headers: { 'x-auth-token': token } }
      );

      fetchTournamentDetail(tournamentId);
      alert('Successfully unregistered');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to unregister');
    }
  };

  const handleCheckIn = async (tournamentId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:5000/api/tournaments/${tournamentId}/checkin`,
        {},
        { headers: { 'x-auth-token': token } }
      );

      fetchTournamentDetail(tournamentId);
      alert('Successfully checked in!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to check in');
    }
  };

  const handleStartTournament = async (tournamentId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://localhost:5000/api/tournaments/${tournamentId}/start`,
        {},
        { headers: { 'x-auth-token': token } }
      );

      setSelectedTournament(response.data.data);
      alert('Tournament started! Brackets generated.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start tournament');
    }
  };

  const isUserRegistered = (tournament) => {
    return tournament.participants?.some(p => p.userId._id === user?._id || p.userId === user?._id);
  };

  const isOrganizer = (tournament) => {
    return tournament.organizer?._id === user?._id || tournament.organizer === user?._id;
  };

  // Render bracket visualization
  const renderBracket = (matches) => {
    if (!matches || matches.length === 0) return null;

    const rounds = {};
    matches.forEach(match => {
      if (!rounds[match.round]) rounds[match.round] = [];
      rounds[match.round].push(match);
    });

    return (
      <div className="bracket-container">
        {Object.keys(rounds).sort((a, b) => a - b).map(round => (
          <div key={round} className="bracket-round">
            <h3 className="round-title">Round {round}</h3>
            <div className="bracket-matches">
              {rounds[round].map(match => (
                <div key={match._id} className={`bracket-match ${match.status}`}>
                  <div className={`match-player ${match.winner === match.player1?.userId ? 'winner' : ''}`}>
                    <span className="player-name">
                      {match.player1?.username || 'TBD'}
                    </span>
                    {match.score && <span className="score">{match.score.player1Score}</span>}
                  </div>
                  <div className="match-vs">VS</div>
                  <div className={`match-player ${match.winner === match.player2?.userId ? 'winner' : ''}`}>
                    <span className="player-name">
                      {match.player2?.username || 'TBD'}
                    </span>
                    {match.score && <span className="score">{match.score.player2Score}</span>}
                  </div>
                  <div className="match-status-badge">{match.status}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // List View
  if (view === 'list') {
    return (
      <div className="tournaments-page">
        <div className="tournaments-header">
          <div>
            <h1>🏆 Tournaments</h1>
            <p className="tournaments-subtitle">Compete in organized tournaments and prove your skills!</p>
          </div>
          {isAuthenticated && (
            <button 
              className="btn btn-primary"
              onClick={() => setView('create')}
            >
              ➕ Create Tournament
            </button>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="tournaments-filters">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={`filter-btn ${filter === 'upcoming' ? 'active' : ''}`}
            onClick={() => setFilter('upcoming')}
          >
            Upcoming
          </button>
          <button 
            className={`filter-btn ${filter === 'registration-open' ? 'active' : ''}`}
            onClick={() => setFilter('registration-open')}
          >
            Open Registration
          </button>
          <button 
            className={`filter-btn ${filter === 'in-progress' ? 'active' : ''}`}
            onClick={() => setFilter('in-progress')}
          >
            In Progress
          </button>
          <button 
            className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Completed
          </button>
        </div>

        {loading ? (
          <div className="loading">Loading tournaments...</div>
        ) : (
          <div className="tournaments-grid">
            {tournaments.map(tournament => (
              <div key={tournament._id} className="tournament-card">
                <div className={`tournament-status-badge ${tournament.status}`}>
                  {tournament.status.replace('-', ' ')}
                </div>
                
                <h2 className="tournament-title">{tournament.name}</h2>
                <p className="tournament-description">{tournament.description}</p>

                <div className="tournament-info">
                  <div className="info-item">
                    <span className="info-label">Format:</span>
                    <span className="info-value">{tournament.format}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Game:</span>
                    <span className="info-value">{tournament.game}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Start Date:</span>
                    <span className="info-value">
                      {new Date(tournament.startDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Participants:</span>
                    <span className="info-value">
                      {tournament.participantCount || 0}/{tournament.maxParticipants}
                    </span>
                  </div>
                  {tournament.prizePool && (
                    <div className="info-item">
                      <span className="info-label">Prize Pool:</span>
                      <span className="info-value prize">{tournament.prizePool}</span>
                    </div>
                  )}
                  <div className="info-item">
                    <span className="info-label">Organizer:</span>
                    <span className="info-value">{tournament.organizer?.username}</span>
                  </div>
                </div>

                <button 
                  className="btn btn-secondary"
                  onClick={() => fetchTournamentDetail(tournament._id)}
                >
                  View Details
                </button>
              </div>
            ))}
          </div>
        )}

        {!loading && tournaments.length === 0 && (
          <div className="no-tournaments">
            <p>No tournaments found. Be the first to create one!</p>
          </div>
        )}
      </div>
    );
  }

  // Detail View
  if (view === 'detail' && selectedTournament) {
    const userRegistered = isUserRegistered(selectedTournament);
    const isOrganizerUser = isOrganizer(selectedTournament);

    return (
      <div className="tournaments-page tournament-detail">
        <button 
          className="btn btn-back"
          onClick={() => {
            setView('list');
            setSelectedTournament(null);
          }}
        >
          ← Back to Tournaments
        </button>

        {error && <div className="error-message">{error}</div>}

        <div className="tournament-detail-header">
          <div>
            <h1>{selectedTournament.name}</h1>
            <div className={`status-badge-large ${selectedTournament.status}`}>
              {selectedTournament.status.replace('-', ' ')}
            </div>
          </div>
          
          <div className="tournament-actions">
            {isOrganizerUser && selectedTournament.status === 'registration-closed' && (
              <button 
                className="btn btn-success"
                onClick={() => handleStartTournament(selectedTournament._id)}
              >
                🚀 Start Tournament
              </button>
            )}
            
            {!userRegistered && selectedTournament.canRegister && (
              <button 
                className="btn btn-primary"
                onClick={() => handleRegister(selectedTournament._id)}
              >
                Register Now
              </button>
            )}

            {userRegistered && selectedTournament.status === 'registration-open' && (
              <button 
                className="btn btn-danger"
                onClick={() => handleUnregister(selectedTournament._id)}
              >
                Unregister
              </button>
            )}

            {userRegistered && selectedTournament.checkInEnabled && !selectedTournament.participants.find(p => p.userId === user?._id)?.checkedIn && (
              <button 
                className="btn btn-warning"
                onClick={() => handleCheckIn(selectedTournament._id)}
              >
                ✓ Check In
              </button>
            )}
          </div>
        </div>

        <div className="tournament-detail-content">
          <div className="detail-section">
            <h2>Tournament Information</h2>
            <p className="description">{selectedTournament.description}</p>
            
            <div className="detail-grid">
              <div className="detail-item">
                <strong>Format:</strong> {selectedTournament.format}
              </div>
              <div className="detail-item">
                <strong>Game Type:</strong> {selectedTournament.game}
              </div>
              <div className="detail-item">
                <strong>Start Date:</strong> {new Date(selectedTournament.startDate).toLocaleString()}
              </div>
              <div className="detail-item">
                <strong>Registration Deadline:</strong> {new Date(selectedTournament.registrationDeadline).toLocaleString()}
              </div>
              <div className="detail-item">
                <strong>Max Participants:</strong> {selectedTournament.maxParticipants}
              </div>
              <div className="detail-item">
                <strong>Current Participants:</strong> {selectedTournament.participantCount || 0}
              </div>
              <div className="detail-item">
                <strong>Spots Remaining:</strong> {selectedTournament.spotsRemaining || 0}
              </div>
              <div className="detail-item">
                <strong>Organizer:</strong> {selectedTournament.organizer?.username}
              </div>
              {selectedTournament.prizePool && (
                <div className="detail-item">
                  <strong>Prize Pool:</strong> <span className="prize-highlight">{selectedTournament.prizePool}</span>
                </div>
              )}
            </div>

            {selectedTournament.rules && (
              <div className="rules-section">
                <h3>Rules</h3>
                <p className="rules-text">{selectedTournament.rules}</p>
              </div>
            )}

            {(selectedTournament.streamUrl || selectedTournament.discordUrl) && (
              <div className="links-section">
                {selectedTournament.streamUrl && (
                  <a href={selectedTournament.streamUrl} target="_blank" rel="noopener noreferrer" className="btn btn-stream">
                    📺 Watch Stream
                  </a>
                )}
                {selectedTournament.discordUrl && (
                  <a href={selectedTournament.discordUrl} target="_blank" rel="noopener noreferrer" className="btn btn-discord">
                    💬 Join Discord
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="detail-section">
            <h2>Participants ({selectedTournament.participants?.length || 0})</h2>
            <div className="participants-list">
              {selectedTournament.participants?.map((participant, index) => (
                <div key={participant._id} className="participant-item">
                  <span className="participant-number">#{index + 1}</span>
                  <span className="participant-name">{participant.username}</span>
                  {participant.race && <span className="participant-race">{participant.race}</span>}
                  {participant.seed && <span className="participant-seed">Seed: {participant.seed}</span>}
                  {participant.checkedIn && <span className="checked-in-badge">✓ Checked In</span>}
                </div>
              ))}
            </div>
          </div>

          {selectedTournament.matches && selectedTournament.matches.length > 0 && (
            <div className="detail-section bracket-section">
              <h2>Tournament Bracket</h2>
              {renderBracket(selectedTournament.matches)}
            </div>
          )}

          {selectedTournament.winner && (
            <div className="detail-section winner-section">
              <h2>🏆 Tournament Winner</h2>
              <div className="winner-display">
                <span className="winner-name">{selectedTournament.winner.username}</span>
              </div>
              {selectedTournament.runnerUp && (
                <div className="runner-up">
                  <strong>Runner-up:</strong> {selectedTournament.runnerUp.username}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Create View
  if (view === 'create') {
    return (
      <div className="tournaments-page create-tournament">
        <button 
          className="btn btn-back"
          onClick={() => setView('list')}
        >
          ← Back to Tournaments
        </button>

        <h1>Create New Tournament</h1>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleCreateTournament} className="tournament-form">
          <div className="form-group">
            <label htmlFor="name">Tournament Name *</label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
              placeholder="Epic WC3 Championship"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              required
              rows="4"
              placeholder="Describe your tournament..."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="format">Format</label>
              <select
                id="format"
                value={formData.format}
                onChange={(e) => setFormData({...formData, format: e.target.value})}
              >
                <option value="single-elimination">Single Elimination</option>
                <option value="double-elimination">Double Elimination</option>
                <option value="round-robin">Round Robin</option>
                <option value="swiss">Swiss</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="game">Game Type</label>
              <select
                id="game"
                value={formData.game}
                onChange={(e) => setFormData({...formData, game: e.target.value})}
              >
                <option value="1v1">1v1</option>
                <option value="2v2">2v2</option>
                <option value="3v3">3v3</option>
                <option value="4v4">4v4</option>
                <option value="FFA">FFA</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="maxParticipants">Max Participants</label>
              <input
                type="number"
                id="maxParticipants"
                value={formData.maxParticipants}
                onChange={(e) => setFormData({...formData, maxParticipants: parseInt(e.target.value)})}
                min="2"
                max="128"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startDate">Start Date *</label>
              <input
                type="datetime-local"
                id="startDate"
                value={formData.startDate}
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="registrationDeadline">Registration Deadline *</label>
              <input
                type="datetime-local"
                id="registrationDeadline"
                value={formData.registrationDeadline}
                onChange={(e) => setFormData({...formData, registrationDeadline: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="prizePool">Prize Pool</label>
            <input
              type="text"
              id="prizePool"
              value={formData.prizePool}
              onChange={(e) => setFormData({...formData, prizePool: e.target.value})}
              placeholder="e.g., $500, 10000 gold, Gaming peripherals"
            />
          </div>

          <div className="form-group">
            <label htmlFor="rules">Rules</label>
            <textarea
              id="rules"
              value={formData.rules}
              onChange={(e) => setFormData({...formData, rules: e.target.value})}
              rows="6"
              placeholder="Tournament rules and regulations..."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="streamUrl">Stream URL</label>
              <input
                type="url"
                id="streamUrl"
                value={formData.streamUrl}
                onChange={(e) => setFormData({...formData, streamUrl: e.target.value})}
                placeholder="https://twitch.tv/..."
              />
            </div>

            <div className="form-group">
              <label htmlFor="discordUrl">Discord URL</label>
              <input
                type="url"
                id="discordUrl"
                value={formData.discordUrl}
                onChange={(e) => setFormData({...formData, discordUrl: e.target.value})}
                placeholder="https://discord.gg/..."
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-large">
            Create Tournament
          </button>
        </form>
      </div>
    );
  }

  return null;
};

export default TournamentsPage;
