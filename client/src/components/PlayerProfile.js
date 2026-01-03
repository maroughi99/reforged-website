import React from 'react';
import '../styles/PlayerProfile.css';

const PlayerProfile = ({ profile, onClose }) => {
  if (!profile) return null;

  const renderGameModeStats = (gameMode, stats) => {
    const { wins, losses, totalGames } = stats;
    const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : '0.0';
    
    // Map game mode names
    const gameModeNames = {
      '1v1': '1v1',
      '2v2': '2v2',
      '3v3': '3v3',
      '4v4': '4v4',
      'FFA': 'FFA',
      '2v2_AT': '2v2 Arranged Team',
      '3v3_AT': '3v3 Arranged Team',
      '4v4_AT': '4v4 Arranged Team'
    };
    
    const displayName = gameModeNames[gameMode] || gameMode;
    
    return (
      <div key={gameMode} className="gamemode-stats">
        <h4 className="gamemode-name">{displayName}</h4>
        <div className="stat-row">
          <span className="stat-label">Record:</span>
          <span className="stat-value">
            <span className="stat-wins">{wins}</span>W - <span className="stat-losses">{losses}</span>L
          </span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Win Rate:</span>
          <span className="stat-value stat-winrate">{winRate}%</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Total Games:</span>
          <span className="stat-value">{totalGames}</span>
        </div>
      </div>
    );
  };

  const calculateOverallStats = () => {
    let totalWins = 0;
    let totalLosses = 0;
    
    if (profile.matchStats) {
      Object.values(profile.matchStats).forEach(stats => {
        totalWins += stats.wins || 0;
        totalLosses += stats.losses || 0;
      });
    }
    
    const totalGames = totalWins + totalLosses;
    const winRate = totalGames > 0 ? ((totalWins / totalGames) * 100).toFixed(1) : '0.0';
    
    return { totalWins, totalLosses, totalGames, winRate };
  };

  const hasMatchStats = profile.matchStats && Object.keys(profile.matchStats).length > 0;

  return (
    <div className="profile-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
        <button className="profile-close" onClick={onClose}>✕</button>
        
        <div className="profile-header">
          <h2 className="profile-name">{profile.battle_tag_full || 'Unknown Player'}</h2>
        </div>

        {hasMatchStats ? (
          <div className="profile-content">
            <div className="profile-summary">
              <h3>All Game Modes</h3>
              <div className="stats-grid">
                {Object.entries(profile.matchStats).map(([gameMode, stats]) => 
                  renderGameModeStats(gameMode, stats)
                )}
              </div>
              
              <div className="profile-totals">
                <h3>Overall Statistics</h3>
                {(() => {
                  const totals = calculateOverallStats();
                  return (
                    <>
                      <div className="total-stat">
                        <span>Total Record:</span>
                        <span className="total-value">
                          <span className="stat-wins">{totals.totalWins}</span>W - <span className="stat-losses">{totals.totalLosses}</span>L ({totals.winRate}%)
                        </span>
                      </div>
                      <div className="total-stat">
                        <span>Total Games:</span>
                        <span className="total-value">{totals.totalGames}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        ) : (
          <div className="profile-content">
            <div className="no-data">
              <p>No match history available for this player.</p>
              <p className="no-data-hint">Statistics are calculated from recent match history.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerProfile;
