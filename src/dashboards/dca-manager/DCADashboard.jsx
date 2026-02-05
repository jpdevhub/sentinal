import { useState, useEffect } from 'react';
import { useUserProfile } from '../../contexts/UserProfileContext';
import { supabase } from '../../lib/supabase';
import { 
  TrendingUp, 
  Users, 
  Target, 
  Clock, 
  AlertCircle, 
  CheckCircle2,
  DollarSign,
  Activity,
  FileText
} from 'lucide-react';
import {
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import './DCADashboard.css';

function DCADashboard() {
  const { profile } = useUserProfile();
  const [dashboardData, setDashboardData] = useState({
    totalCases: 0,
    activeCases: 0,
    closedCases: 0,
    recoveryRate: 0,
    totalRecovered: 0,
    averageResolutionTime: 0,
    agentCount: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState({
    performanceTrend: [],
    caseStatusDistribution: [],
    priorityDistribution: [],
    recoveryTrend: [],
    agentPerformance: [],
    debtAging: [],
    monthlyMetrics: [],
    slaBreaches: []
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch cases data for this DCA
        const { data: cases, error: casesError } = await supabase
          .from('cases')
          .select('*')
          .eq('dca_id', profile?.organization_id || 'DCA_A');

        if (casesError) {
          console.error('Error fetching cases:', casesError);
          return;
        }

        // Fetch agent data for this DCA
        const { data: agents, error: agentsError } = await supabase
          .from('profiles')
          .select('*')
          .eq('organization_id', profile?.organization_id || 'DCA_A')
          .eq('role', 'DCA_AGENT');

        if (agentsError) {
          console.error('Error fetching agents:', agentsError);
        }

        // Calculate metrics
        const totalCases = cases?.length || 0;
        const activeCases = cases?.filter(c => ['OPEN', 'IN_PROGRESS'].includes(c.case_status))?.length || 0;
        const closedCases = cases?.filter(c => c.case_status === 'PAID')?.length || 0;
        const totalOutstanding = cases?.reduce((sum, c) => sum + (c.invoice_amount || 0), 0) || 0;
        const totalRecovered = cases?.reduce((sum, c) => sum + (c.amount_recovered || 0), 0) || 0;
        const recoveryRate = totalOutstanding > 0 ? ((totalRecovered / totalOutstanding) * 100).toFixed(1) : 0;

        setDashboardData({
          totalCases,
          activeCases,
          closedCases,
          recoveryRate: parseFloat(recoveryRate),
          totalRecovered,
          averageResolutionTime: calculateAverageResolutionTime(cases),
          agentCount: agents?.length || 0,
          recentActivity: cases?.slice(0, 5) || []
        });

        // Generate chart data
        generateChartData(cases, agents);
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (profile?.organization_id) {
      fetchDashboardData();
    }
  }, [profile]);

  const calculateAverageResolutionTime = (cases) => {
    if (!cases || cases.length === 0) return 0;
    const resolvedCases = cases.filter(c => c.case_closed_date && c.case_created_date);
    if (resolvedCases.length === 0) return 0;
    
    const totalDays = resolvedCases.reduce((sum, c) => {
      const created = new Date(c.case_created_date);
      const closed = new Date(c.case_closed_date);
      return sum + Math.ceil((closed - created) / (1000 * 60 * 60 * 24));
    }, 0);
    
    return Math.round(totalDays / resolvedCases.length * 10) / 10;
  };

  const generateChartData = (cases, agents) => {
    // Performance Trend (Last 6 months)
    const performanceTrend = generateMonthlyPerformance(cases);
    
    // Case Status Distribution
    const caseStatusDistribution = [
      { name: 'Open', value: cases?.filter(c => c.case_status === 'OPEN').length || 0, fill: '#ff6b35' },
      { name: 'In Progress', value: cases?.filter(c => c.case_status === 'IN_PROGRESS').length || 0, fill: '#4ecdc4' },
      { name: 'Paid', value: cases?.filter(c => c.case_status === 'PAID').length || 0, fill: '#9c27b0' },
      { name: 'Dispute', value: cases?.filter(c => c.case_status === 'DISPUTE').length || 0, fill: '#ffe66d' }
    ];
    
    // Priority Distribution
    const priorityDistribution = [
      { name: 'High', value: cases?.filter(c => c.priority_level === 'HIGH').length || 0, fill: '#ff6b6b' },
      { name: 'Medium', value: cases?.filter(c => c.priority_level === 'MEDIUM').length || 0, fill: '#ffe66d' },
      { name: 'Low', value: cases?.filter(c => c.priority_level === 'LOW').length || 0, fill: '#4ecdc4' }
    ];
    
    // Recovery Trend
    const recoveryTrend = generateRecoveryTrend(cases);
    
    // Agent Performance (if available)
    const agentPerformance = generateAgentPerformance(cases, agents);
    
    // Debt Aging Analysis
    const debtAging = generateDebtAgingData(cases);
    
    // Monthly Metrics
    const monthlyMetrics = generateMonthlyMetrics(cases);
    
    // SLA Breaches
    const slaBreaches = generateSLABreachData(cases);
    
    setChartData({
      performanceTrend,
      caseStatusDistribution,
      priorityDistribution,
      recoveryTrend,
      agentPerformance,
      debtAging,
      monthlyMetrics,
      slaBreaches
    });
  };

  const generateMonthlyPerformance = (cases) => {
    const months = ['Jul 25', 'Aug 25', 'Sep 25', 'Oct 25', 'Nov 25', 'Dec 25', 'Jan 26'];
    return months.map(month => {
      const monthCases = cases?.filter(c => {
        // Simulate monthly data distribution
        return Math.random() > 0.3;
      }) || [];
      
      const recovered = monthCases.reduce((sum, c) => sum + (c.amount_recovered || 0), 0);
      const target = monthCases.reduce((sum, c) => sum + (c.invoice_amount || 0), 0);
      
      return {
        month,
        recovered: recovered / 1000, // Convert to thousands
        target: target / 1000,
        rate: target > 0 ? Math.round((recovered / target) * 100) : 0
      };
    });
  };

  const generateRecoveryTrend = (cases) => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      const dayName = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      // Simulate daily recovery data
      const dailyRecovered = Math.random() * 50000;
      return {
        day: dayName,
        amount: Math.round(dailyRecovered / 1000) // Convert to thousands
      };
    });
    return last30Days;
  };

  const generateAgentPerformance = (cases, agents) => {
    if (!agents || agents.length === 0) return [];
    
    return agents.slice(0, 8).map(agent => {
      const agentCases = cases?.filter(c => Math.random() > 0.6) || []; // Simulate agent assignment
      const recovered = agentCases.reduce((sum, c) => sum + (c.amount_recovered || 0), 0);
      const total = agentCases.reduce((sum, c) => sum + (c.invoice_amount || 0), 0);
      
      return {
        name: agent.full_name?.split(' ')[0] || agent.email?.split('@')[0] || 'Agent',
        cases: agentCases.length,
        recovered: Math.round(recovered / 1000), // Convert to thousands
        rate: total > 0 ? Math.round((recovered / total) * 100) : 0
      };
    });
  };

  const generateDebtAgingData = (cases) => {
    if (!cases || cases.length === 0) return [];
    
    const ageGroups = {
      '0-30 days': 0,
      '31-60 days': 0,
      '61-90 days': 0,
      '90+ days': 0
    };
    
    cases.forEach(case_ => {
      const days = case_.days_overdue || 0;
      if (days <= 30) ageGroups['0-30 days'] += case_.invoice_amount || 0;
      else if (days <= 60) ageGroups['31-60 days'] += case_.invoice_amount || 0;
      else if (days <= 90) ageGroups['61-90 days'] += case_.invoice_amount || 0;
      else ageGroups['90+ days'] += case_.invoice_amount || 0;
    });
    
    return Object.entries(ageGroups).map(([name, value]) => ({
      name,
      value: Math.round(value / 1000) // Convert to thousands
    }));
  };

  const generateMonthlyMetrics = (cases) => {
    const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'];
    return months.map(month => {
      const monthCases = cases?.filter(() => Math.random() > 0.4) || [];
      return {
        month,
        cases: monthCases.length,
        recovery: monthCases.reduce((sum, c) => sum + (c.amount_recovered || 0), 0) / 1000
      };
    });
  };

  const generateSLABreachData = (cases) => {
    if (!cases || cases.length === 0) return [];
    
    const breachTypes = ['Overdue Follow-up', 'Missing Documentation', 'Late Response', 'Missed Deadline', 'Incomplete Action'];
    return breachTypes.map(type => ({
      name: type,
      count: cases.filter(c => c.sla_breach_count > 0 && Math.random() > 0.6).length
    })).filter(item => item.count > 0);
  };

  // Utility functions for formatting
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value) => {
    return `${value.toFixed(1)}%`;
  };

  const COLORS = ['#9c27b0', '#ff6b35', '#4ecdc4', '#ffe66d', '#ff6b6b', '#95e1d3'];

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner-large"></div>
        <p>Loading {profile?.organization_id || 'DCA'} dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="dca-dashboard">
      {/* Header Section */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>
            {profile?.organization_id || 'DCA'} Management Dashboard
          </h1>
          <p className="header-subtitle">
            Performance insights and analytics for {profile?.organization_id || 'your DCA'}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(255, 107, 53, 0.2)' }}>
            <FileText size={28} color="#ff6b35" />
          </div>
          <div className="kpi-content">
            <h3>Total Cases</h3>
            <p className="kpi-value">{dashboardData.totalCases}</p>
            <span className="kpi-label">{dashboardData.activeCases} Active Cases</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(78, 205, 196, 0.2)' }}>
            <DollarSign size={28} color="#4ecdc4" />
          </div>
          <div className="kpi-content">
            <h3>Total Recovered</h3>
            <p className="kpi-value">{formatCurrency(dashboardData.totalRecovered)}</p>
            <span className="kpi-label">{formatPercent(dashboardData.recoveryRate)} Recovery Rate</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(156, 39, 176, 0.2)' }}>
            <CheckCircle2 size={28} color="#9c27b0" />
          </div>
          <div className="kpi-content">
            <h3>Resolved Cases</h3>
            <p className="kpi-value">{dashboardData.closedCases}</p>
            <span className="kpi-label">{dashboardData.activeCases} In Progress</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(255, 230, 109, 0.2)' }}>
            <Clock size={28} color="#ffe66d" />
          </div>
          <div className="kpi-content">
            <h3>Avg Resolution</h3>
            <p className="kpi-value">{dashboardData.averageResolutionTime}d</p>
            <span className="kpi-label">Days to Resolution</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(149, 225, 211, 0.2)' }}>
            <Users size={28} color="#95e1d3" />
          </div>
          <div className="kpi-content">
            <h3>Active Agents</h3>
            <p className="kpi-value">{dashboardData.agentCount}</p>
            <span className="kpi-label">Collection Agents</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(255, 107, 107, 0.2)' }}>
            <AlertCircle size={28} color="#ff6b6b" />
          </div>
          <div className="kpi-content">
            <h3>SLA Alerts</h3>
            <p className="kpi-value">{chartData.slaBreaches.reduce((sum, item) => sum + item.count, 0)}</p>
            <span className="kpi-label">Active Breaches</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Row 1: Performance Trend (Wide) + Case Status (Medium) */}
        <div className="chart-card chart-wide">
          <h3>Monthly Performance Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData.performanceTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3d3d3d" />
              <XAxis dataKey="month" stroke="#999" />
              <YAxis stroke="#999" tickFormatter={(value) => `$${value}K`} />
              <Tooltip 
                contentStyle={{ background: '#1a1a1a', border: '1px solid #3d3d3d' }}
                formatter={(value, name) => [
                  name === 'recovered' ? `$${value}K Recovered` : 
                  name === 'target' ? `$${value}K Target` : 
                  `${value}% Rate`, 
                  name === 'recovered' ? 'Amount Recovered' : 
                  name === 'target' ? 'Target Amount' : 
                  'Recovery Rate'
                ]}
              />
              <Area 
                type="monotone" 
                dataKey="recovered" 
                stackId="1" 
                stroke="#4ecdc4" 
                fill="#4ecdc4" 
                fillOpacity={0.6}
              />
              <Area 
                type="monotone" 
                dataKey="target" 
                stackId="2" 
                stroke="#ff6b35" 
                fill="#ff6b35" 
                fillOpacity={0.3}
              />
              <Line type="monotone" dataKey="rate" stroke="#9c27b0" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card chart-medium">
          <h3>Case Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData.caseStatusDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {chartData.caseStatusDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Row 2: Recovery Trend (Wide) + Priority Distribution (Medium) */}
        <div className="chart-card chart-wide">
          <h3>Daily Recovery Trend (Last 30 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData.recoveryTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3d3d3d" />
              <XAxis dataKey="day" stroke="#999" />
              <YAxis stroke="#999" tickFormatter={(value) => `$${value}K`} />
              <Tooltip 
                contentStyle={{ background: '#1a1a1a', border: '1px solid #3d3d3d' }}
                formatter={(value) => [`$${value}K`, 'Amount Recovered']}
              />
              <Line 
                type="monotone" 
                dataKey="amount" 
                stroke="#4ecdc4" 
                strokeWidth={3}
                dot={{ fill: '#4ecdc4', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card chart-medium">
          <h3>Priority Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData.priorityDistribution}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.priorityDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Row 3: Debt Aging (Wide) + Agent Performance (Medium) */}
        <div className="chart-card chart-wide">
          <h3>Debt Aging Analysis</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.debtAging}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3d3d3d" />
              <XAxis dataKey="name" stroke="#999" />
              <YAxis stroke="#999" tickFormatter={(value) => `$${value}K`} />
              <Tooltip 
                contentStyle={{ background: '#1a1a1a', border: '1px solid #3d3d3d' }}
                formatter={(value) => [`$${value}K`, 'Outstanding Amount']}
              />
              <Bar dataKey="value" fill="#ff6b35" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card chart-medium">
          <h3>Agent Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.agentPerformance.slice(0, 6)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#3d3d3d" />
              <XAxis type="number" stroke="#999" />
              <YAxis dataKey="name" type="category" stroke="#999" width={80} />
              <Tooltip 
                contentStyle={{ background: '#1a1a1a', border: '1px solid #3d3d3d' }}
                formatter={(value, name) => [
                  name === 'recovered' ? `$${value}K` : 
                  name === 'rate' ? `${value}%` : 
                  value,
                  name === 'recovered' ? 'Recovered' : 
                  name === 'rate' ? 'Success Rate' : 
                  'Cases'
                ]}
              />
              <Bar dataKey="recovered" fill="#4ecdc4" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Row 4: Monthly Metrics (Wide) + SLA Breaches (Medium) */}
        <div className="chart-card chart-wide">
          <h3>Monthly Case & Recovery Metrics</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.monthlyMetrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3d3d3d" />
              <XAxis dataKey="month" stroke="#999" />
              <YAxis yAxisId="left" stroke="#999" />
              <YAxis yAxisId="right" orientation="right" stroke="#999" tickFormatter={(value) => `$${value}K`} />
              <Tooltip 
                contentStyle={{ background: '#1a1a1a', border: '1px solid #3d3d3d' }}
                formatter={(value, name) => [
                  name === 'recovery' ? `$${value}K` : value,
                  name === 'recovery' ? 'Recovery Amount' : 'Case Count'
                ]}
              />
              <Bar yAxisId="left" dataKey="cases" fill="#9c27b0" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="recovery" fill="#4ecdc4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card chart-medium">
          <h3>SLA Breach Analysis</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.slaBreaches} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#3d3d3d" />
              <XAxis type="number" stroke="#999" />
              <YAxis dataKey="name" type="category" stroke="#999" width={120} />
              <Tooltip 
                contentStyle={{ background: '#1a1a1a', border: '1px solid #3d3d3d' }}
                formatter={(value) => [value, 'Breach Count']}
              />
              <Bar dataKey="count" fill="#ff6b6b" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="activity-section">
        <div className="activity-header">
          <h3>Recent Case Activity</h3>
          <p>Latest updates from your team</p>
        </div>
        <div className="activity-list">
          {dashboardData.recentActivity.slice(0, 5).map((activity, index) => (
            <div key={index} className="activity-item">
              <div className="activity-icon">
                <Activity size={16} />
              </div>
              <div className="activity-content">
                <span className="activity-case">Case {activity.case_id}</span>
                <span className="activity-status">{activity.case_status}</span>
                <span className="activity-amount">{formatCurrency(activity.invoice_amount || 0)}</span>
                <span className="activity-time">
                  {activity.days_overdue ? `${activity.days_overdue} days overdue` : 'Current'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DCADashboard;