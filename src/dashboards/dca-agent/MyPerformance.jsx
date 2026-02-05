import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Trophy,
  Target,
  TrendingUp,
  DollarSign,
  CheckCircle,
  Clock,
  Award,
  Star,
  Flame,
  Calendar,
  BarChart2,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import './MyPerformance.css';

function MyPerformance() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [performance, setPerformance] = useState({
    recovered: 0,
    closedCases: 0,
    totalCases: 0,
    recoveryRate: 0,
    avgCallsPerDay: 0,
    avgTimePerCase: 0,
    streak: 0,
    rank: 0,
    totalAgents: 0,
    points: 0
  });
  const [targets, setTargets] = useState({
    monthly: 50000,
    achieved: 0,
    progress: 0
  });
  const [badges, setBadges] = useState([]);
  const [weeklyStats, setWeeklyStats] = useState([]);
  const [timeframe, setTimeframe] = useState('month');

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

  // Fetch performance data
  const fetchPerformance = useCallback(async (userProfile) => {
    if (!userProfile) return;

    try {
      // Get assigned cases
      const { data: assignments, error } = await supabase
        .from('agent_case_assignments')
        .select(`
          case_id,
          cases (
            case_id,
            invoice_amount,
            case_status
          )
        `)
        .eq('agent_id', userProfile.id);

      if (error) throw error;

      const cases = assignments?.map(a => a.cases).filter(Boolean) || [];
      const closedCases = cases.filter(c => c.case_status === 'PAID');
      const recovered = closedCases.reduce((sum, c) => sum + (parseFloat(c.invoice_amount) || 0), 0);
      const recoveryRate = cases.length > 0 ? Math.round((closedCases.length / cases.length) * 100) : 0;

      // Calculate points
      const points = Math.round(recovered / 100) + (closedCases.length * 50) + (recoveryRate * 10);

      // Mock additional stats
      // Calculate streak
      const streak = Math.floor(Math.random() * 10);

      setPerformance({
        recovered,
        closedCases: closedCases.length,
        totalCases: cases.length,
        recoveryRate,
        avgCallsPerDay: Math.floor(Math.random() * 20) + 10,
        avgTimePerCase: Math.floor(Math.random() * 10) + 5,
        streak,
        rank: Math.floor(Math.random() * 5) + 1,
        totalAgents: 8,
        points
      });

      setTargets({
        monthly: 50000,
        achieved: recovered,
        progress: Math.min(100, Math.round((recovered / 50000) * 100))
      });

      // Mock badges - use local streak variable
      setBadges([
        { id: 1, name: 'First Recovery', icon: '🎯', earned: true, date: 'Jan 15, 2026' },
        { id: 2, name: 'Fast Closer', icon: '⚡', earned: true, date: 'Jan 22, 2026' },
        { id: 3, name: 'Hot Streak', icon: '🔥', earned: streak >= 5, date: 'Feb 1, 2026' },
        { id: 4, name: 'Top Performer', icon: '🏆', earned: false, date: null },
        { id: 5, name: '$10K Club', icon: '💰', earned: recovered >= 10000, date: 'Feb 3, 2026' },
        { id: 6, name: 'Perfect Week', icon: '⭐', earned: false, date: null }
      ]);

      // Mock weekly stats
      setWeeklyStats([
        { day: 'Mon', calls: 15, recovered: 2500 },
        { day: 'Tue', calls: 22, recovered: 4200 },
        { day: 'Wed', calls: 18, recovered: 3100 },
        { day: 'Thu', calls: 25, recovered: 5800 },
        { day: 'Fri', calls: 20, recovered: 4500 },
        { day: 'Sat', calls: 0, recovered: 0 },
        { day: 'Sun', calls: 0, recovered: 0 }
      ]);

    } catch (error) {
      console.error('Error fetching performance:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const userProfile = await fetchProfile();
      if (userProfile) {
        await fetchPerformance(userProfile);
      }
      setLoading(false);
    };
    init();
  }, [fetchProfile, fetchPerformance]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="performance-loading">
        <div className="loading-spinner"></div>
        <p>Loading Performance...</p>
      </div>
    );
  }

  return (
    <div className="my-performance-page">
      {/* Header */}
      <div className="performance-header">
        <div className="header-info">
          <h1><Trophy size={24} /> My Performance</h1>
          <p>Track your progress and achievements</p>
        </div>
        <div className="timeframe-selector">
          {['week', 'month', 'quarter'].map(tf => (
            <button
              key={tf}
              className={`timeframe-btn ${timeframe === tf ? 'active' : ''}`}
              onClick={() => setTimeframe(tf)}
            >
              {tf.charAt(0).toUpperCase() + tf.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Rank Card */}
      <div className="rank-card">
        <div className="rank-content">
          <div className="rank-position">
            <span className="rank-number">#{performance.rank}</span>
            <span className="rank-total">of {performance.totalAgents} agents</span>
          </div>
          <div className="rank-info">
            <h2>{profile?.full_name || 'Agent'}</h2>
            <div className="rank-stats">
              <span><Flame size={16} /> {performance.streak} day streak</span>
              <span><Star size={16} /> {performance.points.toLocaleString()} points</span>
            </div>
          </div>
        </div>
        <div className="rank-trend">
          <ArrowUp size={24} />
          <span>+2 from last week</span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon">
            <DollarSign size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-value">{formatCurrency(performance.recovered)}</span>
            <span className="kpi-label">Total Recovered</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon">
            <CheckCircle size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-value">{performance.closedCases}</span>
            <span className="kpi-label">Cases Closed</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon">
            <Target size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-value">{performance.recoveryRate}%</span>
            <span className="kpi-label">Recovery Rate</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon">
            <Clock size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-value">{performance.avgTimePerCase}d</span>
            <span className="kpi-label">Avg. Time to Close</span>
          </div>
        </div>
      </div>

      {/* Target Progress */}
      <div className="target-card">
        <div className="target-header">
          <h3><Target size={18} /> Monthly Target</h3>
          <span className="target-period">February 2026</span>
        </div>
        <div className="target-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${targets.progress}%` }}
            />
          </div>
          <div className="progress-labels">
            <span>{formatCurrency(targets.achieved)}</span>
            <span>{targets.progress}%</span>
            <span>{formatCurrency(targets.monthly)}</span>
          </div>
        </div>
        <div className="target-remaining">
          {targets.achieved >= targets.monthly ? (
            <span className="target-achieved">🎉 Target Achieved!</span>
          ) : (
            <span>{formatCurrency(targets.monthly - targets.achieved)} remaining to hit target</span>
          )}
        </div>
      </div>

      {/* Content Grid */}
      <div className="content-grid">
        {/* Weekly Activity */}
        <div className="weekly-card">
          <h3><BarChart2 size={18} /> This Week's Activity</h3>
          <div className="weekly-chart">
            {weeklyStats.map((day, index) => (
              <div key={index} className="day-bar">
                <div className="bar-container">
                  <div 
                    className="bar-fill" 
                    style={{ height: `${(day.recovered / 6000) * 100}%` }}
                  />
                </div>
                <span className="day-label">{day.day}</span>
                <span className="day-value">{formatCurrency(day.recovered)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Badges */}
        <div className="badges-card">
          <h3><Award size={18} /> Badges & Achievements</h3>
          <div className="badges-grid">
            {badges.map(badge => (
              <div 
                key={badge.id} 
                className={`badge-item ${badge.earned ? 'earned' : 'locked'}`}
              >
                <span className="badge-icon">{badge.icon}</span>
                <span className="badge-name">{badge.name}</span>
                {badge.earned && badge.date && (
                  <span className="badge-date">{badge.date}</span>
                )}
                {!badge.earned && (
                  <span className="badge-locked">🔒</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Stats */}
      <div className="activity-stats-card">
        <h3><TrendingUp size={18} /> Performance Insights</h3>
        <div className="insights-grid">
          <div className="insight-item">
            <div className="insight-icon calls">📞</div>
            <div className="insight-content">
              <span className="insight-value">{performance.avgCallsPerDay}</span>
              <span className="insight-label">Avg Calls/Day</span>
            </div>
            <span className="insight-trend up">+12%</span>
          </div>
          <div className="insight-item">
            <div className="insight-icon emails">📧</div>
            <div className="insight-content">
              <span className="insight-value">45</span>
              <span className="insight-label">Emails Sent</span>
            </div>
            <span className="insight-trend up">+8%</span>
          </div>
          <div className="insight-item">
            <div className="insight-icon response">⏱️</div>
            <div className="insight-content">
              <span className="insight-value">2.4h</span>
              <span className="insight-label">Avg Response Time</span>
            </div>
            <span className="insight-trend down">-15%</span>
          </div>
          <div className="insight-item">
            <div className="insight-icon success">✅</div>
            <div className="insight-content">
              <span className="insight-value">78%</span>
              <span className="insight-label">Contact Rate</span>
            </div>
            <span className="insight-trend up">+5%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MyPerformance;
