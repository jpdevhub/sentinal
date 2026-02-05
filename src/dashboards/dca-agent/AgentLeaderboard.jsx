import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Trophy,
  Medal,
  Star,
  TrendingUp,
  Target,
  Phone,
  DollarSign,
  Award,
  Crown,
  Zap,
  ChevronUp,
  ChevronDown,
  Minus
} from 'lucide-react';
import './AgentLeaderboard.css';

function AgentLeaderboard() {
  const [loading, setLoading] = useState(true);
  const [, setProfile] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [timeframe, setTimeframe] = useState('week'); // week, month, all

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

  // Fetch leaderboard data
  const fetchLeaderboard = useCallback(async (userProfile) => {
    if (!userProfile) return;

    try {
      setLoading(true);

      // Get all DCA agents in the same organization
      const { data: agents, error: agentError } = await supabase
        .from('profiles')
        .select('id, full_name, email, organization_id')
        .eq('role', 'DCA_AGENT')
        .eq('organization_id', userProfile.organization_id);

      if (agentError) throw agentError;

      // Get performance metrics for each agent
      const agentMetrics = await Promise.all((agents || []).map(async (agent) => {
        // Get assigned cases count
        const { data: assignments } = await supabase
          .from('agent_case_assignments')
          .select(`
            case_id,
            cases (case_status, invoice_amount)
          `)
          .eq('agent_id', agent.id);

        const cases = assignments?.map(a => a.cases).filter(Boolean) || [];
        const totalCases = cases.length;
        const paidCases = cases.filter(c => c.case_status === 'PAID');
        const totalRecovered = paidCases.reduce((sum, c) => sum + (parseFloat(c.invoice_amount) || 0), 0);
        const recoveryRate = totalCases > 0 ? Math.round((paidCases.length / totalCases) * 100) : 0;

        // Get action count (calls, SMS, etc.)
        const { count: actionCount } = await supabase
          .from('case_actions')
          .select('*', { count: 'exact', head: true })
          .eq('performed_by', agent.id);

        // Calculate points (gamification)
        const points = (paidCases.length * 50) + (actionCount || 0) * 5 + Math.floor(totalRecovered / 1000);

        return {
          id: agent.id,
          name: agent.full_name || agent.email?.split('@')[0] || 'Agent',
          email: agent.email,
          totalCases,
          paidCases: paidCases.length,
          totalRecovered,
          recoveryRate,
          actionCount: actionCount || 0,
          points,
          isCurrentUser: agent.id === userProfile.id
        };
      }));

      // Sort by points
      const sortedData = agentMetrics.sort((a, b) => b.points - a.points);

      // Assign ranks and trend
      const rankedData = sortedData.map((agent, index) => ({
        ...agent,
        rank: index + 1,
        trend: Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'same' // Mock trend
      }));

      setLeaderboardData(rankedData);

      // Find current user's rank
      const userRank = rankedData.find(a => a.isCurrentUser);
      setMyRank(userRank);

    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      const userProfile = await fetchProfile();
      if (userProfile) {
        await fetchLeaderboard(userProfile);
      }
    };
    init();
  }, [fetchProfile, fetchLeaderboard]);

  // Format currency
  const formatCurrency = (amount) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount}`;
  };

  // Get rank badge
  const getRankBadge = (rank) => {
    switch (rank) {
      case 1:
        return { icon: Crown, color: '#ffd700', bg: 'rgba(255, 215, 0, 0.15)' };
      case 2:
        return { icon: Medal, color: '#c0c0c0', bg: 'rgba(192, 192, 192, 0.15)' };
      case 3:
        return { icon: Medal, color: '#cd7f32', bg: 'rgba(205, 127, 50, 0.15)' };
      default:
        return { icon: Star, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' };
    }
  };

  // Get trend icon
  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up':
        return <ChevronUp size={16} className="trend-up" />;
      case 'down':
        return <ChevronDown size={16} className="trend-down" />;
      default:
        return <Minus size={16} className="trend-same" />;
    }
  };

  if (loading) {
    return (
      <div className="agent-leaderboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading Leaderboard...</p>
      </div>
    );
  }

  const topThree = leaderboardData.slice(0, 3);

  return (
    <div className="agent-leaderboard">
      {/* Header */}
      <div className="leaderboard-header">
        <div className="header-content">
          <h1>
            <Trophy size={28} />
            Agent Leaderboard
          </h1>
          <p>Compete with your peers • Earn points • Win rewards</p>
        </div>
        <div className="timeframe-selector">
          <button 
            className={`timeframe-btn ${timeframe === 'week' ? 'active' : ''}`}
            onClick={() => setTimeframe('week')}
          >
            This Week
          </button>
          <button 
            className={`timeframe-btn ${timeframe === 'month' ? 'active' : ''}`}
            onClick={() => setTimeframe('month')}
          >
            This Month
          </button>
          <button 
            className={`timeframe-btn ${timeframe === 'all' ? 'active' : ''}`}
            onClick={() => setTimeframe('all')}
          >
            All Time
          </button>
        </div>
      </div>

      {/* My Rank Card */}
      {myRank && (
        <div className="my-rank-card">
          <div className="my-rank-badge">
            <span className="rank-number">#{myRank.rank}</span>
            <span className="rank-label">Your Rank</span>
          </div>
          <div className="my-stats">
            <div className="my-stat">
              <Zap size={18} />
              <span className="stat-value">{myRank.points.toLocaleString()}</span>
              <span className="stat-label">Points</span>
            </div>
            <div className="my-stat">
              <Target size={18} />
              <span className="stat-value">{myRank.paidCases}</span>
              <span className="stat-label">Cases Closed</span>
            </div>
            <div className="my-stat">
              <DollarSign size={18} />
              <span className="stat-value">{formatCurrency(myRank.totalRecovered)}</span>
              <span className="stat-label">Recovered</span>
            </div>
            <div className="my-stat">
              <Phone size={18} />
              <span className="stat-value">{myRank.actionCount}</span>
              <span className="stat-label">Actions</span>
            </div>
          </div>
        </div>
      )}

      {/* Winner's Podium */}
      <div className="winners-podium">
        {/* 2nd Place */}
        {topThree[1] && (
          <div className="podium-spot second">
            <div className="podium-avatar">
              <Medal size={24} />
            </div>
            <div className="podium-name">{topThree[1].name}</div>
            <div className="podium-points">{topThree[1].points.toLocaleString()} pts</div>
            <div className="podium-stand">
              <span className="stand-rank">2</span>
            </div>
          </div>
        )}

        {/* 1st Place */}
        {topThree[0] && (
          <div className="podium-spot first">
            <div className="podium-crown">
              <Crown size={28} />
            </div>
            <div className="podium-avatar gold">
              <Trophy size={28} />
            </div>
            <div className="podium-name">{topThree[0].name}</div>
            <div className="podium-points">{topThree[0].points.toLocaleString()} pts</div>
            <div className="podium-stand gold">
              <span className="stand-rank">1</span>
            </div>
          </div>
        )}

        {/* 3rd Place */}
        {topThree[2] && (
          <div className="podium-spot third">
            <div className="podium-avatar">
              <Award size={24} />
            </div>
            <div className="podium-name">{topThree[2].name}</div>
            <div className="podium-points">{topThree[2].points.toLocaleString()} pts</div>
            <div className="podium-stand">
              <span className="stand-rank">3</span>
            </div>
          </div>
        )}
      </div>

      {/* Full Rankings Table */}
      <div className="rankings-table">
        <div className="table-header">
          <span className="col-rank">Rank</span>
          <span className="col-agent">Agent</span>
          <span className="col-cases">Cases</span>
          <span className="col-recovered">Recovered</span>
          <span className="col-rate">Rate</span>
          <span className="col-points">Points</span>
        </div>

        <div className="table-body">
          {leaderboardData.map((agent) => {
            const badge = getRankBadge(agent.rank);
            const BadgeIcon = badge.icon;
            
            return (
              <div 
                key={agent.id} 
                className={`table-row ${agent.isCurrentUser ? 'current-user' : ''}`}
              >
                <div className="col-rank">
                  <div 
                    className="rank-badge"
                    style={{ background: badge.bg, color: badge.color }}
                  >
                    {agent.rank <= 3 ? <BadgeIcon size={16} /> : agent.rank}
                  </div>
                  {getTrendIcon(agent.trend)}
                </div>
                <div className="col-agent">
                  <div className="agent-info">
                    <span className="agent-name">{agent.name}</span>
                    {agent.isCurrentUser && <span className="you-badge">YOU</span>}
                  </div>
                </div>
                <div className="col-cases">
                  <span className="case-stat">{agent.paidCases}/{agent.totalCases}</span>
                </div>
                <div className="col-recovered">
                  {formatCurrency(agent.totalRecovered)}
                </div>
                <div className="col-rate">
                  <div className="rate-bar">
                    <div 
                      className="rate-fill"
                      style={{ width: `${agent.recoveryRate}%` }}
                    ></div>
                    <span className="rate-text">{agent.recoveryRate}%</span>
                  </div>
                </div>
                <div className="col-points">
                  <span className="points-value">{agent.points.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Points Guide */}
      <div className="points-guide">
        <h4>
          <Zap size={18} />
          How to Earn Points
        </h4>
        <div className="guide-items">
          <div className="guide-item">
            <span className="guide-icon">📞</span>
            <span className="guide-action">Log a Call</span>
            <span className="guide-points">+5 pts</span>
          </div>
          <div className="guide-item">
            <span className="guide-icon">💬</span>
            <span className="guide-action">Send SMS</span>
            <span className="guide-points">+5 pts</span>
          </div>
          <div className="guide-item">
            <span className="guide-icon">✅</span>
            <span className="guide-action">Close a Case</span>
            <span className="guide-points">+50 pts</span>
          </div>
          <div className="guide-item">
            <span className="guide-icon">💰</span>
            <span className="guide-action">Recover $1,000</span>
            <span className="guide-points">+1 pt</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AgentLeaderboard;
