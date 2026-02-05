import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Play,
  Clock,
  AlertTriangle,
  TrendingUp,
  Zap,
  Target,
  Phone,
  RefreshCw,
  Filter,
  ChevronRight
} from 'lucide-react';
import './SmartWorklist.css';

function SmartWorklist({ onStartCase }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [cases, setCases] = useState([]);
  const [stats, setStats] = useState({
    totalCases: 0,
    highPriority: 0,
    totalValue: 0,
    avgRiskScore: 0
  });
  const [filter, setFilter] = useState('all'); // all, high, medium, low

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

  // AI-based best time to call logic
  const getBestTimeToCall = (caseData) => {
    const hour = new Date().getHours();
    const riskScore = caseData.risk_score || 50;
    const daysOverdue = caseData.days_overdue || 0;

    // High risk + overdue = call now
    if (riskScore > 70 && daysOverdue > 30) {
      return { text: 'Call immediately', urgent: true };
    }
    
    // Business hours optimal
    if (hour >= 10 && hour <= 14) {
      return { text: 'Optimal time now', urgent: false };
    }
    
    if (hour < 10) {
      return { text: 'Best after 10 AM', urgent: false };
    }
    
    if (hour > 14 && hour < 17) {
      return { text: 'Good time to call', urgent: false };
    }

    return { text: 'Try tomorrow 10-2 PM', urgent: false };
  };

  // AI prediction for payment likelihood
  const getAIPrediction = (caseData) => {
    const riskScore = caseData.risk_score || 50;
    const daysOverdue = caseData.days_overdue || 0;
    const amount = caseData.invoice_amount || 0;

    if (riskScore < 30 && daysOverdue < 15) {
      return { text: 'Likely to pay today', confidence: 'high' };
    }
    
    if (riskScore < 50 && daysOverdue < 30) {
      return { text: 'High chance with follow-up', confidence: 'medium' };
    }
    
    if (amount < 5000 && daysOverdue < 45) {
      return { text: 'May settle if flexible terms offered', confidence: 'medium' };
    }
    
    if (riskScore > 70) {
      return { text: 'Needs escalation path', confidence: 'low' };
    }

    return { text: 'Standard follow-up recommended', confidence: 'medium' };
  };

  // Fetch cases assigned to this agent
  const fetchCases = useCallback(async (userProfile) => {
    if (!userProfile) return;

    try {
      setLoading(true);

      // Get cases assigned to this agent
      const { data: assignments, error: assignError } = await supabase
        .from('agent_case_assignments')
        .select(`
          case_id,
          assigned_date,
          cases (
            case_id,
            customer_name,
            invoice_amount,
            case_status,
            priority_level,
            days_overdue,
            risk_score,
            dca_id
          )
        `)
        .eq('agent_id', userProfile.id);

      if (assignError) throw assignError;

      // Filter for active cases only
      const activeCases = (assignments || [])
        .map(a => a.cases)
        .filter(c => c && c.case_status !== 'PAID' && c.case_status !== 'CLOSED');

      // Sort by AI logic: Risk Score * Days Overdue (higher = more urgent)
      const sortedCases = activeCases.sort((a, b) => {
        const scoreA = (a.risk_score || 50) * (a.days_overdue || 1);
        const scoreB = (b.risk_score || 50) * (b.days_overdue || 1);
        return scoreB - scoreA;
      });

      // Calculate stats
      const totalValue = activeCases.reduce((sum, c) => sum + (parseFloat(c.invoice_amount) || 0), 0);
      const highPriority = activeCases.filter(c => c.priority_level === 'HIGH').length;
      const avgRisk = activeCases.length > 0 
        ? Math.round(activeCases.reduce((sum, c) => sum + (c.risk_score || 50), 0) / activeCases.length)
        : 0;

      setStats({
        totalCases: activeCases.length,
        highPriority,
        totalValue,
        avgRiskScore: avgRisk
      });

      setCases(sortedCases);
    } catch (error) {
      console.error('Error fetching cases:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      const userProfile = await fetchProfile();
      if (userProfile) {
        await fetchCases(userProfile);
      }
    };
    init();
  }, [fetchProfile, fetchCases]);

  // Filter cases
  const filteredCases = cases.filter(c => {
    if (filter === 'all') return true;
    return c.priority_level?.toLowerCase() === filter;
  });

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Get risk color
  const getRiskColor = (priority) => {
    switch (priority) {
      case 'HIGH': return '#ef4444';
      case 'MEDIUM': return '#f59e0b';
      case 'LOW': return '#4ade80';
      default: return '#888';
    }
  };

  if (loading) {
    return (
      <div className="smart-worklist-loading">
        <div className="loading-spinner"></div>
        <p>Loading your worklist...</p>
      </div>
    );
  }

  return (
    <div className="smart-worklist">
      {/* Header */}
      <div className="worklist-header">
        <div className="header-content">
          <h1>
            <Zap size={28} />
            Smart Worklist
          </h1>
          <p>AI-prioritized calls • Who to call next</p>
        </div>
        <button className="refresh-btn" onClick={() => fetchCases(profile)}>
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* Quick Stats */}
      <div className="worklist-stats">
        <div className="stat-card">
          <div className="stat-icon blue">
            <Target size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalCases}</span>
            <span className="stat-label">Active Cases</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">
            <AlertTriangle size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.highPriority}</span>
            <span className="stat-label">High Priority</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <TrendingUp size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{formatCurrency(stats.totalValue)}</span>
            <span className="stat-label">Total Value</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">
            <Zap size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.avgRiskScore}%</span>
            <span className="stat-label">Avg Risk Score</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button 
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({cases.length})
        </button>
        <button 
          className={`filter-tab high ${filter === 'high' ? 'active' : ''}`}
          onClick={() => setFilter('high')}
        >
          🔴 High Priority
        </button>
        <button 
          className={`filter-tab medium ${filter === 'medium' ? 'active' : ''}`}
          onClick={() => setFilter('medium')}
        >
          🟡 Medium
        </button>
        <button 
          className={`filter-tab low ${filter === 'low' ? 'active' : ''}`}
          onClick={() => setFilter('low')}
        >
          🟢 Low
        </button>
      </div>

      {/* Case Cards */}
      <div className="case-cards">
        {filteredCases.length === 0 ? (
          <div className="empty-state">
            <Target size={48} />
            <h3>No cases in your worklist</h3>
            <p>Check back later or contact your manager for new assignments</p>
          </div>
        ) : (
          filteredCases.map((caseData, index) => {
            const bestTime = getBestTimeToCall(caseData);
            const aiPrediction = getAIPrediction(caseData);
            
            return (
              <div key={caseData.case_id} className={`case-card ${index === 0 ? 'top-priority' : ''}`}>
                {index === 0 && (
                  <div className="top-priority-badge">
                    <Zap size={14} />
                    NEXT CALL
                  </div>
                )}
                
                <div className="case-card-header">
                  <div className="customer-info">
                    <h3>{caseData.customer_name}</h3>
                    <span className="case-id">{caseData.case_id}</span>
                  </div>
                  <div 
                    className="amount-badge"
                    style={{ color: caseData.invoice_amount > 10000 ? '#ef4444' : '#fbbf24' }}
                  >
                    {formatCurrency(caseData.invoice_amount)}
                  </div>
                </div>

                <div className="case-card-meta">
                  <div className="meta-item">
                    <span 
                      className="risk-badge"
                      style={{ 
                        background: `${getRiskColor(caseData.priority_level)}20`,
                        color: getRiskColor(caseData.priority_level)
                      }}
                    >
                      {caseData.priority_level || 'MEDIUM'} Risk
                    </span>
                  </div>
                  <div className="meta-item">
                    <Clock size={14} />
                    <span>{caseData.days_overdue || 0} days overdue</span>
                  </div>
                </div>

                <div className="ai-insights">
                  <div className={`ai-badge ${bestTime.urgent ? 'urgent' : ''}`}>
                    <Clock size={14} />
                    {bestTime.text}
                  </div>
                  <div className={`ai-badge prediction ${aiPrediction.confidence}`}>
                    <Zap size={14} />
                    {aiPrediction.text}
                  </div>
                </div>

                <button 
                  className="start-btn"
                  onClick={() => onStartCase(caseData)}
                >
                  <Play size={20} />
                  START
                  <ChevronRight size={18} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default SmartWorklist;
