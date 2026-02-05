import { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Activity,
  Users as UsersIcon
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { supabase } from '../lib/supabase';
import './AllocationDashboard.css';

function AllocationDashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [priorityData, setPriorityData] = useState([]);
  const [debtAgeingData, setDebtAgeingData] = useState([]);
  const [recoveryByAgency, setRecoveryByAgency] = useState([]);
  const [slaBreaches, setSlaBreaches] = useState([]);
  const [statusDistribution, setStatusDistribution] = useState([]);
  const [escalationReasons, setEscalationReasons] = useState([]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch ALL cases for comprehensive dashboard metrics
      const { data: cases, error } = await supabase
        .from('cases')
        .select('*');

      if (error) {
        console.error('Error loading cases:', error);
        setLoading(false);
        return;
      }

      // Calculate metrics from Supabase data
      const calculatedMetrics = calculateDashboardMetricsFromSupabase(cases);
      setMetrics(calculatedMetrics);
      
      setPriorityData(getPriorityDistributionFromSupabase(cases));
      setDebtAgeingData(getDebtAgeingDataFromSupabase(cases));
      setRecoveryByAgency(getRecoveryByAgencyFromSupabase(cases));
      setSlaBreaches(getSLABreachesByAgencyFromSupabase(cases));
      setStatusDistribution(getCaseStatusDistributionFromSupabase(cases));
      setEscalationReasons(getEscalationReasonsFromSupabase(cases));
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setLoading(false);
    }
  };

  // Supabase-based calculation functions
  const calculateDashboardMetricsFromSupabase = (cases) => {
    if (!cases || cases.length === 0) {
      return {
        totalOutstanding: 0,
        totalRecovered: 0,
        activeSLABreaches: 0,
        recoveryRate: 0,
        totalCases: 0,
        openCases: 0,
        closedCases: 0,
        averageRecoveryAmount: 0
      };
    }

    const totalOutstanding = cases.reduce((sum, row) => sum + (row.invoice_amount || 0), 0);
    const totalRecovered = cases.reduce((sum, row) => sum + (row.amount_recovered || 0), 0);
    const activeSLABreaches = cases.filter(row => 
      row.sla_breach_count > 0 && row.case_status !== 'PAID'
    ).length;
    const recoveryRate = totalOutstanding > 0 ? (totalRecovered / totalOutstanding) * 100 : 0;
    
    const totalCases = cases.length;
    const openCases = cases.filter(row => row.case_status === 'OPEN').length;
    const closedCases = cases.filter(row => row.case_status === 'PAID').length;
    const averageRecoveryAmount = closedCases > 0 ? totalRecovered / closedCases : 0;

    return {
      totalOutstanding,
      totalRecovered,
      activeSLABreaches,
      recoveryRate,
      totalCases,
      openCases,
      closedCases,
      averageRecoveryAmount
    };
  };

  const getPriorityDistributionFromSupabase = (cases) => {
    const distribution = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    cases.forEach(case_ => {
      if (distribution.hasOwnProperty(case_.priority_level)) {
        distribution[case_.priority_level]++;
      }
    });
    
    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  };

  const getDebtAgeingDataFromSupabase = (cases) => {
    const ageGroups = {
      '0-30 days': 0,
      '31-60 days': 0,
      '61-90 days': 0,
      '90+ days': 0
    };

    cases.forEach(case_ => {
      const days = case_.days_overdue || 0;
      if (days <= 30) ageGroups['0-30 days']++;
      else if (days <= 60) ageGroups['31-60 days']++;
      else if (days <= 90) ageGroups['61-90 days']++;
      else ageGroups['90+ days']++;
    });

    return Object.entries(ageGroups).map(([name, value]) => ({ name, value }));
  };

  const getRecoveryByAgencyFromSupabase = (cases) => {
    const agencies = {};
    cases.forEach(case_ => {
      if (!agencies[case_.dca_id]) {
        agencies[case_.dca_id] = { total: 0, recovered: 0 };
      }
      agencies[case_.dca_id].total += case_.invoice_amount || 0;
      agencies[case_.dca_id].recovered += case_.amount_recovered || 0;
    });

    return Object.entries(agencies).map(([name, data]) => ({
      name: name.replace('DCA_', 'DCA '),
      total: data.total,
      recovered: data.recovered,
      rate: data.total > 0 ? (data.recovered / data.total * 100) : 0
    }));
  };

  const getSLABreachesByAgencyFromSupabase = (cases) => {
    const agencies = {};
    cases.forEach(case_ => {
      if (!agencies[case_.dca_id]) {
        agencies[case_.dca_id] = { total: 0, breaches: 0 };
      }
      agencies[case_.dca_id].total++;
      if (case_.sla_breach_count > 0) {
        agencies[case_.dca_id].breaches++;
      }
    });

    return Object.entries(agencies).map(([name, data]) => ({
      name: name.replace('DCA_', 'DCA '),
      breaches: data.breaches,
      total: data.total,
      rate: data.total > 0 ? (data.breaches / data.total * 100) : 0
    }));
  };

  const getCaseStatusDistributionFromSupabase = (cases) => {
    const distribution = { OPEN: 0, IN_PROGRESS: 0, PAID: 0, DISPUTE: 0 };
    cases.forEach(case_ => {
      if (distribution.hasOwnProperty(case_.case_status)) {
        distribution[case_.case_status]++;
      }
    });
    
    return Object.entries(distribution).map(([name, value]) => ({ 
      name: name.replace('_', ' '), 
      value 
    }));
  };

  const getEscalationReasonsFromSupabase = (cases) => {
    const reasons = {};
    cases.forEach(case_ => {
      if (case_.escalation_flag && case_.escalation_reason) {
        reasons[case_.escalation_reason] = (reasons[case_.escalation_reason] || 0) + 1;
      }
    });

    return Object.entries(reasons).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5 reasons
  };

  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="allocation-dashboard">
      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(255, 107, 53, 0.2)' }}>
            <DollarSign size={28} color="#ff6b35" />
          </div>
          <div className="kpi-content">
            <h3>Total Outstanding</h3>
            <p className="kpi-value">{formatCurrency(metrics.totalOutstanding)}</p>
            <span className="kpi-label">{metrics.totalCases} Total Cases</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(78, 205, 196, 0.2)' }}>
            <TrendingUp size={28} color="#4ecdc4" />
          </div>
          <div className="kpi-content">
            <h3>Total Recovered</h3>
            <p className="kpi-value">{formatCurrency(metrics.totalRecovered)}</p>
            <span className="kpi-label">{formatPercent(metrics.recoveryRate)} Recovery Rate</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(255, 107, 107, 0.2)' }}>
            <AlertTriangle size={28} color="#ff6b6b" />
          </div>
          <div className="kpi-content">
            <h3>Active SLA Breaches</h3>
            <p className="kpi-value">{metrics.activeSLABreaches}</p>
            <span className="kpi-label">Require Immediate Action</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(156, 39, 176, 0.2)' }}>
            <CheckCircle size={28} color="#9c27b0" />
          </div>
          <div className="kpi-content">
            <h3>Closed Cases</h3>
            <p className="kpi-value">{metrics.closedCases}</p>
            <span className="kpi-label">{metrics.openCases} Still Open</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(255, 230, 109, 0.2)' }}>
            <Activity size={28} color="#ffe66d" />
          </div>
          <div className="kpi-content">
            <h3>Avg Recovery Amount</h3>
            <p className="kpi-value">{formatCurrency(metrics.averageRecoveryAmount)}</p>
            <span className="kpi-label">Per Recovered Case</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(149, 225, 211, 0.2)' }}>
            <UsersIcon size={28} color="#95e1d3" />
          </div>
          <div className="kpi-content">
            <h3>Active DCAs</h3>
            <p className="kpi-value">{recoveryByAgency.length}</p>
            <span className="kpi-label">Collection Agencies</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Row 1: 3 Charts */}
        <div className="chart-card">
          <h3>Portfolio Risk Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={priorityData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {priorityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Case Status Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={statusDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3d3d3d" />
              <XAxis dataKey="name" stroke="#999" />
              <YAxis stroke="#999" />
              <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #3d3d3d' }} />
              <Bar dataKey="value" fill="#9c27b0" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Escalation Reasons</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={escalationReasons.slice(0, 5)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#3d3d3d" />
              <XAxis type="number" stroke="#999" />
              <YAxis dataKey="name" type="category" stroke="#999" width={120} />
              <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #3d3d3d' }} />
              <Bar dataKey="value" fill="#ff6b6b" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Row 2: Wide Chart + Medium Chart */}
        <div className="chart-card chart-wide">
          <h3>Debt Ageing Analysis</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={debtAgeingData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3d3d3d" />
              <XAxis dataKey="name" stroke="#999" />
              <YAxis stroke="#999" tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`} />
              <Tooltip 
                contentStyle={{ background: '#1a1a1a', border: '1px solid #3d3d3d' }}
                formatter={(value) => formatCurrency(value)}
              />
              <Bar dataKey="value" fill="#ff6b35" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card chart-medium">
          <h3>Recovery Rate by Agency</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={recoveryByAgency.slice(0, 5)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3d3d3d" />
              <XAxis dataKey="name" stroke="#999" />
              <YAxis stroke="#999" tickFormatter={(value) => `${value.toFixed(0)}%`} />
              <Tooltip 
                contentStyle={{ background: '#1a1a1a', border: '1px solid #3d3d3d' }}
                formatter={(value) => formatPercent(value)}
              />
              <Bar dataKey="recoveryRate" fill="#4ecdc4" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Row 3: Two Medium Charts */}
        <div className="chart-card chart-medium">
          <h3>SLA Breaches by Agency</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={slaBreaches.slice(0, 6)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3d3d3d" />
              <XAxis dataKey="name" stroke="#999" />
              <YAxis stroke="#999" />
              <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #3d3d3d' }} />
              <Bar dataKey="breaches" fill="#ffe66d" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default AllocationDashboard;
