import { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Users,
  BarChart3,
  Activity,
  Clock,
  Target,
  Award
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { supabase } from '../../lib/supabase';
import { useUserProfile } from '../../contexts/UserProfileContext';
import './ManagerDashboard.css';

function ManagerDashboard() {
  const { profile } = useUserProfile();
  const [metrics, setMetrics] = useState({
    totalCases: 0,
    totalOutstanding: 0,
    totalRecovered: 0,
    highPriorityCases: 0,
    activeCases: 0,
    recoveryRate: 0,
    activeAgents: 0,
    avgResolutionTime: 0
  });
  const [statusData, setStatusData] = useState([]);
  const [priorityData, setPriorityData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Get DCA display name
  const getDCADisplayName = (dcaId) => {
    const names = {
      'DCA_A': 'DCA Alpha',
      'DCA_B': 'DCA Beta',
      'DCA_C': 'DCA Gamma',
      'DCA_D': 'DCA Delta',
      'DCA_8f3d1': 'DCA Epsilon',
      'DCA_9a2b4': 'DCA Zeta',
      'DCA_7c1d2': 'DCA Eta'
    };
    return names[dcaId] || dcaId;
  };

  useEffect(() => {
    if (profile?.organization_id) {
      fetchDashboardData();
    }
  }, [profile]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch cases for this DCA
      const { data: cases, error: casesError } = await supabase
        .from('cases')
        .select('*')
        .eq('dca_id', profile.organization_id);

      if (casesError) throw casesError;

      // Calculate metrics
      const totalCases = cases?.length || 0;
      const totalInvoice = cases?.reduce((sum, c) => sum + (c.invoice_amount || 0), 0) || 0;
      const totalRecovered = cases?.reduce((sum, c) => sum + (c.amount_recovered || 0), 0) || 0;
      const totalOutstanding = totalInvoice - totalRecovered;
      const highPriorityCases = cases?.filter(c => c.priority_level === 'HIGH')?.length || 0;
      const activeCases = cases?.filter(c => c.case_status === 'OPEN' || c.case_status === 'IN_PROGRESS')?.length || 0;
      const paidCases = cases?.filter(c => c.case_status === 'PAID')?.length || 0;
      const recoveryRate = totalCases > 0 ? Math.round((paidCases / totalCases) * 100) : 0;

      setMetrics({
        totalCases,
        totalOutstanding,
        totalRecovered,
        highPriorityCases,
        activeCases,
        recoveryRate,
        activeAgents: Math.floor(Math.random() * 8) + 3,
        avgResolutionTime: Math.floor(Math.random() * 10) + 5
      });

      // Status distribution
      const statusCounts = cases?.reduce((acc, c) => {
        acc[c.case_status] = (acc[c.case_status] || 0) + 1;
        return acc;
      }, {}) || {};

      setStatusData(Object.entries(statusCounts).map(([status, count]) => ({
        name: status.replace('_', ' '),
        value: count,
        color: getStatusColor(status)
      })));

      // Priority distribution
      const priorityCounts = cases?.reduce((acc, c) => {
        acc[c.priority_level] = (acc[c.priority_level] || 0) + 1;
        return acc;
      }, {}) || {};

      setPriorityData(Object.entries(priorityCounts).map(([priority, count]) => ({
        name: priority,
        value: count,
        color: getPriorityColor(priority)
      })));

      // Generate trend data (mock for now)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      setTrendData(months.map((month, idx) => ({
        month,
        recovered: Math.floor(Math.random() * 50000) + 20000,
        target: 40000 + idx * 5000,
        cases: Math.floor(Math.random() * 100) + 50
      })));

      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'OPEN': '#3b82f6',
      'IN_PROGRESS': '#f59e0b',
      'PAID': '#22c55e',
      'CLOSED': '#6b7280',
      'DISPUTED': '#ef4444'
    };
    return colors[status] || '#9ca3af';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'HIGH': '#ef4444',
      'MEDIUM': '#f59e0b',
      'LOW': '#22c55e'
    };
    return colors[priority] || '#9ca3af';
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  if (loading) {
    return (
      <div className="manager-dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="manager-dashboard">
      {/* Welcome Banner */}
      <div className="welcome-banner">
        <div className="welcome-content">
          <h1>Welcome back, Manager</h1>
          <p>Here's what's happening with {getDCADisplayName(profile?.organization_id)} today</p>
        </div>
        <div className="welcome-stats">
          <div className="welcome-stat">
            <span className="stat-value">{metrics.recoveryRate}%</span>
            <span className="stat-label">Recovery Rate</span>
          </div>
          <div className="welcome-stat">
            <span className="stat-value">{metrics.activeAgents}</span>
            <span className="stat-label">Active Agents</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon blue">
            <BarChart3 size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Total Cases</span>
            <span className="kpi-value">{metrics.totalCases.toLocaleString()}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon orange">
            <DollarSign size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Outstanding</span>
            <span className="kpi-value">{formatCurrency(metrics.totalOutstanding)}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon green">
            <TrendingUp size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Recovered</span>
            <span className="kpi-value">{formatCurrency(metrics.totalRecovered)}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon red">
            <AlertTriangle size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">High Priority</span>
            <span className="kpi-value">{metrics.highPriorityCases}</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-row">
        {/* Recovery Trend */}
        <div className="chart-card large">
          <div className="chart-header">
            <h3>Recovery Trend</h3>
            <span className="chart-subtitle">Monthly performance overview</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorRecovered" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4caf50" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#4caf50" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" />
              <XAxis dataKey="month" stroke="#666" />
              <YAxis stroke="#666" tickFormatter={(v) => `$${v/1000}k`} />
              <Tooltip 
                contentStyle={{ background: '#1a1a1a', border: '1px solid #2d2d2d', borderRadius: '8px' }}
                formatter={(value) => formatCurrency(value)}
              />
              <Area type="monotone" dataKey="recovered" stroke="#4caf50" fillOpacity={1} fill="url(#colorRecovered)" />
              <Line type="monotone" dataKey="target" stroke="#9c27b0" strokeDasharray="5 5" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>Case Status</h3>
            <span className="chart-subtitle">Distribution by status</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ background: '#1a1a1a', border: '1px solid #2d2d2d', borderRadius: '8px' }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="actions-grid">
          <button className="action-btn">
            <Target size={20} />
            <span>Assign Cases</span>
          </button>
          <button className="action-btn">
            <Users size={20} />
            <span>Manage Team</span>
          </button>
          <button className="action-btn">
            <Activity size={20} />
            <span>View Reports</span>
          </button>
          <button className="action-btn">
            <Award size={20} />
            <span>Leaderboard</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ManagerDashboard;
