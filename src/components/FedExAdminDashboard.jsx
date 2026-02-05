import { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Activity,
  Users as UsersIcon,
  Shield,
  BarChart3,
  Globe
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { supabase } from '../lib/supabase';
import { useUserProfile } from '../contexts/UserProfileContext';
import './FedExAdminDashboard.css';

function FedExAdminDashboard() {
  // Removed unused profile variable
  const [metrics, setMetrics] = useState({
    totalCases: 0,
    totalOutstanding: 0,
    totalRecovered: 0,
    totalOrganizations: 0,
    highPriorityCases: 0,
    activeCases: 0
  });
  const [organizationData, setOrganizationData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [priorityData, setPriorityData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch ALL cases for FedEx Admin dashboard (no limit - they need complete visibility)
      const { data: cases, error: casesError } = await supabase
        .from('cases')
        .select('*');

      if (casesError) throw casesError;

      // Calculate metrics with null safety
      const totalCases = cases?.length || 0;
      const totalOutstanding = cases?.reduce((sum, case_item) => sum + ((case_item?.invoice_amount || 0) - (case_item?.amount_recovered || 0)), 0) || 0;
      const totalRecovered = cases?.reduce((sum, case_item) => sum + (case_item?.amount_recovered || 0), 0) || 0;
      const highPriorityCases = cases?.filter(case_item => case_item?.priority_level === 'HIGH')?.length || 0;
      const activeCases = cases?.filter(case_item => case_item?.case_status === 'OPEN' || case_item?.case_status === 'IN_PROGRESS')?.length || 0;

      // Get unique organizations safely
      const organizations = cases ? [...new Set(cases.map(case_item => case_item?.dca_id).filter(Boolean))] : [];

      setMetrics({
        totalCases,
        totalOutstanding,
        totalRecovered,
        totalOrganizations: organizations.length,
        highPriorityCases,
        activeCases
      });

      // Organization performance data with error handling
      const orgData = organizations.map(org => {
        const orgCases = cases?.filter(case_item => case_item?.dca_id === org) || [];
        const totalRevenue = orgCases.reduce((sum, case_item) => sum + (case_item?.invoice_amount || 0), 0);
        const recoveredAmount = orgCases.reduce((sum, case_item) => sum + (case_item?.amount_recovered || 0), 0);
        const paidCases = orgCases.filter(case_item => case_item?.case_status === 'PAID').length;
        
        return {
          name: getOrganizationDisplayName(org),
          cases: orgCases.length,
          outstanding: totalRevenue - recoveredAmount,
          recovered: recoveredAmount,
          successRate: orgCases.length > 0 ? (paidCases / orgCases.length * 100) : 0,
          recoveryRate: totalRevenue > 0 ? (recoveredAmount / totalRevenue * 100) : 0,
          performance: orgCases.length > 0 ? Math.round((orgCases.filter(c => c.case_status === 'PAID').length / orgCases.length) * 100) : 0
        };
      });

      setOrganizationData(orgData);

      // Status distribution
      const statusCounts = cases.reduce((acc, case_item) => {
        acc[case_item.case_status] = (acc[case_item.case_status] || 0) + 1;
        return acc;
      }, {});

      setStatusData(Object.entries(statusCounts).map(([status, count]) => ({
        name: status.replace('_', ' '),
        value: count
      })));

      // Priority distribution
      const priorityCounts = cases.reduce((acc, case_item) => {
        acc[case_item.priority_level] = (acc[case_item.priority_level] || 0) + 1;
        return acc;
      }, {});

      setPriorityData(Object.entries(priorityCounts).map(([priority, count]) => ({
        name: priority,
        value: count
      })));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchDashboardData();
    };
    loadData();
  }, []);

  const getOrganizationDisplayName = (orgId) => {
    const orgNames = {
      'FEDEX_HQ': 'FedEx HQ',
      'DCA_8f3d1': 'DCA Alpha',
      'DCA_9a2b4': 'DCA Beta', 
      'DCA_7c1d2': 'DCA Gamma'
    };
    return orgNames[orgId] || orgId;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner-large"></div>
        <p>Loading FedEx Admin Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="fedex-admin-dashboard">
      {/* Welcome Section */}
      <div className="admin-welcome">
        <h2>Welcome, FedEx Administrator</h2>
        <p>Global overview of all debt collection operations across all organizations</p>
      </div>

      {/* KPI Grid - Global Metrics */}
      <div className="kpi-grid">
        <div className="kpi-card admin-kpi">
          <div className="kpi-icon" style={{ background: 'rgba(255, 107, 53, 0.2)' }}>
            <Globe size={28} color="#ff6b35" />
          </div>
          <div className="kpi-content">
            <h3>Total Outstanding</h3>
            <p className="kpi-value">{formatCurrency(metrics.totalOutstanding)}</p>
            <span className="kpi-label">{metrics.totalCases} Total Cases</span>
          </div>
        </div>

        <div className="kpi-card admin-kpi">
          <div className="kpi-icon" style={{ background: 'rgba(78, 205, 196, 0.2)' }}>
            <CheckCircle size={28} color="#4ecdc4" />
          </div>
          <div className="kpi-content">
            <h3>Total Recovered</h3>
            <p className="kpi-value">{formatCurrency(metrics.totalRecovered)}</p>
            <span className="kpi-label">
              {Math.round((metrics.totalRecovered / (metrics.totalRecovered + metrics.totalOutstanding)) * 100)}% Recovery Rate
            </span>
          </div>
        </div>

        <div className="kpi-card admin-kpi">
          <div className="kpi-icon" style={{ background: 'rgba(255, 193, 7, 0.2)' }}>
            <Shield size={28} color="#ffc107" />
          </div>
          <div className="kpi-content">
            <h3>Organizations</h3>
            <p className="kpi-value">{metrics.totalOrganizations}</p>
            <span className="kpi-label">Active DCAs</span>
          </div>
        </div>

        <div className="kpi-card admin-kpi">
          <div className="kpi-icon" style={{ background: 'rgba(244, 67, 54, 0.2)' }}>
            <AlertTriangle size={28} color="#f44336" />
          </div>
          <div className="kpi-content">
            <h3>High Priority</h3>
            <p className="kpi-value">{metrics.highPriorityCases}</p>
            <span className="kpi-label">{metrics.activeCases} Active Cases</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Organization Performance */}
        <div className="chart-card">
          <h3>Organization Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={organizationData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value, name) => [
                name === 'outstanding' || name === 'recovered' ? formatCurrency(value) : value,
                name === 'outstanding' ? 'Outstanding' : 
                name === 'recovered' ? 'Recovered' :
                name === 'cases' ? 'Cases' : 'Performance %'
              ]} />
              <Legend />
              <Bar dataKey="cases" fill="#8884d8" name="Cases" />
              <Bar dataKey="performance" fill="#82ca9d" name="Recovery %" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Case Status Distribution */}
        <div className="chart-card">
          <h3>Global Case Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Priority Distribution */}
        <div className="chart-card">
          <h3>Priority Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={priorityData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label
              >
                {priorityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Organization Financial Overview */}
        <div className="chart-card">
          <h3>Financial Overview by Organization</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={organizationData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(value) => [formatCurrency(value)]} />
              <Legend />
              <Bar dataKey="outstanding" fill="#ff6b35" name="Outstanding" />
              <Bar dataKey="recovered" fill="#4ecdc4" name="Recovered" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Organization Summary Cards */}
      <div className="org-summary-section">
        <h3>Organization Summary</h3>
        <div className="org-cards-grid">
          {organizationData.map((org, index) => (
            <div key={index} className="org-summary-card">
              <div className="org-header">
                <BarChart3 size={24} color="#9c27b0" />
                <h4>{org.name}</h4>
              </div>
              <div className="org-stats">
                <div className="org-stat">
                  <span className="stat-label">Cases</span>
                  <span className="stat-value">{org.cases}</span>
                </div>
                <div className="org-stat">
                  <span className="stat-label">Outstanding</span>
                  <span className="stat-value">{formatCurrency(org.outstanding)}</span>
                </div>
                <div className="org-stat">
                  <span className="stat-label">Recovered</span>
                  <span className="stat-value">{formatCurrency(org.recovered)}</span>
                </div>
                <div className="org-stat">
                  <span className="stat-label">Performance</span>
                  <span className="stat-value">{org.performance}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default FedExAdminDashboard;