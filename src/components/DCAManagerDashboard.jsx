import { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Users as UsersIcon,
  BarChart3,
  Activity,
  UserPlus,
  ClipboardList
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { supabase } from '../lib/supabase';
import { useUserProfile } from '../contexts/UserProfileContext';
import './DCAManagerDashboard.css';

function DCAManagerDashboard() {
  const { profile } = useUserProfile();
  const [metrics, setMetrics] = useState({
    totalCases: 0,
    totalOutstanding: 0,
    totalRecovered: 0,
    highPriorityCases: 0,
    activeCases: 0,
    recoveryRate: 0
  });
  const [statusData, setStatusData] = useState([]);
  const [priorityData, setPriorityData] = useState([]);
  const [recentCases, setRecentCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [availableAgents, setAvailableAgents] = useState([]);
  const [unassignedCases, setUnassignedCases] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedCases, setSelectedCases] = useState([]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch limited cases for this manager's organization (500 max for performance)
      const { data: cases, error: casesError } = await supabase
        .from('cases')
        .select('*')
        .eq('dca_id', profile.organization_id)
        .limit(500);

      if (casesError) throw casesError;

      // Calculate metrics safely
      const totalCases = cases?.length || 0;
      const totalOutstanding = cases?.reduce((sum, case_item) => sum + ((case_item?.invoice_amount || 0) - (case_item?.amount_recovered || 0)), 0) || 0;
      const totalRecovered = cases?.reduce((sum, case_item) => sum + (case_item?.amount_recovered || 0), 0) || 0;
      const highPriorityCases = cases?.filter(case_item => case_item?.priority_level === 'HIGH')?.length || 0;
      const activeCases = cases.filter(case_item => case_item.case_status === 'OPEN' || case_item.case_status === 'IN_PROGRESS').length;
      const paidCases = cases.filter(case_item => case_item.case_status === 'PAID').length;
      const recoveryRate = totalCases > 0 ? Math.round((paidCases / totalCases) * 100) : 0;

      setMetrics({
        totalCases,
        totalOutstanding,
        totalRecovered,
        highPriorityCases,
        activeCases,
        recoveryRate
      });

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

      // Recent cases (last 5)
      const recentCasesData = cases
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);
      
      setRecentCases(recentCasesData);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      if (profile) {
        await fetchDashboardData();
      }
    };
    loadData();
  }, [profile]);

  const getOrganizationDisplayName = (orgId) => {
    const orgNames = {
      'FEDEX_HQ': 'FedEx HQ',
      'DCA_8f3d1': 'DCA Alpha',
      'DCA_9a2b4': 'DCA Beta', 
      'DCA_7c1d2': 'DCA Gamma'
    };
    return orgNames[orgId] || orgId;
  };

  const fetchAvailableAgents = async () => {
    try {
      // Fetch DCA agents in the same organization
      const { data: agents, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'DCA_AGENT')
        .eq('organization_id', profile.organization_id);

      if (error) throw error;
      setAvailableAgents(agents || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const fetchUnassignedCases = async () => {
    try {
      // Fetch cases that are not yet assigned to any agent
      const { data: assignedCaseIds, error: assignmentError } = await supabase
        .from('agent_case_assignments')
        .select('case_id');

      if (assignmentError) throw assignmentError;

      const assignedIds = assignedCaseIds?.map(a => a.case_id) || [];

      const { data: unassigned, error: casesError } = await supabase
        .from('cases')
        .select('*')
        .eq('dca_id', profile.organization_id)
        .not('case_id', 'in', `(${assignedIds.length > 0 ? assignedIds.join(',') : 'null'})`)
        .limit(50); // Limit for performance

      if (casesError) throw casesError;
      setUnassignedCases(unassigned || []);
    } catch (error) {
      console.error('Error fetching unassigned cases:', error);
    }
  };

  const handleAssignCases = async () => {
    if (!selectedAgent || selectedCases.length === 0) {
      alert('Please select an agent and at least one case to assign.');
      return;
    }

    try {
      const assignments = selectedCases.map(caseId => ({
        agent_id: selectedAgent,
        case_id: caseId,
        assigned_date: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('agent_case_assignments')
        .insert(assignments);

      if (error) throw error;

      alert(`Successfully assigned ${selectedCases.length} cases to agent.`);
      setShowAssignmentModal(false);
      setSelectedAgent('');
      setSelectedCases([]);
      fetchUnassignedCases(); // Refresh the unassigned cases list
    } catch (error) {
      console.error('Error assigning cases:', error);
      alert('Error assigning cases. Please try again.');
    }
  };

  const openAssignmentModal = () => {
    setShowAssignmentModal(true);
    fetchAvailableAgents();
    fetchUnassignedCases();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status) => {
    const colors = {
      'OPEN': '#ffc658',
      'IN_PROGRESS': '#8884d8',
      'PAID': '#82ca9d',
      'DISPUTE': '#ff7c7c'
    };
    return colors[status] || '#999';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'HIGH': '#f44336',
      'MEDIUM': '#ff9800',
      'LOW': '#4caf50'
    };
    return colors[priority] || '#999';
  };

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c'];

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner-large"></div>
        <p>Loading DCA Manager Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dca-manager-dashboard">
      {/* Welcome Section */}
      <div className="manager-welcome">
        <div className="welcome-header">
          <div>
            <h2>DCA Manager Dashboard</h2>
            <p>Managing operations for {getOrganizationDisplayName(profile?.organization_id)}</p>
          </div>
          <button 
            className="assign-cases-btn"
            onClick={openAssignmentModal}
            style={{
              background: '#4caf50',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px'
            }}
          >
            <UserPlus size={16} />
            Assign Cases to Agents
          </button>
        </div>
      </div>

      {/* KPI Grid - Organization Specific */}
      <div className="kpi-grid">
        <div className="kpi-card manager-kpi">
          <div className="kpi-icon" style={{ background: 'rgba(255, 107, 53, 0.2)' }}>
            <DollarSign size={28} color="#ff6b35" />
          </div>
          <div className="kpi-content">
            <h3>Outstanding Amount</h3>
            <p className="kpi-value">{formatCurrency(metrics.totalOutstanding)}</p>
            <span className="kpi-label">{metrics.totalCases} Total Cases</span>
          </div>
        </div>

        <div className="kpi-card manager-kpi">
          <div className="kpi-icon" style={{ background: 'rgba(78, 205, 196, 0.2)' }}>
            <CheckCircle size={28} color="#4ecdc4" />
          </div>
          <div className="kpi-content">
            <h3>Recovered Amount</h3>
            <p className="kpi-value">{formatCurrency(metrics.totalRecovered)}</p>
            <span className="kpi-label">{metrics.recoveryRate}% Recovery Rate</span>
          </div>
        </div>

        <div className="kpi-card manager-kpi">
          <div className="kpi-icon" style={{ background: 'rgba(255, 193, 7, 0.2)' }}>
            <Activity size={28} color="#ffc107" />
          </div>
          <div className="kpi-content">
            <h3>Active Cases</h3>
            <p className="kpi-value">{metrics.activeCases}</p>
            <span className="kpi-label">In Progress</span>
          </div>
        </div>

        <div className="kpi-card manager-kpi">
          <div className="kpi-icon" style={{ background: 'rgba(244, 67, 54, 0.2)' }}>
            <AlertTriangle size={28} color="#f44336" />
          </div>
          <div className="kpi-content">
            <h3>High Priority</h3>
            <p className="kpi-value">{metrics.highPriorityCases}</p>
            <span className="kpi-label">Urgent Cases</span>
          </div>
        </div>
      </div>

      {/* Charts and Recent Cases Grid */}
      <div className="dashboard-grid">
        {/* Case Status Chart */}
        <div className="chart-card">
          <h3>Case Status Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
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
          <h3>Priority Levels</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={priorityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Cases */}
        <div className="recent-cases-card">
          <h3>Recent Cases</h3>
          <div className="cases-list">
            {recentCases.map((case_item) => (
              <div key={case_item.case_id} className="case-item">
                <div className="case-header">
                  <span className="case-id">{case_item.case_id}</span>
                  <span 
                    className="case-status"
                    style={{ 
                      backgroundColor: getStatusColor(case_item.case_status),
                      color: '#fff',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}
                  >
                    {case_item.case_status}
                  </span>
                </div>
                <div className="case-details">
                  <p className="customer-name">{case_item.customer_name}</p>
                  <div className="case-meta">
                    <span className="amount">{formatCurrency(case_item.invoice_amount)}</span>
                    <span 
                      className="priority"
                      style={{ 
                        color: getPriorityColor(case_item.priority_level),
                        fontWeight: '600'
                      }}
                    >
                      {case_item.priority_level}
                    </span>
                    <span className="date">{formatDate(case_item.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Summary */}
        <div className="performance-card">
          <h3>Organization Performance</h3>
          <div className="performance-stats">
            <div className="perf-stat">
              <BarChart3 size={20} color="#4ecdc4" />
              <div className="perf-details">
                <span className="perf-label">Recovery Rate</span>
                <span className="perf-value">{metrics.recoveryRate}%</span>
              </div>
            </div>
            <div className="perf-stat">
              <TrendingUp size={20} color="#8884d8" />
              <div className="perf-details">
                <span className="perf-label">Total Volume</span>
                <span className="perf-value">{formatCurrency(metrics.totalRecovered + metrics.totalOutstanding)}</span>
              </div>
            </div>
            <div className="perf-stat">
              <UsersIcon size={20} color="#ffc658" />
              <div className="perf-details">
                <span className="perf-label">Case Load</span>
                <span className="perf-value">{metrics.totalCases} cases</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Case Assignment Modal */}
      {showAssignmentModal && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="modal-content" style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            maxWidth: '800px',
            maxHeight: '80vh',
            overflow: 'auto',
            width: '90%'
          }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ClipboardList size={20} />
                Assign Cases to Agents
              </h3>
              <button 
                onClick={() => setShowAssignmentModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#666' }}
              >
                ×
              </button>
            </div>

            <div className="assignment-form">
              {/* Agent Selection */}
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Select Agent:</label>
                <select 
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Choose an agent...</option>
                  {availableAgents.map(agent => (
                    <option key={agent.id} value={agent.id}>
                      {agent.full_name} ({agent.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Cases Selection */}
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  Select Cases ({selectedCases.length} selected):
                </label>
                <div style={{ 
                  maxHeight: '300px', 
                  overflow: 'auto',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  padding: '10px'
                }}>
                  {unassignedCases.length === 0 ? (
                    <p style={{ color: '#666', fontStyle: 'italic' }}>No unassigned cases available</p>
                  ) : (
                    unassignedCases.map(caseItem => (
                      <div 
                        key={caseItem.case_id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px',
                          border: '1px solid #eee',
                          borderRadius: '4px',
                          margin: '4px 0',
                          backgroundColor: selectedCases.includes(caseItem.case_id) ? '#e3f2fd' : 'white'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedCases.includes(caseItem.case_id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCases([...selectedCases, caseItem.case_id]);
                            } else {
                              setSelectedCases(selectedCases.filter(id => id !== caseItem.case_id));
                            }
                          }}
                          style={{ marginRight: '10px' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                            Case #{caseItem.case_id} - {caseItem.customer_name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {formatCurrency(caseItem.invoice_amount)} | {caseItem.priority_level} Priority | {caseItem.case_status}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowAssignmentModal(false)}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #ddd',
                    backgroundColor: 'white',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignCases}
                  disabled={!selectedAgent || selectedCases.length === 0}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: selectedAgent && selectedCases.length > 0 ? '#4caf50' : '#ccc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: selectedAgent && selectedCases.length > 0 ? 'pointer' : 'not-allowed'
                  }}
                >
                  Assign {selectedCases.length} Cases
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DCAManagerDashboard;