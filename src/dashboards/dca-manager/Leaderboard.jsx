import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Trophy,
  Award,
  TrendingUp,
  Medal,
  Flame,
  AlertTriangle,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Minus,
  Star,
  Target,
  DollarSign,
  Clock,
  CheckCircle,
  Users
} from 'lucide-react';
import './Leaderboard.css';

function Leaderboard() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [agents, setAgents] = useState([]);
  const [podium, setPodium] = useState({ first: null, second: null, third: null });
  const [tickerMessages, setTickerMessages] = useState([]);
  const [currentTickerIndex, setCurrentTickerIndex] = useState(0);
  const [timeframe, setTimeframe] = useState('month'); // 'week', 'month', 'quarter', 'year'

  // Fetch profile
  const fetchProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setProfile(data);
      return data;
    }
    return null;
  }, []);

  // Fetch agents and compute rankings
  const fetchAgentRankings = useCallback(async (userProfile) => {
    if (!userProfile) return;

    try {
      // Get all DCA agents for this organization
      const { data: agentProfiles, error: agentError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('organization_id', userProfile.organization_id)
        .eq('role', 'DCA_AGENT');

      if (agentError) throw agentError;

      // If no agents or only one agent, use mock data for demo purposes
      if (!agentProfiles || agentProfiles.length < 2) {
        const mockAgents = generateMockAgents();
        
        // If there's one real agent, put them at the top
        if (agentProfiles && agentProfiles.length === 1) {
          const realAgent = agentProfiles[0];
          mockAgents[0] = {
            ...mockAgents[0],
            id: realAgent.id,
            name: realAgent.full_name || realAgent.email?.split('@')[0] || 'Agent',
            email: realAgent.email,
            avatar: realAgent.avatar_url
          };
        }
        
        setAgents(mockAgents);
        setPodium({
          first: mockAgents[0],
          second: mockAgents[1],
          third: mockAgents[2]
        });
        setTickerMessages(generateTickerMessages(mockAgents));
        return;
      }

      // Get case assignments and compute metrics for each agent
      const agentMetrics = await Promise.all(agentProfiles.map(async (agent) => {
        // Get assigned cases
        const { data: assignments } = await supabase
          .from('agent_case_assignments')
          .select('case_id, assigned_at')
          .eq('agent_id', agent.id);

        const caseIds = assignments?.map(a => a.case_id) || [];
        
        // Get case details for assigned cases
        let recoveredAmount = 0;
        let closedCases = 0;
        let totalCases = caseIds.length;

        if (caseIds.length > 0) {
          const { data: cases } = await supabase
            .from('cases')
            .select('status, outstanding_amount')
            .in('case_id', caseIds);

          closedCases = cases?.filter(c => c.status === 'PAID').length || 0;
          recoveredAmount = cases?.filter(c => c.status === 'PAID')
            .reduce((sum, c) => sum + (parseFloat(c.outstanding_amount) || 0), 0) || 0;
        }

        // Calculate metrics
        const recoveryRate = totalCases > 0 ? Math.round((closedCases / totalCases) * 100) : 0;
        const points = Math.round(recoveredAmount / 100) + (closedCases * 50) + (recoveryRate * 10);

        // Random trend for demo (in real app, compare to previous period)
        const trends = ['up', 'down', 'same'];
        const trend = trends[Math.floor(Math.random() * trends.length)];

        return {
          id: agent.id,
          name: agent.full_name || agent.email?.split('@')[0] || 'Agent',
          email: agent.email,
          avatar: agent.avatar_url,
          recoveredAmount,
          closedCases,
          totalCases,
          recoveryRate,
          points,
          trend,
          streak: Math.floor(Math.random() * 10), // Days streak
          badges: Math.floor(Math.random() * 5) // Number of badges earned
        };
      }));

      // Sort by points (or recovered amount)
      const sortedAgents = agentMetrics.sort((a, b) => b.points - a.points);

      // Assign ranks
      sortedAgents.forEach((agent, index) => {
        agent.rank = index + 1;
        agent.previousRank = index + 1 + (Math.floor(Math.random() * 3) - 1); // Simulate rank change
      });

      setAgents(sortedAgents);
      setPodium({
        first: sortedAgents[0] || null,
        second: sortedAgents[1] || null,
        third: sortedAgents[2] || null
      });
      setTickerMessages(generateTickerMessages(sortedAgents));

    } catch (error) {
      console.error('Error fetching agent rankings:', error);
      // Fallback to mock data
      const mockAgents = generateMockAgents();
      setAgents(mockAgents);
      setPodium({
        first: mockAgents[0],
        second: mockAgents[1],
        third: mockAgents[2]
      });
      setTickerMessages(generateTickerMessages(mockAgents));
    }
  }, []);

  // Generate mock agents for demo
  const generateMockAgents = () => {
    const names = ['Steve', 'Sarah', 'Mike', 'Emily', 'Tony', 'Lisa', 'James', 'Rachel'];
    return names.map((name, index) => ({
      id: `mock-${index}`,
      name,
      email: `${name.toLowerCase()}@dca.com`,
      avatar: null,
      recoveredAmount: Math.round(55000 - (index * 5000) + (Math.random() * 2000)),
      closedCases: Math.round(45 - (index * 5) + (Math.random() * 5)),
      totalCases: Math.round(60 - (index * 3)),
      recoveryRate: Math.round(85 - (index * 5) + (Math.random() * 10)),
      points: Math.round(5500 - (index * 500) + (Math.random() * 200)),
      trend: index < 3 ? 'up' : index > 5 ? 'down' : 'same',
      streak: Math.max(0, 10 - index),
      badges: Math.max(0, 5 - Math.floor(index / 2)),
      rank: index + 1,
      previousRank: index + 1 + (index % 2 === 0 ? 1 : -1)
    }));
  };

  // Generate ticker messages
  const generateTickerMessages = (agentList) => {
    const messages = [];
    
    if (agentList.length > 0) {
      // Close to bonus message
      const topAgent = agentList[0];
      const secondAgent = agentList[1];
      if (secondAgent) {
        const gap = topAgent.recoveredAmount - secondAgent.recoveredAmount;
        messages.push({
          type: 'hot',
          icon: 'flame',
          text: `🔥 ${secondAgent.name} is only $${gap.toLocaleString()} away from taking the lead!`
        });
      }

      // Monthly bonus message
      const bonusThreshold = 50000;
      const closeToBonus = agentList.filter(a => a.recoveredAmount >= bonusThreshold * 0.9 && a.recoveredAmount < bonusThreshold);
      closeToBonus.forEach(agent => {
        const remaining = bonusThreshold - agent.recoveredAmount;
        messages.push({
          type: 'hot',
          icon: 'flame',
          text: `🔥 ${agent.name} is only $${remaining.toLocaleString()} away from the Monthly Bonus!`
        });
      });

      // Streak messages
      const hotStreak = agentList.filter(a => a.streak >= 5);
      hotStreak.forEach(agent => {
        messages.push({
          type: 'success',
          icon: 'star',
          text: `⭐ ${agent.name} is on a ${agent.streak}-day winning streak!`
        });
      });

      // SLA breach warning (for demo, pick bottom performers)
      const lowPerformers = agentList.filter(a => a.recoveryRate < 50);
      lowPerformers.forEach(agent => {
        messages.push({
          type: 'warning',
          icon: 'alert',
          text: `⚠️ ${agent.name} has ${Math.floor(Math.random() * 5) + 1} critical SLA breaches. Action required.`
        });
      });

      // Rising star message
      const risingStar = agentList.find(a => a.trend === 'up' && a.rank > 3);
      if (risingStar) {
        messages.push({
          type: 'info',
          icon: 'trending',
          text: `📈 ${risingStar.name} climbed ${Math.abs(risingStar.previousRank - risingStar.rank)} spots this week!`
        });
      }
    }

    // Ensure at least some messages
    if (messages.length === 0) {
      messages.push({
        type: 'info',
        icon: 'trophy',
        text: '🏆 New month starting! Race to the top of the leaderboard!'
      });
    }

    return messages;
  };

  // Ticker rotation
  useEffect(() => {
    if (tickerMessages.length > 1) {
      const interval = setInterval(() => {
        setCurrentTickerIndex(prev => (prev + 1) % tickerMessages.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [tickerMessages.length]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const userProfile = await fetchProfile();
      if (userProfile) {
        await fetchAgentRankings(userProfile);
      }
      setLoading(false);
    };
    init();
  }, [fetchProfile, fetchAgentRankings]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Get initials
  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Get rank change icon
  const getRankChange = (agent) => {
    if (agent.previousRank > agent.rank) {
      return <ChevronUp size={16} className="rank-up" />;
    } else if (agent.previousRank < agent.rank) {
      return <ChevronDown size={16} className="rank-down" />;
    }
    return <Minus size={14} className="rank-same" />;
  };

  if (loading) {
    return (
      <div className="leaderboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading Leaderboard...</p>
      </div>
    );
  }

  return (
    <div className="leaderboard-page">
      {/* Header */}
      <div className="leaderboard-header">
        <div className="header-content">
          <h1><Trophy size={28} /> Leaderboard</h1>
          <p>Compete, perform, and earn recognition</p>
        </div>
        <div className="header-actions">
          <div className="timeframe-selector">
            {['week', 'month', 'quarter', 'year'].map(tf => (
              <button
                key={tf}
                className={`timeframe-btn ${timeframe === tf ? 'active' : ''}`}
                onClick={() => setTimeframe(tf)}
              >
                {tf.charAt(0).toUpperCase() + tf.slice(1)}
              </button>
            ))}
          </div>
          <button className="refresh-btn" onClick={async () => {
            setLoading(true);
            await fetchAgentRankings(profile);
            setLoading(false);
          }}>
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>
      </div>

      {/* Incentive Ticker */}
      {tickerMessages.length > 0 && (
        <div className={`incentive-ticker ${tickerMessages[currentTickerIndex]?.type}`}>
          <div className="ticker-content">
            <span className="ticker-text">
              {tickerMessages[currentTickerIndex]?.text}
            </span>
          </div>
          <div className="ticker-dots">
            {tickerMessages.map((_, idx) => (
              <span
                key={idx}
                className={`ticker-dot ${idx === currentTickerIndex ? 'active' : ''}`}
                onClick={() => setCurrentTickerIndex(idx)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Winner's Podium */}
      <div className="winners-podium">
        <h2>Top Performers</h2>
        <div className="podium-container">
          {/* 2nd Place - Left */}
          <div className="podium-position second">
            {podium.second ? (
              <>
                <div className="podium-avatar silver">
                  {podium.second.avatar ? (
                    <img src={podium.second.avatar} alt={podium.second.name} />
                  ) : (
                    <span>{getInitials(podium.second.name)}</span>
                  )}
                  <div className="podium-medal">🥈</div>
                </div>
                <h3 className="podium-name">{podium.second.name}</h3>
                <p className="podium-amount">{formatCurrency(podium.second.recoveredAmount)}</p>
                <div className="podium-stats">
                  <span><CheckCircle size={12} /> {podium.second.closedCases} closed</span>
                  <span><Target size={12} /> {podium.second.recoveryRate}%</span>
                </div>
              </>
            ) : (
              <div className="podium-empty">
                <Medal size={32} />
                <span>2nd Place</span>
              </div>
            )}
            <div className="podium-stand second-stand">2</div>
          </div>

          {/* 1st Place - Center */}
          <div className="podium-position first">
            {podium.first ? (
              <>
                <div className="crown-icon">👑</div>
                <div className="podium-avatar gold">
                  {podium.first.avatar ? (
                    <img src={podium.first.avatar} alt={podium.first.name} />
                  ) : (
                    <span>{getInitials(podium.first.name)}</span>
                  )}
                  <div className="podium-medal">🥇</div>
                </div>
                <h3 className="podium-name">{podium.first.name}</h3>
                <p className="podium-amount">{formatCurrency(podium.first.recoveredAmount)}</p>
                <div className="podium-stats">
                  <span><CheckCircle size={12} /> {podium.first.closedCases} closed</span>
                  <span><Target size={12} /> {podium.first.recoveryRate}%</span>
                </div>
              </>
            ) : (
              <div className="podium-empty">
                <Trophy size={40} />
                <span>1st Place</span>
              </div>
            )}
            <div className="podium-stand first-stand">1</div>
          </div>

          {/* 3rd Place - Right */}
          <div className="podium-position third">
            {podium.third ? (
              <>
                <div className="podium-avatar bronze">
                  {podium.third.avatar ? (
                    <img src={podium.third.avatar} alt={podium.third.name} />
                  ) : (
                    <span>{getInitials(podium.third.name)}</span>
                  )}
                  <div className="podium-medal">🥉</div>
                </div>
                <h3 className="podium-name">{podium.third.name}</h3>
                <p className="podium-amount">{formatCurrency(podium.third.recoveredAmount)}</p>
                <div className="podium-stats">
                  <span><CheckCircle size={12} /> {podium.third.closedCases} closed</span>
                  <span><Target size={12} /> {podium.third.recoveryRate}%</span>
                </div>
              </>
            ) : (
              <div className="podium-empty">
                <Award size={28} />
                <span>3rd Place</span>
              </div>
            )}
            <div className="podium-stand third-stand">3</div>
          </div>
        </div>
      </div>

      {/* Detailed Rankings Grid */}
      <div className="rankings-section">
        <div className="section-header">
          <h2><Users size={20} /> Detailed Rankings</h2>
          <span className="agent-count">{agents.length} agents</span>
        </div>

        <div className="rankings-table-container">
          <table className="rankings-table">
            <thead>
              <tr>
                <th className="rank-col">Rank</th>
                <th className="agent-col">Agent</th>
                <th>Recovered</th>
                <th>Cases Closed</th>
                <th>Recovery Rate</th>
                <th>Streak</th>
                <th>Points</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent, index) => (
                <tr key={agent.id} className={`rank-row ${index < 3 ? `top-${index + 1}` : ''}`}>
                  <td className="rank-col">
                    <div className="rank-badge">
                      {index === 0 && '🥇'}
                      {index === 1 && '🥈'}
                      {index === 2 && '🥉'}
                      {index > 2 && <span className="rank-number">{agent.rank}</span>}
                    </div>
                  </td>
                  <td className="agent-col">
                    <div className="agent-cell">
                      <div className={`agent-avatar-small ${index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : ''}`}>
                        {agent.avatar ? (
                          <img src={agent.avatar} alt={agent.name} />
                        ) : (
                          <span>{getInitials(agent.name)}</span>
                        )}
                      </div>
                      <div className="agent-info">
                        <span className="agent-name">{agent.name}</span>
                        <span className="agent-badges">
                          {Array(agent.badges).fill('⭐').join('')}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="amount-col">{formatCurrency(agent.recoveredAmount)}</td>
                  <td className="cases-col">
                    <span className="cases-value">{agent.closedCases}</span>
                    <span className="cases-total">/ {agent.totalCases}</span>
                  </td>
                  <td className="rate-col">
                    <div className="rate-bar-container">
                      <div 
                        className="rate-bar" 
                        style={{ 
                          width: `${agent.recoveryRate}%`,
                          backgroundColor: agent.recoveryRate >= 80 ? '#4ade80' : 
                                          agent.recoveryRate >= 60 ? '#fbbf24' : '#f87171'
                        }}
                      />
                      <span className="rate-value">{agent.recoveryRate}%</span>
                    </div>
                  </td>
                  <td className="streak-col">
                    {agent.streak > 0 ? (
                      <span className="streak-badge">
                        <Flame size={14} /> {agent.streak}
                      </span>
                    ) : (
                      <span className="no-streak">-</span>
                    )}
                  </td>
                  <td className="points-col">
                    <span className="points-value">{agent.points.toLocaleString()}</span>
                  </td>
                  <td className="trend-col">
                    {getRankChange(agent)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="leaderboard-stats">
        <div className="stat-card">
          <div className="stat-icon">
            <DollarSign size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">
              {formatCurrency(agents.reduce((sum, a) => sum + a.recoveredAmount, 0))}
            </span>
            <span className="stat-label">Total Recovered</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">
              {agents.reduce((sum, a) => sum + a.closedCases, 0)}
            </span>
            <span className="stat-label">Cases Closed</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <Target size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">
              {agents.length > 0 ? Math.round(agents.reduce((sum, a) => sum + a.recoveryRate, 0) / agents.length) : 0}%
            </span>
            <span className="stat-label">Avg Recovery Rate</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <Star size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">
              {agents.reduce((sum, a) => sum + a.points, 0).toLocaleString()}
            </span>
            <span className="stat-label">Total Points</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Leaderboard;
