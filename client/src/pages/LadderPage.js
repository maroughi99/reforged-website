import React, { useState, useEffect } from 'react';
import { ladderService } from '../services/dataService';
import '../styles/LadderPage.css';
import PlayerProfile from '../components/PlayerProfile';

const LadderPage = () => {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [filters, setFilters] = useState({
    playerType: 'All Players',
    season: 'Active Season',
    race: 'All Races',
    gameMode: '1v1',
    page: 1
  });
  const [profileData, setProfileData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    loadLadder();
  }, [filters]);

  const loadLadder = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ladderService.getLadder(filters);
      console.log('Ladder data received:', data);
      console.log('Rankings array:', data.data);
      
      // Handle the response even if success is false
      if (data.data && data.data.length > 0) {
        setRankings(data.data);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } else {
        // No data but not an error - just show empty state
        setRankings([]);
        if (data.message) {
          setError(data.message);
        }
      }
    } catch (error) {
      console.error('Error loading ladder:', error);
      setError('Unable to load ladder data. Please try again later.');
      setRankings([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.pages) return;
    setFilters(prev => ({ ...prev, page: newPage }));
    setExpandedRows(new Set()); // Reset expanded rows on page change
  };

  const toggleRowExpand = (index) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const renderPageButtons = () => {
    const buttons = [];
    const currentPage = pagination.page;
    const totalPages = pagination.pages;
    
    // Show 5 page buttons centered around current page
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    // Adjust start if we're near the end
    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button 
          key={i}
          className={`page-btn ${i === currentPage ? 'active' : ''}`}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </button>
      );
    }
    
    return buttons;
  };

  const formatRaceName = (race) => {
    const raceMap = {
      'nightelf': 'Night Elf',
      'human': 'Human',
      'orc': 'Orc',
      'undead': 'Undead',
      'random': 'Random'
    };
    return raceMap[race.toLowerCase()] || race.charAt(0).toUpperCase() + race.slice(1);
  };

  const getRaceColor = (race) => {
    const colors = {
      Human: '#4a9eff',
      Orc: '#ff6b3d',
      Undead: '#9c27b0',
      'Night Elf': '#00d4ff',
      NightElf: '#00d4ff',
      Random: '#ffaa00'
    };
    return colors[race] || '#aaa';
  };

  const getPortrait = (player, index) => {
    // Use player's portrait if available, otherwise fallback to index-based rotation
    if (player.portrait) {
      // Convert to number and format to 3 digits (e.g., 1 -> "001")
      const portraitNum = typeof player.portrait === 'string' ? parseInt(player.portrait.replace(/\D/g, ''), 10) : player.portrait;
      if (portraitNum > 0 && portraitNum <= 99) {
        return String(portraitNum).padStart(3, '0');
      }
    }
    
    const portraits = ['001', '002', '003', '004', '005', '006', '007', '008', '009', '010', 
                       '011', '012', '013', '014', '015', '016', '017', '018', '019', '020'];
    return portraits[index % portraits.length];
  };

  const getLeagueDisplay = (league) => {
    return league.toLowerCase().replace(' ', '_');
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadLadder();
      return;
    }
    
    // Prevent duplicate requests
    if (loadingProfile) {
      console.log('⚠️ Profile request already in progress');
      return;
    }
    
    try {
      setLoadingProfile(true);
      const data = await ladderService.getProfile(searchQuery.trim());
      if (data.success && data.data) {
        setProfileData(data.data);
      } else {
        alert('Player not found or no data available');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      if (error.response?.status === 429) {
        alert('Please wait - profile request already in progress');
      } else {
        alert('Error fetching player profile. Make sure WC3 is running.');
      }
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    loadLadder();
  };

  return (
    <div className="ladder-page">
      <div className="ladder-header">
        <div className="ladder-pretitle">Official Warcraft III: Reforged</div>
        <h1 className="ladder-title">LEADERBOARD</h1>
        <p className="ladder-subtitle">Top 25 Players for Each Game Mode</p>
        
        {/* <div className="search-container">
          <input
            type="text"
            className="wc3-search-input"
            placeholder="Search Battle Tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleSearchKeyPress}
          />
          <button className="wc3-search-btn" onClick={handleSearch}>
            SEARCH
          </button>
          {searchQuery && (
            <button className="wc3-clear-btn" onClick={clearSearch}>
              CLEAR
            </button>
          )}
        </div> */}
      </div>

      <div className="ladder-controls">
        <select className="wc3-dropdown" value={filters.playerType} onChange={(e) => setFilters({ ...filters, playerType: e.target.value })}>
          <option>All Players</option>
        </select>
        <select className="wc3-dropdown" value={filters.season} onChange={(e) => setFilters({ ...filters, season: e.target.value })}>
          <option>Active Season</option>
        </select>
        <select className="wc3-dropdown" value={filters.race} onChange={(e) => setFilters({ ...filters, race: e.target.value })}>
          <option>All Races</option>
          <option>Human</option>
          <option>Orc</option>
          <option>Undead</option>
          <option>Night Elf</option>
        </select>
        <select className="wc3-dropdown" value={filters.gameMode} onChange={(e) => setFilters({ ...filters, gameMode: e.target.value })}>
          <option>1v1</option>
          <option>2v2</option>
          <option>2v2 Arranged</option>
          <option>3v3</option>
          <option>3v3 Arranged</option>
          <option>4v4</option>
          <option>4v4 Arranged</option>
          <option>FFA</option>
        </select>
      </div>

      {loading ? (
        <div className="loading">Loading rankings...</div>
      ) : error && rankings.length === 0 ? (
        <div className="wc3-info-box">
          <div className="info-icon">⚠️</div>
          <p className="info-message">{error}</p>
        </div>
      ) : (
        <div className="ladder-container">
          <div className="ladder-frame">
            <table className="ladder-table">
              <thead>
                <tr>
                  <th className="col-rank">RANK</th>
                  <th className="col-player">PLAYER</th>
                  <th className="col-level">LEVEL</th>
                  <th className="col-xp">XP</th>
                  {!filters.gameMode.includes('Arranged') && <th className="col-race">RACE</th>}
                  <th className="col-mmr">MMR</th>
                  <th className="col-wins">WINS</th>
                  <th className="col-losses">LOSSES</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((player, index) => (
                  <React.Fragment key={player._id || index}>
                    <tr 
                      className={`ladder-row ${expandedRows.has(index) ? 'expanded' : ''}`}
                      onClick={() => toggleRowExpand(index)}
                    >
                      <td className="col-rank">
                        <span className="rank-number">{player.rank}</span>
                      </td>
                      <td className="col-player">
                        <div className="player-info">
                          <img 
                            src={(() => {
                              try {
                                return require(`../assets/portraits/p${getPortrait(player, index)}.png`);
                              } catch (e) {
                                return require(`../assets/portraits/p001.png`);
                              }
                            })()} 
                            alt="" 
                            className="player-portrait" 
                          />
                          <div className="player-details">
                            {player.teammates && player.teammates.length > 0 ? (
                              player.teammates.map((teammate, i) => (
                                <div key={i} className="teammate-row">
                                  <span className="teammate-name">
                                    {typeof teammate === 'string' ? teammate : teammate.battleTag}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <span className="player-name">{player.battleTag}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="col-level col-desktop">
                        <div className="level-container">
                          <div className="level-bar">
                            <div className="level-fill" style={{ width: `${(player.xp % 100)}%` }}></div>
                          </div>
                          <span className="level-text">LEVEL {Math.floor(player.xp / 100)} ({(player.xp % 100).toFixed(1)}%)</span>
                        </div>
                      </td>
                      <td className="col-xp col-desktop">{player.xp || 0}</td>
                      {!filters.gameMode.includes('Arranged') && (
                        <td className="col-race col-desktop">
                          <span className={`race-name race-${formatRaceName(player.race).toLowerCase().replace(' ', '')}`}>
                            {formatRaceName(player.race)}
                          </span>
                        </td>
                      )}
                      <td className="col-mmr">{player.mmr}</td>
                      <td className="col-wins col-desktop">{player.wins}</td>
                      <td className="col-losses col-desktop">{player.losses}</td>
                      <td className="col-expand-icon">
                        <span className="expand-arrow">{expandedRows.has(index) ? '▲' : '▼'}</span>
                      </td>
                    </tr>
                    {expandedRows.has(index) && (
                      <tr className="expanded-row">
                        <td colSpan="9">
                          <div className="expanded-content">
                            <div className="stat-row">
                              <span className="stat-label">Level:</span>
                              <span className="stat-value">
                                LEVEL {Math.floor(player.xp / 100)} ({(player.xp % 100).toFixed(1)}%)
                              </span>
                            </div>
                            <div className="stat-row">
                              <span className="stat-label">XP:</span>
                              <span className="stat-value">{player.xp || 0}</span>
                            </div>
                            {!filters.gameMode.includes('Arranged') && (
                              <div className="stat-row">
                                <span className="stat-label">Race:</span>
                                <span className={`stat-value race-name race-${formatRaceName(player.race).toLowerCase().replace(' ', '')}`}>
                                  {formatRaceName(player.race)}
                                </span>
                              </div>
                            )}
                            <div className="stat-row">
                              <span className="stat-label">Wins:</span>
                              <span className="stat-value stat-wins">{player.wins}</span>
                            </div>
                            <div className="stat-row">
                              <span className="stat-label">Losses:</span>
                              <span className="stat-value stat-losses">{player.losses}</span>
                            </div>
                            <div className="stat-row">
                              <span className="stat-label">Win Rate:</span>
                              <span className="stat-value">
                                {((player.wins / (player.wins + player.losses)) * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="ladder-footer">
            <button className="back-button" onClick={() => window.history.back()}>BACK</button>
            <div className="pagination">
              <button 
                className="page-btn" 
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                ◀
              </button>
              {renderPageButtons()}
              <button 
                className="page-btn" 
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
              >
                ▶
              </button>
            </div>
          </div>
        </div>
      )}
      
      {profileData && (
        <PlayerProfile 
          profile={profileData} 
          onClose={() => setProfileData(null)} 
        />
      )}
      
      {loadingProfile && (
        <div className="profile-overlay">
          <div className="loading">Loading player profile...</div>
        </div>
      )}
    </div>
  );
};

export default LadderPage;
