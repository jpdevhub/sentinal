import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import {
  Users,
  AlertTriangle,
  CheckCircle,
  X,
  UserPlus,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Target,
  Clock,
  DollarSign
} from 'lucide-react';
import './CommandCenter.css';

const CASES_PER_PAGE = 50;

function CommandCenter() {
  const [loading, setLoading] = useState(true);
  const [unassignedCases, setUnassignedCases] = useState([]);
  const [selectedCases, setSelectedCases] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [agents, setAgents] = useState([]);
  const [profile, setProfile] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // Stats for header cards (fetched separately for accuracy)
  const [stats, setStats] = useState({
    totalUnassigned: 0,
    highPriority: 0,
    totalValue: 0,
    avgDaysOverdue: 0
  });

  // Fetch user profile to get organization_id
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

  // Fetch DCA Agents from database (profiles with role = DCA_AGENT in same organization)
  const fetchAgents = useCallback(async (userProfile) => {
    if (!userProfile) return;

    try {
      let query = supabase
        .from('profiles')
        .select('id, email, full_name, role, organization_id')
        .eq('role', 'DCA_AGENT');

      // Filter by organization if DCA_MANAGER
      if (userProfile.role === 'DCA_MANAGER' && userProfile.organization_id) {
        query = query.eq('organization_id', userProfile.organization_id);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get assignment counts for each agent
      const agentsWithCounts = await Promise.all((data || []).map(async (agent) => {
        const { count } = await supabase
          .from('agent_case_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('agent_id', agent.id);

        return {
          id: agent.id,
          name: agent.full_name || agent.email?.split('@')[0] || 'Unknown Agent',
          email: agent.email,
          level: 'AGENT', // Default level - can be enhanced with a level column
          status: 'ONLINE', // Default - can be enhanced with status tracking
          capacity: 100,
          currentLoad: count || 0,
          organization_id: agent.organization_id
        };
      }));

      setAgents(agentsWithCounts);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  }, []);

  // Fetch stats (total counts regardless of pagination)
  const fetchStats = useCallback(async (userProfile) => {
    try {
      let baseQuery = supabase
        .from('cases')
        .select('invoice_amount, priority_level, days_overdue')
        .is('assigned_agent_id', null)
        .in('case_status', ['OPEN', 'IN_PROGRESS']);

      if (userProfile && userProfile.role !== 'FEDEX_ADMIN' && userProfile.organization_id) {
        baseQuery = baseQuery.eq('dca_id', userProfile.organization_id);
      }

      const { data, error } = await baseQuery;

      if (error) throw error;

      const total = data?.length || 0;
      const highPriority = data?.filter(c => c.priority_level === 'HIGH').length || 0;
      const totalValue = data?.reduce((sum, c) => sum + (c.invoice_amount || 0), 0) || 0;
      const avgDays = total > 0 
        ? Math.round(data.reduce((sum, c) => sum + (c.days_overdue || 0), 0) / total)
        : 0;

      setStats({
        totalUnassigned: total,
        highPriority,
        totalValue,
        avgDaysOverdue: avgDays
      });
      
      setTotalPages(Math.ceil(total / CASES_PER_PAGE));
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  // Fetch unassigned cases for this DCA (with pagination)
  const fetchUnassignedCases = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const userProfile = profile || await fetchProfile();
      
      // Calculate offset
      const offset = (page - 1) * CASES_PER_PAGE;
      
      let query = supabase
        .from('cases')
        .select('case_id, customer_name, invoice_amount, priority_level, risk_score, days_overdue, case_status')
        .is('assigned_agent_id', null)
        .in('case_status', ['OPEN', 'IN_PROGRESS']);
      
      // Filter by organization if not FEDEX_ADMIN
      if (userProfile && userProfile.role !== 'FEDEX_ADMIN' && userProfile.organization_id) {
        query = query.eq('dca_id', userProfile.organization_id);
      }
      
      const { data, error } = await query
        .order('priority_level', { ascending: true })
        .order('days_overdue', { ascending: false })
        .range(offset, offset + CASES_PER_PAGE - 1);

      if (error) throw error;
      setUnassignedCases(data || []);
      setCurrentPage(page);
      
      // Also fetch agents and stats
      await fetchAgents(userProfile);
      await fetchStats(userProfile);
    } catch (error) {
      console.error('Error fetching cases:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchProfile, fetchAgents, fetchStats, profile]);

  useEffect(() => {
    const init = async () => {
      const userProfile = await fetchProfile();
      if (userProfile) {
        await fetchUnassignedCases(1);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setSelectedCases([]); // Clear selection when changing pages
      fetchUnassignedCases(newPage);
    }
  };

  // Filter cases based on search and priority (client-side for current page)
  const filteredCases = unassignedCases.filter(c => {
    const matchesSearch = c.case_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.customer_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = priorityFilter === 'ALL' || c.priority_level === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  // Handle case selection
  const handleSelectCase = (caseId) => {
    setSelectedCases(prev => 
      prev.includes(caseId) 
        ? prev.filter(id => id !== caseId)
        : [...prev, caseId]
    );
  };

  // Handle select all (current page only)
  const handleSelectAll = () => {
    if (selectedCases.length === filteredCases.length) {
      setSelectedCases([]);
    } else {
      setSelectedCases(filteredCases.map(c => c.case_id));
    }
  };

  // Open assign modal
  const handleOpenAssignModal = () => {
    if (selectedCases.length === 0) return;
    setShowAssignModal(true);
    setShowWarning(false);
    setSelectedAgent('');
  };

  // Handle agent selection in modal
  const handleAgentSelect = (agentId) => {
    setSelectedAgent(agentId);
    
    const agent = agents.find(a => a.id === agentId);
    const hasHighPriority = selectedCases.some(caseId => {
      const caseData = unassignedCases.find(c => c.case_id === caseId);
      return caseData?.priority_level === 'HIGH';
    });

    // Check if agent has high load (>80%)
    const agentLoad = agent ? (agent.currentLoad / agent.capacity) * 100 : 0;
    
    if (agentLoad > 80 && hasHighPriority) {
      setShowWarning(true);
      setWarningMessage(`⚠️ Risk Alert: ${agent.name} is at ${Math.round(agentLoad)}% capacity. Consider distributing HIGH priority cases to less loaded agents.`);
    } else if (hasHighPriority && agent?.currentLoad > 50) {
      setShowWarning(true);
      setWarningMessage(`⚠️ Workload Alert: You're assigning ${selectedCases.filter(caseId => {
        const c = unassignedCases.find(cs => cs.case_id === caseId);
        return c?.priority_level === 'HIGH';
      }).length} HIGH priority case(s) to ${agent.name} who already has ${agent.currentLoad} active cases.`);
    } else {
      setShowWarning(false);
      setWarningMessage('');
    }
  };

  // Confirm assignment - updates cases, agent_case_assignments, and case_actions
  const handleConfirmAssign = async () => {
    if (!selectedAgent || selectedCases.length === 0) return;

    setAssigning(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const agent = agents.find(a => a.id === selectedAgent);

      // 1. Update cases with assigned_agent_id
      const { error: updateError } = await supabase
        .from('cases')
        .update({ 
          assigned_agent_id: selectedAgent,
          case_status: 'IN_PROGRESS',
          assigned_date: new Date().toISOString()
        })
        .in('case_id', selectedCases);

      if (updateError) throw updateError;

      // 2. Insert into agent_case_assignments table
      const assignmentRecords = selectedCases.map(caseId => ({
        agent_id: selectedAgent,
        case_id: caseId,
        assigned_date: new Date().toISOString()
      }));

      const { error: assignError } = await supabase
        .from('agent_case_assignments')
        .insert(assignmentRecords);

      if (assignError) {
        console.error('Assignment insert error:', assignError);
        // Continue even if this fails (might be duplicate constraint)
      }

      // 3. Insert into case_actions table for audit trail
      const actionRecords = selectedCases.map(caseId => ({
        case_id: caseId,
        performed_by: user?.id,
        action_type: 'AGENT_ASSIGNMENT',
        note: `Case assigned to agent: ${agent?.name || selectedAgent}`,
        created_at: new Date().toISOString()
      }));

      const { error: actionError } = await supabase
        .from('case_actions')
        .insert(actionRecords);

      if (actionError) {
        console.error('Action log error:', actionError);
        // Continue even if this fails
      }

      // Success - refresh and close
      await fetchUnassignedCases(currentPage);
      setShowAssignModal(false);
      setSelectedCases([]);
      setSelectedAgent('');
      setShowWarning(false);
      
      // Show success message
      alert(`Successfully assigned ${selectedCases.length} case(s) to ${agent?.name}`);
    } catch (error) {
      console.error('Error assigning cases:', error);
      alert('Failed to assign cases. Please try again.');
    } finally {
      setAssigning(false);
    }
  };

  // Agent workload chart data
  const workloadData = agents.map(agent => ({
    name: agent.name.split(' ')[0],
    fullName: agent.name,
    load: Math.round((agent.currentLoad / agent.capacity) * 100),
    cases: agent.currentLoad,
    capacity: agent.capacity,
    level: agent.level,
    status: agent.status
  }));

  // Get bar color based on load percentage
  const getBarColor = (load) => {
    if (load >= 80) return '#ef4444';
    if (load >= 50) return '#f59e0b';
    return '#22c55e';
  };

  // Custom tooltip for workload chart
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="workload-tooltip">
          <p className="tooltip-name">{data.fullName}</p>
          <p className="tooltip-level">{data.level} • {data.status}</p>
          <p className="tooltip-load">{data.load}% Capacity Used</p>
          <p className="tooltip-cases">{data.cases} Active Cases</p>
        </div>
      );
    }
    return null;
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Get priority badge class
  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'HIGH': return 'priority-high';
      case 'MEDIUM': return 'priority-medium';
      case 'LOW': return 'priority-low';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="command-center-loading">
        <div className="loading-spinner"></div>
        <p>Loading Command Center...</p>
      </div>
    );
  }

  return (
    <div className="command-center">
      {/* Header Section */}
      <div className="command-header">
        <div className="header-content">
          <h1>Agent Command Center</h1>
          <p>Distribute cases to your agents efficiently</p>
        </div>
        <button className="refresh-btn" onClick={() => fetchUnassignedCases(currentPage)}>
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <Briefcase size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.totalUnassigned}</span>
            <span className="stat-label">Unassigned Cases</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">
            <AlertTriangle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.highPriority}</span>
            <span className="stat-label">High Priority</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <DollarSign size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{formatCurrency(stats.totalValue)}</span>
            <span className="stat-label">Total Value</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.avgDaysOverdue}</span>
            <span className="stat-label">Avg Days Overdue</span>
          </div>
        </div>
      </div>

      {/* Agent Workload Chart */}
      {agents.length > 0 && (
        <div className="workload-section">
          <div className="section-header">
            <div>
              <h2>Agent Workload Distribution</h2>
              <p className="section-subtitle">Current capacity utilization per agent ({agents.length} agent{agents.length !== 1 ? 's' : ''})</p>
            </div>
            <div className="workload-legend">
              <span className="legend-item"><span className="dot green"></span> &lt;50%</span>
              <span className="legend-item"><span className="dot orange"></span> 50-80%</span>
              <span className="legend-item"><span className="dot red"></span> &gt;80%</span>
            </div>
          </div>
          <div className="workload-chart">
            <ResponsiveContainer width="100%" height={Math.max(150, agents.length * 50)}>
              <BarChart data={workloadData} layout="vertical" margin={{ left: 20, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" horizontal={true} vertical={false} />
                <XAxis 
                  type="number" 
                  domain={[0, 100]} 
                  tickFormatter={(v) => `${v}%`}
                  stroke="#666"
                  fontSize={12}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  stroke="#666"
                  fontSize={12}
                  width={100}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="load" radius={[0, 6, 6, 0]} barSize={28}>
                  {workloadData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.load)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* No Agents Warning */}
      {agents.length === 0 && (
        <div className="no-agents-warning">
          <AlertTriangle size={24} />
          <div>
            <h3>No Agents Available</h3>
            <p>There are no DCA Agents in your organization. Please add agents to assign cases.</p>
          </div>
        </div>
      )}

      {/* Cases Grid Section */}
      <div className="cases-section">
        <div className="section-header">
          <div>
            <h2>Unassigned Cases</h2>
            <p className="section-subtitle">
              Page {currentPage} of {totalPages} • Showing {filteredCases.length} of {stats.totalUnassigned} total cases
            </p>
          </div>
          <div className="section-actions">
            <div className="search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search cases..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="filter-dropdown">
              <Filter size={16} />
              <select 
                value={priorityFilter} 
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="ALL">All Priorities</option>
                <option value="HIGH">High Priority</option>
                <option value="MEDIUM">Medium Priority</option>
                <option value="LOW">Low Priority</option>
              </select>
              <ChevronDown size={16} />
            </div>
            <button 
              className={`assign-btn ${selectedCases.length === 0 || agents.length === 0 ? 'disabled' : ''}`}
              onClick={handleOpenAssignModal}
              disabled={selectedCases.length === 0 || agents.length === 0}
            >
              <UserPlus size={18} />
              Assign ({selectedCases.length})
            </button>
          </div>
        </div>

        {/* Cases Table */}
        <div className="cases-table-container">
          <table className="cases-table">
            <thead>
              <tr>
                <th className="checkbox-col">
                  <input
                    type="checkbox"
                    checked={selectedCases.length === filteredCases.length && filteredCases.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                <th>Case ID</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Priority</th>
                <th>Risk Score</th>
                <th>Days Overdue</th>
              </tr>
            </thead>
            <tbody>
              {filteredCases.length === 0 ? (
                <tr className="empty-row">
                  <td colSpan="7">
                    <div className="empty-state">
                      <CheckCircle size={48} />
                      <h3>All Caught Up!</h3>
                      <p>No unassigned cases matching your criteria</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCases.map((caseItem) => (
                  <tr 
                    key={caseItem.case_id}
                    className={selectedCases.includes(caseItem.case_id) ? 'selected' : ''}
                    onClick={() => handleSelectCase(caseItem.case_id)}
                  >
                    <td className="checkbox-col">
                      <input
                        type="checkbox"
                        checked={selectedCases.includes(caseItem.case_id)}
                        onChange={() => handleSelectCase(caseItem.case_id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="case-id">{caseItem.case_id}</td>
                    <td className="customer-name">{caseItem.customer_name}</td>
                    <td className="amount">{formatCurrency(caseItem.invoice_amount)}</td>
                    <td>
                      <span className={`priority-badge ${getPriorityClass(caseItem.priority_level)}`}>
                        {caseItem.priority_level}
                      </span>
                    </td>
                    <td className="risk-score">
                      <div className="risk-indicator">
                        <div 
                          className="risk-bar" 
                          style={{ 
                            width: `${caseItem.risk_score}%`,
                            backgroundColor: caseItem.risk_score > 70 ? '#ef4444' : caseItem.risk_score > 40 ? '#f59e0b' : '#22c55e'
                          }}
                        ></div>
                        <span>{caseItem.risk_score?.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className={`days-overdue ${caseItem.days_overdue > 90 ? 'critical' : caseItem.days_overdue > 60 ? 'warning' : ''}`}>
                      {caseItem.days_overdue} days
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="table-footer">
          <span>{selectedCases.length} selected on this page</span>
          <div className="pagination">
            <button 
              className="pagination-btn"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
            >
              First
            </button>
            <button 
              className="pagination-btn"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={18} />
              Previous
            </button>
            <span className="pagination-info">
              Page {currentPage} of {totalPages}
            </span>
            <button 
              className="pagination-btn"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight size={18} />
            </button>
            <button 
              className="pagination-btn"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
            >
              Last
            </button>
          </div>
        </div>
      </div>

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="assign-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Assign Cases to Agent</h2>
              <button className="close-btn" onClick={() => setShowAssignModal(false)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="assign-summary">
                <Target size={20} />
                <span>Assigning <strong>{selectedCases.length}</strong> case(s)</span>
                <span className="total-value">
                  Total: {formatCurrency(selectedCases.reduce((sum, id) => {
                    const c = unassignedCases.find(cs => cs.case_id === id);
                    return sum + (c?.invoice_amount || 0);
                  }, 0))}
                </span>
              </div>

              {showWarning && (
                <div className="warning-alert">
                  <AlertTriangle size={20} />
                  <span>{warningMessage}</span>
                </div>
              )}

              <div className="agent-selection">
                <label>Select Agent ({agents.length} available)</label>
                <div className="agents-list">
                  {agents.length === 0 ? (
                    <div className="no-agents-message">
                      <Users size={32} />
                      <p>No agents available in your organization</p>
                    </div>
                  ) : (
                    agents.map(agent => (
                      <div 
                        key={agent.id}
                        className={`agent-option ${selectedAgent === agent.id ? 'selected' : ''}`}
                        onClick={() => handleAgentSelect(agent.id)}
                      >
                        <div className="agent-avatar">
                          {agent.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <div className="agent-info">
                          <span className="agent-name">{agent.name}</span>
                          <span className="agent-meta">
                            <span className="agent-email">{agent.email}</span>
                          </span>
                        </div>
                        <div className="agent-capacity">
                          <div className="capacity-bar">
                            <div 
                              className="capacity-fill"
                              style={{ 
                                width: `${Math.min((agent.currentLoad / agent.capacity) * 100, 100)}%`,
                                backgroundColor: getBarColor((agent.currentLoad / agent.capacity) * 100)
                              }}
                            ></div>
                          </div>
                          <span className="capacity-text">{agent.currentLoad} cases</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowAssignModal(false)}>
                Cancel
              </button>
              <button 
                className={`confirm-btn ${!selectedAgent ? 'disabled' : ''} ${showWarning ? 'warning' : ''}`}
                onClick={handleConfirmAssign}
                disabled={!selectedAgent || assigning}
              >
                {assigning ? 'Assigning...' : showWarning ? 'Assign Anyway' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CommandCenter;
