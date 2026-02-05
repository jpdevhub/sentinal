import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import {
  DollarSign,
  TrendingUp,
  Award,
  RefreshCw,
  Check,
  X,
  Upload,
  FileText,
  Calendar,
  CreditCard,
  Building,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter
} from 'lucide-react';
import './FinanceSettlements.css';

const ITEMS_PER_PAGE = 20;

function FinanceSettlements() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('create'); // 'create' or 'history'
  const [profile, setProfile] = useState(null);
  
  // KPI Data
  const [kpiData, setKpiData] = useState({
    floatingCash: 0,
    settledYTD: 0,
    myCommission: 0
  });
  
  // Unsettled payments data
  const [unsettledPayments, setUnsettledPayments] = useState([]);
  const [selectedPayments, setSelectedPayments] = useState([]);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [totalPayments, setTotalPayments] = useState(0);
  
  // Settlement form
  const [settlementForm, setSettlementForm] = useState({
    utrNumber: '',
    bankName: '',
    proofFile: null,
    proofFileName: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const fileInputRef = useRef(null);
  
  // Settlement history
  const [settlementHistory, setSettlementHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [totalHistory, setTotalHistory] = useState(0);
  
  // Search/Filter
  const [searchTerm, setSearchTerm] = useState('');

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

  // Fetch KPI data
  const fetchKPIData = useCallback(async (userProfile) => {
    if (!userProfile) return;

    try {
      // Get floating cash (unsettled payments)
      const { data: unsettled } = await supabase
        .from('case_payments')
        .select('payment_amount')
        .eq('dca_id', userProfile.organization_id)
        .eq('is_settled', false);

      const floatingCash = unsettled?.reduce((sum, p) => sum + (p.payment_amount || 0), 0) || 0;

      // Get settled YTD
      const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
      const { data: settled } = await supabase
        .from('settlement_batches')
        .select('total_amount, commission_amount')
        .eq('dca_id', userProfile.organization_id)
        .eq('status', 'VERIFIED')
        .gte('created_at', yearStart);

      const settledYTD = settled?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;
      const commission = settled?.reduce((sum, s) => sum + (s.commission_amount || 0), 0) || 0;

      setKpiData({
        floatingCash,
        settledYTD,
        myCommission: commission
      });
    } catch (error) {
      console.error('Error fetching KPI data:', error);
    }
  }, []);

  // Fetch unsettled payments
  const fetchUnsettledPayments = useCallback(async (userProfile, page = 1) => {
    if (!userProfile) return;

    try {
      const offset = (page - 1) * ITEMS_PER_PAGE;

      // Get count first
      const { count } = await supabase
        .from('case_payments')
        .select('*', { count: 'exact', head: true })
        .eq('dca_id', userProfile.organization_id)
        .eq('is_settled', false);

      setTotalPayments(count || 0);

      // Get paginated data with case details
      const { data, error } = await supabase
        .from('case_payments')
        .select(`
          id,
          case_id,
          payment_amount,
          payment_date,
          payment_method,
          reference_number,
          recorded_by,
          status,
          created_at
        `)
        .eq('dca_id', userProfile.organization_id)
        .eq('is_settled', false)
        .order('payment_date', { ascending: false })
        .range(offset, offset + ITEMS_PER_PAGE - 1);

      if (error) throw error;

      // Enrich with case and agent info
      const enrichedPayments = await Promise.all((data || []).map(async (payment) => {
        // Get case details
        const { data: caseData } = await supabase
          .from('cases')
          .select('customer_name')
          .eq('case_id', payment.case_id)
          .single();

        // Get agent name
        let agentName = 'Unknown';
        if (payment.recorded_by) {
          const { data: agentData } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', payment.recorded_by)
            .single();
          agentName = agentData?.full_name || agentData?.email?.split('@')[0] || 'Unknown';
        }

        return {
          ...payment,
          customer_name: caseData?.customer_name || 'Unknown',
          agent_name: agentName
        };
      }));

      setUnsettledPayments(enrichedPayments);
      setPaymentsPage(page);
    } catch (error) {
      console.error('Error fetching unsettled payments:', error);
    }
  }, []);

  // Fetch settlement history
  const fetchSettlementHistory = useCallback(async (userProfile, page = 1) => {
    if (!userProfile) return;

    try {
      const offset = (page - 1) * ITEMS_PER_PAGE;

      // Get count
      const { count } = await supabase
        .from('settlement_batches')
        .select('*', { count: 'exact', head: true })
        .eq('dca_id', userProfile.organization_id);

      setTotalHistory(count || 0);

      // Get data
      const { data, error } = await supabase
        .from('settlement_batches')
        .select('*')
        .eq('dca_id', userProfile.organization_id)
        .order('created_at', { ascending: false })
        .range(offset, offset + ITEMS_PER_PAGE - 1);

      if (error) throw error;
      setSettlementHistory(data || []);
      setHistoryPage(page);
    } catch (error) {
      console.error('Error fetching settlement history:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const userProfile = await fetchProfile();
      if (userProfile) {
        await Promise.all([
          fetchKPIData(userProfile),
          fetchUnsettledPayments(userProfile, 1),
          fetchSettlementHistory(userProfile, 1)
        ]);
      }
      setLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle payment selection
  const handleSelectPayment = (paymentId) => {
    setSelectedPayments(prev =>
      prev.includes(paymentId)
        ? prev.filter(id => id !== paymentId)
        : [...prev, paymentId]
    );
  };

  // Handle select all on current page
  const handleSelectAll = () => {
    const currentPageIds = filteredPayments.map(p => p.id);
    const allSelected = currentPageIds.every(id => selectedPayments.includes(id));
    
    if (allSelected) {
      setSelectedPayments(prev => prev.filter(id => !currentPageIds.includes(id)));
    } else {
      setSelectedPayments(prev => [...new Set([...prev, ...currentPageIds])]);
    }
  };

  // Calculate selected total
  const selectedTotal = selectedPayments.reduce((sum, id) => {
    const payment = unsettledPayments.find(p => p.id === id);
    return sum + (payment?.payment_amount || 0);
  }, 0);

  // Handle form change
  const handleFormChange = (field, value) => {
    setSettlementForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Submit settlement batch
  const handleSubmitSettlement = async () => {
    if (selectedPayments.length === 0) {
      alert('Please select at least one payment to settle');
      return;
    }

    if (!settlementForm.utrNumber.trim()) {
      alert('Please enter the UTR/Transaction number');
      return;
    }

    if (!settlementForm.bankName.trim()) {
      alert('Please enter the bank name');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Generate batch ID
      const batchId = `BATCH-${Date.now().toString(36).toUpperCase()}`;
      
      // Calculate commission (10%)
      const commissionAmount = selectedTotal * 0.10;

      // Upload proof file if provided
      let proofUrl = null;
      if (settlementForm.proofFile) {
        setUploadProgress('Uploading proof...');
        const fileExt = settlementForm.proofFile.name.split('.').pop();
        const fileName = `${batchId}-${Date.now()}.${fileExt}`;
        const filePath = `${profile.organization_id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('settlement-proofs')
          .upload(filePath, settlementForm.proofFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error('Failed to upload proof file: ' + uploadError.message);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('settlement-proofs')
          .getPublicUrl(filePath);
        
        proofUrl = urlData?.publicUrl;
        setUploadProgress(null);
      }

      // Create settlement batch
      const { data: batch, error: batchError } = await supabase
        .from('settlement_batches')
        .insert({
          batch_id: batchId,
          dca_id: profile.organization_id,
          created_by: user?.id,
          total_amount: selectedTotal,
          case_count: selectedPayments.length,
          commission_rate: 0.10,
          commission_amount: commissionAmount,
          utr_number: settlementForm.utrNumber,
          bank_name: settlementForm.bankName,
          proof_url: proofUrl,
          status: 'SUBMITTED',
          submitted_at: new Date().toISOString()
        })
        .select()
        .single();

      if (batchError) throw batchError;

      // Update payments to mark as settled
      const { error: updateError } = await supabase
        .from('case_payments')
        .update({
          is_settled: true,
          settlement_batch_id: batch.id,
          settled_at: new Date().toISOString(),
          status: 'BATCHED'
        })
        .in('id', selectedPayments);

      if (updateError) throw updateError;

      // Log action for each case
      const caseIds = unsettledPayments
        .filter(p => selectedPayments.includes(p.id))
        .map(p => p.case_id);

      const actionRecords = caseIds.map(caseId => ({
        case_id: caseId,
        performed_by: user?.id,
        action_type: 'SETTLEMENT_BATCHED',
        note: `Payment included in settlement batch ${batchId}`,
        created_at: new Date().toISOString()
      }));

      await supabase.from('case_actions').insert(actionRecords);

      // Refresh data
      await Promise.all([
        fetchKPIData(profile),
        fetchUnsettledPayments(profile, 1),
        fetchSettlementHistory(profile, 1)
      ]);

      // Reset form
      setSelectedPayments([]);
      setSettlementForm({ utrNumber: '', bankName: '', proofFile: null, proofFileName: '' });
      if (fileInputRef.current) fileInputRef.current.value = '';

      alert(`Settlement batch ${batchId} created successfully!\nTotal: $${selectedTotal.toLocaleString()}\nCommission: $${commissionAmount.toLocaleString()}`);
    } catch (error) {
      console.error('Error creating settlement:', error);
      alert('Failed to create settlement batch. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter payments by search
  const filteredPayments = unsettledPayments.filter(p =>
    p.case_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.agent_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.reference_number && p.reference_number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get status badge class
  const getStatusClass = (status) => {
    switch (status) {
      case 'VERIFIED': return 'status-verified';
      case 'SUBMITTED': return 'status-submitted';
      case 'PENDING': return 'status-pending';
      case 'REJECTED': return 'status-rejected';
      case 'APPROVED': return 'status-approved';
      case 'PAID': return 'status-paid';
      default: return 'status-pending';
    }
  };

  // Pagination helpers
  const totalPaymentPages = Math.ceil(totalPayments / ITEMS_PER_PAGE);
  const totalHistoryPages = Math.ceil(totalHistory / ITEMS_PER_PAGE);

  if (loading) {
    return (
      <div className="finance-loading">
        <div className="loading-spinner"></div>
        <p>Loading Finance & Settlements...</p>
      </div>
    );
  }

  return (
    <div className="finance-settlements">
      {/* Header */}
      <div className="finance-header">
        <div className="header-content">
          <h1>Finance & Settlements</h1>
          <p>Manage remittances and track commissions</p>
        </div>
        <button className="refresh-btn" onClick={async () => {
          setLoading(true);
          await Promise.all([
            fetchKPIData(profile),
            fetchUnsettledPayments(profile, paymentsPage),
            fetchSettlementHistory(profile, historyPage)
          ]);
          setLoading(false);
        }}>
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card floating">
          <div className="kpi-icon">
            <DollarSign size={28} />
          </div>
          <div className="kpi-content">
            <span className="kpi-value">{formatCurrency(kpiData.floatingCash)}</span>
            <span className="kpi-label">Floating Cash</span>
            <span className="kpi-subtitle">Unsettled funds from agents</span>
          </div>
        </div>
        <div className="kpi-card settled">
          <div className="kpi-icon">
            <TrendingUp size={28} />
          </div>
          <div className="kpi-content">
            <span className="kpi-value">{formatCurrency(kpiData.settledYTD)}</span>
            <span className="kpi-label">Settled YTD</span>
            <span className="kpi-subtitle">Successfully wired to FedEx</span>
          </div>
        </div>
        <div className="kpi-card commission">
          <div className="kpi-icon">
            <Award size={28} />
          </div>
          <div className="kpi-content">
            <span className="kpi-value">{formatCurrency(kpiData.myCommission)}</span>
            <span className="kpi-label">My Commission</span>
            <span className="kpi-subtitle">10% of verified settlements</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="finance-tabs">
        <button
          className={`tab-btn ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setActiveTab('create')}
        >
          <FileText size={18} />
          Create Remittance
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <Clock size={18} />
          Settlement History
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'create' && (
        <div className="create-remittance-section">
          <div className="remittance-layout">
            {/* Payments Grid */}
            <div className="payments-grid-section">
              <div className="section-header">
                <div>
                  <h2>Unsettled Payments</h2>
                  <p className="section-subtitle">
                    {totalPayments} payment(s) awaiting settlement • {selectedPayments.length} selected
                  </p>
                </div>
                <div className="search-box">
                  <Search size={18} />
                  <input
                    type="text"
                    placeholder="Search by case, customer, or agent..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="payments-table-container">
                <table className="payments-table">
                  <thead>
                    <tr>
                      <th className="checkbox-col">
                        <input
                          type="checkbox"
                          checked={filteredPayments.length > 0 && filteredPayments.every(p => selectedPayments.includes(p.id))}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th>Case ID</th>
                      <th>Customer</th>
                      <th>Agent</th>
                      <th>Payment Date</th>
                      <th>Amount</th>
                      <th>Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.length === 0 ? (
                      <tr className="empty-row">
                        <td colSpan="7">
                          <div className="empty-state">
                            <CheckCircle size={48} />
                            <h3>All Settled!</h3>
                            <p>No unsettled payments at this time</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredPayments.map((payment) => (
                        <tr
                          key={payment.id}
                          className={selectedPayments.includes(payment.id) ? 'selected' : ''}
                          onClick={() => handleSelectPayment(payment.id)}
                        >
                          <td className="checkbox-col">
                            <input
                              type="checkbox"
                              checked={selectedPayments.includes(payment.id)}
                              onChange={() => handleSelectPayment(payment.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td className="case-id">{payment.case_id}</td>
                          <td className="customer-name">{payment.customer_name}</td>
                          <td className="agent-name">{payment.agent_name}</td>
                          <td className="payment-date">{formatDate(payment.payment_date)}</td>
                          <td className="amount">{formatCurrency(payment.payment_amount)}</td>
                          <td className="reference">
                            <span className={`method-badge ${payment.payment_method?.toLowerCase()}`}>
                              {payment.payment_method}
                            </span>
                            <span className="ref-number">{payment.reference_number || '-'}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPaymentPages > 1 && (
                <div className="table-footer">
                  <span>Showing page {paymentsPage} of {totalPaymentPages}</span>
                  <div className="pagination">
                    <button
                      className="pagination-btn"
                      onClick={() => fetchUnsettledPayments(profile, paymentsPage - 1)}
                      disabled={paymentsPage === 1}
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span className="pagination-info">Page {paymentsPage}</span>
                    <button
                      className="pagination-btn"
                      onClick={() => fetchUnsettledPayments(profile, paymentsPage + 1)}
                      disabled={paymentsPage === totalPaymentPages}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Settlement Form Panel */}
            <div className="settlement-panel">
              <h3>Batch & Send to FedEx</h3>
              
              <div className="selected-summary">
                <div className="summary-row">
                  <span>Selected Payments:</span>
                  <strong>{selectedPayments.length}</strong>
                </div>
                <div className="summary-row total">
                  <span>Total Amount:</span>
                  <strong>{formatCurrency(selectedTotal)}</strong>
                </div>
                <div className="summary-row commission">
                  <span>Your Commission (10%):</span>
                  <strong>{formatCurrency(selectedTotal * 0.10)}</strong>
                </div>
              </div>

              <div className="form-group">
                <label>
                  <CreditCard size={16} />
                  UTR / Transaction Number
                </label>
                <input
                  type="text"
                  placeholder="e.g., HDFC-998877"
                  value={settlementForm.utrNumber}
                  onChange={(e) => handleFormChange('utrNumber', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>
                  <Building size={16} />
                  Bank Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., HDFC Bank"
                  value={settlementForm.bankName}
                  onChange={(e) => handleFormChange('bankName', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>
                  <Upload size={16} />
                  Proof Screenshot (Optional)
                </label>
                <div 
                  className={`file-upload-zone ${settlementForm.proofFile ? 'has-file' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        if (file.size > 5 * 1024 * 1024) {
                          alert('File size must be less than 5MB');
                          return;
                        }
                        setSettlementForm(prev => ({
                          ...prev,
                          proofFile: file,
                          proofFileName: file.name
                        }));
                      }
                    }}
                    style={{ display: 'none' }}
                  />
                  <div className="upload-content">
                    {settlementForm.proofFile ? (
                      <>
                        <FileText size={24} className="file-icon" />
                        <span className="file-name">{settlementForm.proofFileName}</span>
                        <button 
                          type="button" 
                          className="remove-file-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSettlementForm(prev => ({ ...prev, proofFile: null, proofFileName: '' }));
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <Upload size={24} className="upload-icon" />
                        <span className="upload-text">Click to upload image or PDF</span>
                        <span className="upload-hint">Max 5MB</span>
                      </>
                    )}
                  </div>
                </div>
                {uploadProgress && (
                  <div className="upload-progress">{uploadProgress}</div>
                )}
              </div>

              <button
                className={`submit-btn ${selectedPayments.length === 0 ? 'disabled' : ''}`}
                onClick={handleSubmitSettlement}
                disabled={selectedPayments.length === 0 || submitting}
              >
                {submitting ? (
                  <>Processing...</>
                ) : (
                  <>
                    <Check size={18} />
                    Submit Settlement Batch
                  </>
                )}
              </button>

              <p className="form-note">
                This will create a new remittance batch and mark selected payments as settled.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="settlement-history-section">
          <div className="section-header">
            <div>
              <h2>Settlement History</h2>
              <p className="section-subtitle">Track all your remittance batches</p>
            </div>
          </div>

          <div className="history-table-container">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Batch ID</th>
                  <th>Date</th>
                  <th>Cases</th>
                  <th>Amount</th>
                  <th>UTR</th>
                  <th>Bank</th>
                  <th>FedEx Status</th>
                  <th>Commission</th>
                </tr>
              </thead>
              <tbody>
                {settlementHistory.length === 0 ? (
                  <tr className="empty-row">
                    <td colSpan="8">
                      <div className="empty-state">
                        <FileText size={48} />
                        <h3>No Settlements Yet</h3>
                        <p>Create your first settlement batch to see it here</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  settlementHistory.map((batch) => (
                    <tr key={batch.id}>
                      <td className="batch-id">{batch.batch_id}</td>
                      <td className="date">{formatDate(batch.submitted_at || batch.created_at)}</td>
                      <td className="cases">{batch.case_count}</td>
                      <td className="amount">{formatCurrency(batch.total_amount)}</td>
                      <td className="utr">{batch.utr_number || '-'}</td>
                      <td className="bank">{batch.bank_name || '-'}</td>
                      <td>
                        <span className={`status-badge ${getStatusClass(batch.status)}`}>
                          {batch.status === 'VERIFIED' && <CheckCircle size={14} />}
                          {batch.status === 'PENDING' && <Clock size={14} />}
                          {batch.status === 'SUBMITTED' && <Clock size={14} />}
                          {batch.status === 'REJECTED' && <AlertCircle size={14} />}
                          {batch.status}
                        </span>
                      </td>
                      <td>
                        <div className="commission-cell">
                          <span className="commission-amount">{formatCurrency(batch.commission_amount)}</span>
                          <span className={`commission-status ${getStatusClass(batch.commission_status)}`}>
                            {batch.commission_status}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalHistoryPages > 1 && (
            <div className="table-footer">
              <span>Showing page {historyPage} of {totalHistoryPages}</span>
              <div className="pagination">
                <button
                  className="pagination-btn"
                  onClick={() => fetchSettlementHistory(profile, historyPage - 1)}
                  disabled={historyPage === 1}
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="pagination-info">Page {historyPage}</span>
                <button
                  className="pagination-btn"
                  onClick={() => fetchSettlementHistory(profile, historyPage + 1)}
                  disabled={historyPage === totalHistoryPages}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FinanceSettlements;
