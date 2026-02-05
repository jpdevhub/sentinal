import { useState, useEffect } from 'react';
import { Search, Download, Filter, RefreshCw, Eye, Edit, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUserProfile } from '../contexts/UserProfileContext';
import './CasesView.css';

function CasesView() {
  // const { profile } = useUserProfile(); // Temporarily unused
  const [cases, setCases] = useState([]);
  const [filteredCases, setFilteredCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [totalCasesInDB, setTotalCasesInDB] = useState(0);
  const BATCH_SIZE = 1000;

  const loadCases = async (isInitial = true) => {
    try {
      if (isInitial) {
        setLoading(true);
        setCases([]);
      } else {
        setLoadingMore(true);
      }
      
      // Get total count (only on initial load)
      if (isInitial) {
        const { count, error: countError } = await supabase
          .from('cases')
          .select('*', { count: 'exact', head: true });
          
        if (!countError) {
          setTotalCasesInDB(count);
        }
      }

      // Calculate offset for pagination
      const offset = isInitial ? 0 : cases.length;

      // Load next batch
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + BATCH_SIZE - 1);

      if (error) {
        console.error('Error loading cases from Supabase:', error);
        if (isInitial) setCases([]);
      } else {
        if (isInitial) {
          setCases(data || []);
        } else {
          setCases(prev => [...prev, ...(data || [])]);
        }
      }
      
      if (isInitial) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    } catch (error) {
      console.error('Error loading cases:', error);
      setCases([]);
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...cases];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(c => 
        c.case_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.customer_id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus !== 'All') {
      filtered = filtered.filter(c => c.case_status === filterStatus);
    }

    // Priority filter
    if (filterPriority !== 'All') {
      filtered = filtered.filter(c => c.priority_level === filterPriority);
    }

    setFilteredCases(filtered);
    setCurrentPage(1);
  };

  useEffect(() => {
    loadCases(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cases, searchTerm, filterStatus, filterPriority]);

  // Auto-load more data when user reaches near the end
  useEffect(() => {
    const lastPage = Math.ceil(cases.length / itemsPerPage);
    const hasMoreToLoad = cases.length < totalCasesInDB;
    
    // If on last page and there's more data, load it
    if (currentPage >= lastPage && hasMoreToLoad && !loadingMore && !loading) {
      loadCases(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'High': return 'priority-high';
      case 'Medium': return 'priority-medium';
      case 'Low': return 'priority-low';
      default: return '';
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Closed': return 'status-closed';
      case 'Open': return 'status-open';
      case 'In Progress': return 'status-progress';
      case 'Escalated': return 'status-escalated';
      case 'Legal Action': return 'status-legal';
      case 'Promise to Pay': return 'status-promise';
      default: return '';
    }
  };

  const exportToCSV = () => {
    const headers = ['Case ID', 'Customer', 'Invoice Amount', 'Days Overdue', 'Status', 'Priority', 'DCA', 'Risk Score'];
    const csvData = filteredCases.map(c => [
      c.case_id,
      c.customer_name,
      c.invoice_amount,
      c.days_overdue,
      c.case_status,
      c.priority_level,
      c.dca_id,
      c.risk_score
    ]);

    const csv = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fedex_cases.csv';
    a.click();
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredCases.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCases.length / itemsPerPage);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner-large"></div>
        <p>Loading cases...</p>
      </div>
    );
  }

  return (
    <div className="cases-view">
      {/* Header Controls */}
      <div className="cases-header">
        <div className="cases-stats">
          <div className="stat-item">
            <span className="stat-label">Loaded Cases</span>
            <span className="stat-value">{cases.length}{totalCasesInDB > 0 ? ` / ${totalCasesInDB}` : ''}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Filtered Cases</span>
            <span className="stat-value">{filteredCases.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Value (Loaded)</span>
            <span className="stat-value">{formatCurrency(filteredCases.reduce((sum, c) => sum + (c.invoice_amount || 0), 0))}</span>
          </div>
        </div>

        <div className="cases-actions">
          <button className="btn-action" onClick={() => loadCases(true)}>
            <RefreshCw size={18} />
            Refresh
          </button>
          <button className="btn-action" onClick={exportToCSV}>
            <Download size={18} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="cases-filters">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search by Case ID, Customer Name, or Customer ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select 
          className="filter-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="All">All Status</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="PAID">Paid</option>
          <option value="DISPUTE">Dispute</option>
        </select>

        <select 
          className="filter-select"
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
        >
          <option value="All">All Priority</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      {/* Table */}
      <div className="cases-table-container">
        <table className="cases-table">
          <thead>
            <tr>
              <th>Case ID</th>
              <th>Customer</th>
              <th>Invoice Amount</th>
              <th>Days Overdue</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Risk Score</th>
              <th>DCA</th>
              <th>SLA Breaches</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map((caseItem) => (
              <tr key={caseItem.case_id}>
                <td className="case-id">{caseItem.case_id}</td>
                <td>
                  <div className="customer-cell">
                    <span className="customer-name">{caseItem.customer_name}</span>
                    <span className="customer-type">{caseItem.customer_type}</span>
                  </div>
                </td>
                <td className="amount">{formatCurrency(caseItem.invoice_amount)}</td>
                <td>{caseItem.days_overdue} days</td>
                <td>
                  <span className={`status-badge ${getStatusClass(caseItem.case_status)}`}>
                    {caseItem.case_status}
                  </span>
                </td>
                <td>
                  <span className={`priority-badge ${getPriorityClass(caseItem.priority_level)}`}>
                    {caseItem.priority_level}
                  </span>
                </td>
                <td>
                  <div className="risk-score">
                    <div className="risk-bar">
                      <div 
                        className="risk-fill"
                        style={{ 
                          width: `${caseItem.risk_score}%`,
                          background: caseItem.risk_score >= 75 ? '#ff6b6b' : 
                                     caseItem.risk_score >= 50 ? '#ffe66d' : '#4ecdc4'
                        }}
                      ></div>
                    </div>
                    <span>{caseItem.risk_score}</span>
                  </div>
                </td>
                <td>{caseItem.dca_id}</td>
                <td className="sla-breaches">
                  {caseItem.sla_breach_count > 0 && (
                    <span className="breach-badge">{caseItem.sla_breach_count}</span>
                  )}
                </td>
                <td>
                  <div className="action-buttons">
                    <button className="btn-icon" title="View Details">
                      <Eye size={16} />
                    </button>
                    <button className="btn-icon" title="Edit">
                      <Edit size={16} />
                    </button>
                    <button className="btn-icon btn-danger" title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="pagination">
        <button 
          className="pagination-btn"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(currentPage - 1)}
        >
          Previous
        </button>
        
        <div className="pagination-info">
          Page {currentPage} of {totalPages} 
          ({filteredCases.length} filtered / {cases.length} loaded{totalCasesInDB > 0 ? ` / ${totalCasesInDB} total` : ''})
          {loadingMore && <span style={{ color: '#4ecdc4', marginLeft: '10px' }}>Loading more...</span>}
        </div>
        
        <button 
          className="pagination-btn"
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage(currentPage + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default CasesView;
