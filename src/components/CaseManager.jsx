import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Search, 
  Download, 
  RefreshCw, 
  Eye, 
  UserPlus,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Building2,
  AlertCircle,
  Zap,
  List,
  Grid3X3,
  Plus,
  Upload,
  FileText,
  Save,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import './CaseManager.css';

function CaseManager() {
  // State for cases data
  const [cases, setCases] = useState([]);
  const [filteredCases, setFilteredCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [agencies, setAgencies] = useState([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCases, setTotalCases] = useState(0);
  const ITEMS_PER_PAGE = 50;
  
  // Filter state
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  
  // Assignment modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [selectedCases, setSelectedCases] = useState([]);
  const [assigningDCA, setAssigningDCA] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  
  // Add Case modal state
  const [showAddCaseModal, setShowAddCaseModal] = useState(false);
  const [addCaseMode, setAddCaseMode] = useState('form'); // 'form' or 'csv'
  const [addCaseLoading, setAddCaseLoading] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvPreview, setCsvPreview] = useState([]);
  const fileInputRef = useRef(null);
  
  // New case form state
  const [newCaseForm, setNewCaseForm] = useState({
    customer_name: '',
    customer_id: '',
    customer_type: 'Commercial',
    invoice_amount: '',
    days_overdue: '',
    credit_score: '',
    dispute_history: '0',
    priority_level: 'MEDIUM',
    case_status: 'OPEN',
    escalation_reason: ''
  });
  
  // Category counts
  const [categoryCounts, setCategoryCounts] = useState({
    all: 0,
    unassigned: 0,
    slaBreach: 0,
    highPriority: 0
  });

  // Get display name for DCA
  const getDCADisplayName = (dcaId) => {
    const names = {
      'DCA_A': 'DCA Alpha',
      'DCA_B': 'DCA Beta',
      'DCA_C': 'DCA Gamma',
      'DCA_D': 'DCA Delta',
      'FEDEX_HQ': 'FedEx Headquarters',
      'DCA_8f3d1': 'DCA Epsilon',
      'DCA_9a2b4': 'DCA Zeta',
      'DCA_7c1d2': 'DCA Eta'
    };
    return names[dcaId] || dcaId;
  };

  // Load DCAs/Agencies for assignment
  const loadAgencies = useCallback(async () => {
    try {
      // Get all unique DCAs from cases
      const { data: casesData } = await supabase
        .from('cases')
        .select('dca_id');
      
      // Get unique DCAs from cases (excluding FEDEX and null)
      const dcasFromCases = [...new Set(casesData?.map(c => c.dca_id).filter(dca => 
        dca && !dca.includes('FEDEX') && dca !== 'UNASSIGNED' && dca !== 'null'
      ))];
      
      // Predefined list of all known DCAs
      const knownDCAs = [
        'DCA_A', 'DCA_B', 'DCA_C', 'DCA_D',
        'DCA_8f3d1', 'DCA_9a2b4', 'DCA_7c1d2'
      ];
      
      // Merge both lists and remove duplicates
      const allDCAs = [...new Set([...knownDCAs, ...dcasFromCases])];
      
      setAgencies(allDCAs.map(dca => ({
        id: dca,
        name: getDCADisplayName(dca)
      })));
    } catch (error) {
      console.error('Error loading agencies:', error);
    }
  }, []);

  // Build query based on active category
  const buildCategoryFilter = useCallback(() => {
    let query = supabase.from('cases').select('*', { count: 'exact' });
    
    switch (activeCategory) {
      case 'unassigned':
        // Cases assigned to FedEx HQ or unassigned - pending DCA allocation
        query = query.or('dca_id.is.null,dca_id.eq.FEDEX_HQ,dca_id.eq.UNASSIGNED,dca_id.ilike.%FEDEX%');
        break;
      case 'slaBreach':
        // Cases with SLA breaches
        query = query.gt('sla_breach_count', 0);
        break;
      case 'highPriority':
        // High priority cases
        query = query.eq('priority_level', 'HIGH');
        break;
      default:
        // All cases - no additional filter
        break;
    }
    
    return query;
  }, [activeCategory]);

  // Load cases with pagination
  const loadCases = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      
      const offset = (page - 1) * ITEMS_PER_PAGE;
      
      let query = buildCategoryFilter();
      
      // Apply additional filters
      if (filterStatus !== 'All') {
        query = query.eq('case_status', filterStatus);
      }
      if (filterPriority !== 'All') {
        query = query.eq('priority_level', filterPriority);
      }
      
      // Order and paginate
      query = query
        .order('invoice_amount', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + ITEMS_PER_PAGE - 1);
      
      const { data, error, count } = await query;
      
      if (error) {
        console.error('Error loading cases:', error);
        setCases([]);
        setTotalCases(0);
      } else {
        setCases(data || []);
        setTotalCases(count || 0);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading cases:', error);
      setCases([]);
      setLoading(false);
    }
  }, [buildCategoryFilter, filterStatus, filterPriority]);

  // Load category counts
  const loadCategoryCounts = useCallback(async () => {
    try {
      // Get all count
      const { count: allCount } = await supabase
        .from('cases')
        .select('*', { count: 'exact', head: true });
      
      // Get pending allocation count (FedEx HQ / unassigned cases)
      const { count: unassignedCount } = await supabase
        .from('cases')
        .select('*', { count: 'exact', head: true })
        .or('dca_id.is.null,dca_id.eq.FEDEX_HQ,dca_id.eq.UNASSIGNED,dca_id.ilike.%FEDEX%');
      
      // Get SLA breach count
      const { count: slaCount } = await supabase
        .from('cases')
        .select('*', { count: 'exact', head: true })
        .gt('sla_breach_count', 0);
      
      // Get high priority count
      const { count: highCount } = await supabase
        .from('cases')
        .select('*', { count: 'exact', head: true })
        .eq('priority_level', 'HIGH');
      
      setCategoryCounts({
        all: allCount || 0,
        unassigned: unassignedCount || 0,
        slaBreach: slaCount || 0,
        highPriority: highCount || 0
      });
    } catch (error) {
      console.error('Error loading category counts:', error);
    }
  }, []);

  // Apply search filter locally
  useEffect(() => {
    if (!searchTerm) {
      setFilteredCases(cases);
    } else {
      const filtered = cases.filter(c =>
        c.case_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.customer_id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCases(filtered);
    }
  }, [cases, searchTerm]);

  // Initial load
  useEffect(() => {
    loadAgencies();
    loadCategoryCounts();
  }, [loadAgencies, loadCategoryCounts]);

  // Load cases when category or filters change
  useEffect(() => {
    setCurrentPage(1);
    loadCases(1);
  }, [activeCategory, filterStatus, filterPriority, loadCases]);

  // Load cases when page changes
  useEffect(() => {
    loadCases(currentPage);
  }, [currentPage, loadCases]);

  // Handle page change
  const handlePageChange = (newPage) => {
    const totalPages = Math.ceil(totalCases / ITEMS_PER_PAGE);
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      setSelectedCases([]);
      setBulkMode(false);
    }
  };

  // Handle single case assignment
  const handleAssignCase = (caseItem) => {
    setSelectedCase(caseItem);
    setSelectedCases([caseItem.case_id]);
    setBulkMode(false);
    setShowAssignModal(true);
  };

  // Handle bulk selection
  const handleSelectCase = (caseId) => {
    setSelectedCases(prev => {
      if (prev.includes(caseId)) {
        return prev.filter(id => id !== caseId);
      } else {
        return [...prev, caseId];
      }
    });
  };

  // Handle select all on current page
  const handleSelectAll = () => {
    if (selectedCases.length === filteredCases.length) {
      setSelectedCases([]);
    } else {
      setSelectedCases(filteredCases.map(c => c.case_id));
    }
  };

  // Open bulk assignment modal
  const handleBulkAssign = () => {
    if (selectedCases.length === 0) return;
    setBulkMode(true);
    setShowAssignModal(true);
  };

  // Confirm assignment to DCA
  const confirmAssignment = async () => {
    if (!assigningDCA || selectedCases.length === 0) return;
    
    try {
      setAssignLoading(true);
      
      // Get current DCA assignments for selected cases to track previous assignments
      const { data: currentCases, error: fetchError } = await supabase
        .from('cases')
        .select('case_id, dca_id, invoice_amount')
        .in('case_id', selectedCases);
      
      if (fetchError) {
        console.error('Error fetching current cases:', fetchError);
        alert('Failed to fetch case data. Please try again.');
        setAssignLoading(false);
        return;
      }
      
      console.log('Current cases to reassign:', currentCases);
      console.log('Target DCA:', assigningDCA);
      
      // Update each case individually to properly track previous DCA
      let successCount = 0;
      let errorCount = 0;
      const actionLogs = [];
      
      for (const caseItem of currentCases) {
        const previousDCA = caseItem.dca_id;
        
        // Skip if already assigned to the same DCA
        if (previousDCA === assigningDCA) {
          console.log(`Case ${caseItem.case_id} already assigned to ${assigningDCA}, skipping`);
          successCount++;
          continue;
        }
        
        // Determine if this is a new assignment or reassignment
        const isReassignment = previousDCA && previousDCA !== 'FEDEX_HQ' && !previousDCA.includes('FEDEX') && previousDCA !== 'UNASSIGNED';
        
        console.log(`Updating case ${caseItem.case_id}: ${previousDCA || 'unassigned'} -> ${assigningDCA}`);
        
        // Update the case in database
        const updateData = { 
          dca_id: assigningDCA,
          assigned_date: new Date().toISOString()
        };
        
        // Only set previous_dca_id and reassigned_at if it's a reassignment
        if (isReassignment) {
          updateData.previous_dca_id = previousDCA;
          updateData.reassigned_at = new Date().toISOString();
        }
        
        const { data: updateResult, error: updateError } = await supabase
          .from('cases')
          .update(updateData)
          .eq('case_id', caseItem.case_id)
          .select();
        
        if (updateError) {
          console.error(`Error updating case ${caseItem.case_id}:`, updateError);
          errorCount++;
        } else {
          console.log(`Successfully updated case ${caseItem.case_id}:`, updateResult);
          successCount++;
          
          // Prepare action log entry
          const actionNote = isReassignment 
            ? `Case reassigned from ${getDCADisplayName(previousDCA)} to ${getDCADisplayName(assigningDCA)}`
            : `Case assigned to ${getDCADisplayName(assigningDCA)} for debt collection`;
          
          actionLogs.push({
            case_id: caseItem.case_id,
            action_type: isReassignment ? 'DCA_REASSIGNED' : 'DCA_ASSIGNED',
            note: actionNote,
            created_at: new Date().toISOString()
          });
        }
      }
      
      // Insert action logs to case_actions table
      if (actionLogs.length > 0) {
        const { error: actionError } = await supabase
          .from('case_actions')
          .insert(actionLogs);
        
        if (actionError) {
          console.error('Error logging case actions:', actionError);
        } else {
          console.log(`Logged ${actionLogs.length} case actions successfully`);
        }
      }
      
      if (errorCount > 0) {
        alert(`Assigned ${successCount} case(s) successfully. ${errorCount} case(s) failed.`);
      } else {
        alert(`Successfully assigned ${successCount} case(s) to ${getDCADisplayName(assigningDCA)}`);
      }
      
      // Refresh data to reflect changes
      await loadCases(currentPage);
      await loadCategoryCounts();
      
      // Reset state
      setShowAssignModal(false);
      setSelectedCase(null);
      setSelectedCases([]);
      setAssigningDCA('');
      setBulkMode(false);
      setAssignLoading(false);
      
    } catch (error) {
      console.error('Error assigning cases:', error);
      setAssignLoading(false);
      alert('An error occurred. Please try again.');
    }
  };

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Case ID', 'Customer', 'Invoice Amount', 'Days Overdue', 'Status', 'Priority', 'DCA', 'Risk Score', 'SLA Breaches'];
    const csvData = filteredCases.map(c => [
      c.case_id,
      c.customer_name,
      c.invoice_amount,
      c.days_overdue,
      c.case_status,
      c.priority_level,
      c.dca_id || 'Unassigned',
      c.risk_score,
      c.sla_breach_count
    ]);

    const csv = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fedex_cases_${activeCategory}_page${currentPage}.csv`;
    a.click();
  };

  // Generate next case ID
  const generateNextCaseId = async () => {
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('case_id')
        .like('case_id', 'CASE_%')
        .order('case_id', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      
      // Find the maximum case number
      let maxNum = 20000; // Default starting point
      data?.forEach(c => {
        const match = c.case_id.match(/CASE_(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      });
      
      return `CASE_${maxNum + 1}`;
    } catch (error) {
      console.error('Error generating case ID:', error);
      // Fallback to timestamp-based ID
      return `CASE_${Date.now()}`;
    }
  };

  // Calculate risk score based on inputs
  const calculateRiskScore = (invoiceAmount, daysOverdue, creditScore, disputeHistory) => {
    let risk = 0;
    
    // Amount factor (30%)
    if (invoiceAmount > 100000) risk += 30;
    else if (invoiceAmount > 50000) risk += 20;
    else if (invoiceAmount > 10000) risk += 10;
    else risk += 5;
    
    // Days overdue factor (35%)
    if (daysOverdue > 180) risk += 35;
    else if (daysOverdue > 90) risk += 25;
    else if (daysOverdue > 60) risk += 15;
    else if (daysOverdue > 30) risk += 8;
    else risk += 3;
    
    // Credit score factor (20%)
    if (creditScore < 500) risk += 20;
    else if (creditScore < 600) risk += 15;
    else if (creditScore < 700) risk += 10;
    else risk += 5;
    
    // Dispute history factor (15%)
    if (disputeHistory > 3) risk += 15;
    else if (disputeHistory > 1) risk += 10;
    else if (disputeHistory > 0) risk += 5;
    
    return Math.min(100, Math.max(0, risk));
  };

  // Handle form input change
  const handleFormChange = (field, value) => {
    setNewCaseForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Reset form
  const resetForm = () => {
    setNewCaseForm({
      customer_name: '',
      customer_id: '',
      customer_type: 'Commercial',
      invoice_amount: '',
      days_overdue: '',
      credit_score: '',
      dispute_history: '0',
      priority_level: 'MEDIUM',
      case_status: 'OPEN',
      escalation_reason: ''
    });
    setCsvFile(null);
    setCsvPreview([]);
  };

  // Submit new case from form
  const handleAddCase = async () => {
    // Validate required fields
    if (!newCaseForm.customer_name || !newCaseForm.invoice_amount || !newCaseForm.days_overdue) {
      alert('Please fill in all required fields: Customer Name, Invoice Amount, and Days Overdue');
      return;
    }

    try {
      setAddCaseLoading(true);
      
      const caseId = await generateNextCaseId();
      const invoiceAmount = parseFloat(newCaseForm.invoice_amount);
      const daysOverdue = parseInt(newCaseForm.days_overdue, 10);
      const creditScore = parseInt(newCaseForm.credit_score, 10) || 650;
      const disputeHistory = parseInt(newCaseForm.dispute_history, 10) || 0;
      
      const riskScore = calculateRiskScore(invoiceAmount, daysOverdue, creditScore, disputeHistory);
      
      // Determine priority based on risk and amount
      let priority = newCaseForm.priority_level;
      if (riskScore >= 70 || invoiceAmount > 100000) priority = 'HIGH';
      else if (riskScore >= 40 || invoiceAmount > 50000) priority = 'MEDIUM';
      
      const newCase = {
        case_id: caseId,
        customer_name: newCaseForm.customer_name.trim(),
        customer_id: newCaseForm.customer_id.trim() || `CUST_${Date.now()}`,
        customer_type: newCaseForm.customer_type,
        invoice_amount: invoiceAmount,
        amount_recovered: 0,
        days_overdue: daysOverdue,
        credit_score: creditScore,
        dispute_history: disputeHistory,
        risk_score: riskScore,
        priority_level: priority,
        case_status: newCaseForm.case_status,
        dca_id: 'FEDEX_HQ', // New cases go to FedEx HQ (unassigned)
        dca_performance_score: null,
        assigned_date: null,
        case_created_date: new Date().toISOString().split('T')[0],
        sla_breach_count: 0,
        escalation_flag: newCaseForm.escalation_reason ? true : false,
        escalation_reason: newCaseForm.escalation_reason || null,
        action_count: 0,
        recovered: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('cases')
        .insert([newCase])
        .select();

      if (error) {
        console.error('Error adding case:', error);
        alert(`Failed to add case: ${error.message}`);
      } else {
        console.log('Case added successfully:', data);
        
        // Log to case_actions
        await supabase.from('case_actions').insert([{
          case_id: caseId,
          action_type: 'CASE_CREATED',
          note: `New case created with invoice amount $${invoiceAmount.toLocaleString()}. Risk Score: ${riskScore}. Priority: ${priority}`,
          created_at: new Date().toISOString()
        }]);
        
        alert(`Case ${caseId} created successfully!`);
        resetForm();
        setShowAddCaseModal(false);
        
        // Refresh to show new case
        await loadCases(1);
        await loadCategoryCounts();
        setCurrentPage(1);
        setActiveCategory('unassigned'); // Switch to unassigned to see new case
      }
      
      setAddCaseLoading(false);
    } catch (error) {
      console.error('Error adding case:', error);
      setAddCaseLoading(false);
      alert('An error occurred while adding the case. Please try again.');
    }
  };

  // Handle CSV file selection
  const handleCsvFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }
    
    setCsvFile(file);
    
    // Preview CSV content
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
      
      const preview = lines.slice(1, 6).map((line, idx) => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const row = {};
        headers.forEach((h, i) => {
          row[h] = values[i] || '';
        });
        return { ...row, _rowNum: idx + 2 };
      });
      
      setCsvPreview(preview);
    };
    reader.readAsText(file);
  };

  // Upload CSV cases
  const handleCsvUpload = async () => {
    if (!csvFile) {
      alert('Please select a CSV file first');
      return;
    }

    try {
      setAddCaseLoading(true);
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
        
        // Map CSV headers to database columns
        const headerMap = {
          'customer_name': 'customer_name',
          'customername': 'customer_name',
          'customer': 'customer_name',
          'name': 'customer_name',
          'customer_id': 'customer_id',
          'customerid': 'customer_id',
          'invoice_amount': 'invoice_amount',
          'invoiceamount': 'invoice_amount',
          'amount': 'invoice_amount',
          'invoice': 'invoice_amount',
          'days_overdue': 'days_overdue',
          'daysoverdue': 'days_overdue',
          'overdue': 'days_overdue',
          'days': 'days_overdue',
          'credit_score': 'credit_score',
          'creditscore': 'credit_score',
          'credit': 'credit_score',
          'customer_type': 'customer_type',
          'customertype': 'customer_type',
          'type': 'customer_type',
          'priority': 'priority_level',
          'priority_level': 'priority_level',
          'status': 'case_status',
          'case_status': 'case_status',
          'dispute_history': 'dispute_history',
          'disputes': 'dispute_history'
        };
        
        const casesToInsert = [];
        const errors = [];
        
        // Get starting case ID
        let nextCaseNum = 20000;
        const { data: maxCase } = await supabase
          .from('cases')
          .select('case_id')
          .like('case_id', 'CASE_%')
          .order('case_id', { ascending: false })
          .limit(100);
        
        maxCase?.forEach(c => {
          const match = c.case_id.match(/CASE_(\d+)/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > nextCaseNum) nextCaseNum = num;
          }
        });
        
        // Process each row
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          const row = {};
          headers.forEach((h, idx) => {
            const dbField = headerMap[h] || h;
            row[dbField] = values[idx] || '';
          });
          
          // Validate required fields
          if (!row.customer_name && !row.invoice_amount) {
            errors.push(`Row ${i + 1}: Missing customer_name and invoice_amount`);
            continue;
          }
          
          nextCaseNum++;
          const invoiceAmount = parseFloat(row.invoice_amount) || 0;
          const daysOverdue = parseInt(row.days_overdue, 10) || 0;
          const creditScore = parseInt(row.credit_score, 10) || 650;
          const disputeHistory = parseInt(row.dispute_history, 10) || 0;
          
          const riskScore = calculateRiskScore(invoiceAmount, daysOverdue, creditScore, disputeHistory);
          
          let priority = row.priority_level?.toUpperCase() || 'MEDIUM';
          if (!['HIGH', 'MEDIUM', 'LOW'].includes(priority)) {
            if (riskScore >= 70) priority = 'HIGH';
            else if (riskScore >= 40) priority = 'MEDIUM';
            else priority = 'LOW';
          }
          
          let status = row.case_status?.toUpperCase() || 'OPEN';
          if (!['OPEN', 'IN_PROGRESS', 'PAID', 'DISPUTE'].includes(status)) {
            status = 'OPEN';
          }
          
          casesToInsert.push({
            case_id: `CASE_${nextCaseNum}`,
            customer_name: row.customer_name || `Customer ${nextCaseNum}`,
            customer_id: row.customer_id || `CUST_${nextCaseNum}`,
            customer_type: row.customer_type || 'Commercial',
            invoice_amount: invoiceAmount,
            amount_recovered: 0,
            days_overdue: daysOverdue,
            credit_score: creditScore,
            dispute_history: disputeHistory,
            risk_score: riskScore,
            priority_level: priority,
            case_status: status,
            dca_id: 'FEDEX_HQ',
            dca_performance_score: null,
            assigned_date: null,
            case_created_date: new Date().toISOString().split('T')[0],
            sla_breach_count: 0,
            escalation_flag: false,
            action_count: 0,
            recovered: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
        
        if (casesToInsert.length === 0) {
          alert('No valid cases found in the CSV file. Please check the format.');
          setAddCaseLoading(false);
          return;
        }
        
        // Insert cases in batches of 100
        let successCount = 0;
        const batchSize = 100;
        
        for (let i = 0; i < casesToInsert.length; i += batchSize) {
          const batch = casesToInsert.slice(i, i + batchSize);
          const { error } = await supabase.from('cases').insert(batch);
          
          if (error) {
            console.error('Batch insert error:', error);
            errors.push(`Batch ${Math.floor(i / batchSize) + 1} failed: ${error.message}`);
          } else {
            successCount += batch.length;
          }
        }
        
        // Log bulk action
        await supabase.from('case_actions').insert([{
          case_id: casesToInsert[0]?.case_id || 'BULK_UPLOAD',
          action_type: 'BULK_IMPORT',
          note: `Bulk import: ${successCount} cases imported from CSV file`,
          created_at: new Date().toISOString()
        }]);
        
        if (errors.length > 0) {
          alert(`Import completed with some errors:\n- ${successCount} cases imported successfully\n- ${errors.length} errors:\n${errors.slice(0, 5).join('\n')}`);
        } else {
          alert(`Successfully imported ${successCount} cases!`);
        }
        
        resetForm();
        setShowAddCaseModal(false);
        await loadCases(1);
        await loadCategoryCounts();
        setCurrentPage(1);
        setActiveCategory('unassigned');
        setAddCaseLoading(false);
      };
      
      reader.readAsText(csvFile);
    } catch (error) {
      console.error('Error uploading CSV:', error);
      setAddCaseLoading(false);
      alert('An error occurred while uploading the CSV. Please try again.');
    }
  };

  // Download CSV template
  const downloadCsvTemplate = () => {
    const headers = ['customer_name', 'customer_id', 'invoice_amount', 'days_overdue', 'credit_score', 'customer_type', 'priority_level', 'dispute_history'];
    const sampleRow = ['John Doe Corp', 'CUST_001', '50000', '45', '680', 'Commercial', 'MEDIUM', '0'];
    const csv = [headers.join(','), sampleRow.join(',')].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fedex_case_import_template.csv';
    a.click();
  };

  // Calculate pagination
  const totalPages = Math.ceil(totalCases / ITEMS_PER_PAGE);
  const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalCases);

  if (loading && cases.length === 0) {
    return (
      <div className="case-manager">
        <div className="loading-container">
          <div className="loading-spinner-large"></div>
          <p>Loading cases...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="case-manager">
      {/* Category Tabs */}
      <div className="category-tabs">
        <button 
          className={`category-tab ${activeCategory === 'all' ? 'active' : ''}`}
          onClick={() => setActiveCategory('all')}
        >
          <List size={18} />
          <span>All Cases</span>
          <span className="tab-count">{categoryCounts.all.toLocaleString()}</span>
        </button>
        <button 
          className={`category-tab unassigned ${activeCategory === 'unassigned' ? 'active' : ''}`}
          onClick={() => setActiveCategory('unassigned')}
        >
          <Building2 size={18} />
          <span>FedEx HQ Cases</span>
          <span className="tab-count">{categoryCounts.unassigned.toLocaleString()}</span>
        </button>
        <button 
          className={`category-tab sla-breach ${activeCategory === 'slaBreach' ? 'active' : ''}`}
          onClick={() => setActiveCategory('slaBreach')}
        >
          <AlertTriangle size={18} />
          <span>SLA Breaches</span>
          <span className="tab-count">{categoryCounts.slaBreach.toLocaleString()}</span>
        </button>
        <button 
          className={`category-tab high-priority ${activeCategory === 'highPriority' ? 'active' : ''}`}
          onClick={() => setActiveCategory('highPriority')}
        >
          <Zap size={18} />
          <span>High Priority</span>
          <span className="tab-count">{categoryCounts.highPriority.toLocaleString()}</span>
        </button>
      </div>

      {/* Header with stats */}
      <div className="manager-header">
        <div className="header-stats">
          <div className="stat-item">
            <span className="stat-label">Showing</span>
            <span className="stat-value">{startItem} - {endItem} of {totalCases.toLocaleString()}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Value</span>
            <span className="stat-value">{formatCurrency(filteredCases.reduce((sum, c) => sum + (c.invoice_amount || 0), 0))}</span>
          </div>
          {selectedCases.length > 0 && (
            <div className="stat-item selected">
              <span className="stat-label">Selected</span>
              <span className="stat-value">{selectedCases.length} cases</span>
            </div>
          )}
        </div>

        <div className="header-actions">
          <button className="btn-action primary add-case" onClick={() => setShowAddCaseModal(true)}>
            <Plus size={18} />
            Add New Case
          </button>
          {selectedCases.length > 0 && (activeCategory === 'unassigned' || activeCategory === 'slaBreach' || activeCategory === 'highPriority') && (
            <button className="btn-action primary" onClick={handleBulkAssign}>
              <UserPlus size={18} />
              Assign Selected ({selectedCases.length})
            </button>
          )}
          <button className="btn-action" onClick={() => loadCases(currentPage)}>
            <RefreshCw size={18} />
            Refresh
          </button>
          <button className="btn-action" onClick={exportToCSV}>
            <Download size={18} />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="manager-filters">
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

      {/* Cases Table */}
      <div className="cases-table-container">
        <table className="cases-table">
          <thead>
            <tr>
              {(activeCategory === 'unassigned' || activeCategory === 'slaBreach' || activeCategory === 'highPriority') && (
                <th className="checkbox-col">
                  <input 
                    type="checkbox" 
                    checked={selectedCases.length === filteredCases.length && filteredCases.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
              )}
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
            {filteredCases.length === 0 ? (
              <tr>
                <td colSpan={(activeCategory === 'unassigned' || activeCategory === 'slaBreach' || activeCategory === 'highPriority') ? 11 : 10} className="no-data">
                  No cases found matching your criteria
                </td>
              </tr>
            ) : (
              filteredCases.map((caseItem) => (
                <tr key={caseItem.case_id} className={selectedCases.includes(caseItem.case_id) ? 'selected' : ''}>
                  {(activeCategory === 'unassigned' || activeCategory === 'slaBreach' || activeCategory === 'highPriority') && (
                    <td className="checkbox-col">
                      <input 
                        type="checkbox" 
                        checked={selectedCases.includes(caseItem.case_id)}
                        onChange={() => handleSelectCase(caseItem.case_id)}
                      />
                    </td>
                  )}
                  <td className="case-id">{caseItem.case_id}</td>
                  <td>
                    <div className="customer-cell">
                      <span className="customer-name">{caseItem.customer_name}</span>
                      <span className="customer-type">{caseItem.customer_type}</span>
                    </div>
                  </td>
                  <td className="amount">{formatCurrency(caseItem.invoice_amount)}</td>
                  <td className="days-overdue">
                    <span className={caseItem.days_overdue > 90 ? 'critical' : caseItem.days_overdue > 60 ? 'warning' : ''}>
                      {caseItem.days_overdue} days
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge status-${caseItem.case_status?.toLowerCase().replace(/_/g, '-')}`}>
                      {caseItem.case_status}
                    </span>
                  </td>
                  <td>
                    <span className={`priority-badge priority-${caseItem.priority_level?.toLowerCase()}`}>
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
                  <td>
                    <span className={`dca-badge ${(!caseItem.dca_id || caseItem.dca_id.includes('FEDEX') || caseItem.dca_id === 'UNASSIGNED') ? 'unassigned' : ''}`}>
                      {(!caseItem.dca_id || caseItem.dca_id.includes('FEDEX') || caseItem.dca_id === 'UNASSIGNED') 
                        ? 'Unassigned' 
                        : caseItem.dca_id}
                    </span>
                  </td>
                  <td className="sla-breaches">
                    {caseItem.sla_breach_count > 0 ? (
                      <span className="breach-badge">
                        <AlertTriangle size={12} />
                        {caseItem.sla_breach_count}
                      </span>
                    ) : (
                      <span className="no-breach">-</span>
                    )}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon" title="View Details">
                        <Eye size={16} />
                      </button>
                      {(activeCategory === 'unassigned' || activeCategory === 'slaBreach' || activeCategory === 'highPriority') && (
                        <button 
                          className="btn-icon assign" 
                          title="Assign to DCA"
                          onClick={() => handleAssignCase(caseItem)}
                        >
                          <UserPlus size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="pagination">
        <button 
          className="pagination-btn"
          disabled={currentPage === 1}
          onClick={() => handlePageChange(currentPage - 1)}
        >
          <ChevronLeft size={18} />
          Previous
        </button>
        
        <div className="pagination-pages">
          {/* First page */}
          {currentPage > 3 && (
            <>
              <button 
                className="page-btn"
                onClick={() => handlePageChange(1)}
              >
                1
              </button>
              {currentPage > 4 && <span className="page-ellipsis">...</span>}
            </>
          )}
          
          {/* Page numbers around current */}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }
            
            if (pageNum < 1 || pageNum > totalPages) return null;
            
            return (
              <button 
                key={pageNum}
                className={`page-btn ${currentPage === pageNum ? 'active' : ''}`}
                onClick={() => handlePageChange(pageNum)}
              >
                {pageNum}
              </button>
            );
          })}
          
          {/* Last page */}
          {currentPage < totalPages - 2 && totalPages > 5 && (
            <>
              {currentPage < totalPages - 3 && <span className="page-ellipsis">...</span>}
              <button 
                className="page-btn"
                onClick={() => handlePageChange(totalPages)}
              >
                {totalPages}
              </button>
            </>
          )}
        </div>
        
        <button 
          className="pagination-btn"
          disabled={currentPage === totalPages}
          onClick={() => handlePageChange(currentPage + 1)}
        >
          Next
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-content assign-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <UserPlus size={24} />
                Assign Case{selectedCases.length > 1 ? 's' : ''} to DCA
              </h3>
              <button className="close-btn" onClick={() => setShowAssignModal(false)}>
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="assignment-summary">
                <div className="summary-item">
                  <span className="summary-label">Cases Selected</span>
                  <span className="summary-value">{selectedCases.length}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Total Value</span>
                  <span className="summary-value">
                    {formatCurrency(
                      cases
                        .filter(c => selectedCases.includes(c.case_id))
                        .reduce((sum, c) => sum + (c.invoice_amount || 0), 0)
                    )}
                  </span>
                </div>
              </div>
              
              {!bulkMode && selectedCase && (
                <div className="case-preview">
                  <h4>Case Details</h4>
                  <div className="preview-grid">
                    <div className="preview-item">
                      <span className="preview-label">Case ID</span>
                      <span className="preview-value">{selectedCase.case_id}</span>
                    </div>
                    <div className="preview-item">
                      <span className="preview-label">Customer</span>
                      <span className="preview-value">{selectedCase.customer_name}</span>
                    </div>
                    <div className="preview-item">
                      <span className="preview-label">Amount</span>
                      <span className="preview-value">{formatCurrency(selectedCase.invoice_amount)}</span>
                    </div>
                    <div className="preview-item">
                      <span className="preview-label">Priority</span>
                      <span className={`preview-value priority-${selectedCase.priority_level?.toLowerCase()}`}>
                        {selectedCase.priority_level}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="dca-selection">
                <h4>Select DCA for Assignment</h4>
                <div className="dca-options">
                  {agencies.map(agency => (
                    <label 
                      key={agency.id} 
                      className={`dca-option ${assigningDCA === agency.id ? 'selected' : ''}`}
                    >
                      <input 
                        type="radio" 
                        name="dca" 
                        value={agency.id}
                        checked={assigningDCA === agency.id}
                        onChange={(e) => setAssigningDCA(e.target.value)}
                      />
                      <Building2 size={20} />
                      <div className="dca-info">
                        <span className="dca-name">{agency.name}</span>
                        <span className="dca-id">{agency.id}</span>
                      </div>
                      {assigningDCA === agency.id && <CheckCircle size={20} className="check-icon" />}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowAssignModal(false)}>
                Cancel
              </button>
              <button 
                className="btn-confirm"
                disabled={!assigningDCA || assignLoading}
                onClick={confirmAssignment}
              >
                {assignLoading ? (
                  <>
                    <RefreshCw size={18} className="spinning" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    Confirm Assignment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Case Modal */}
      {showAddCaseModal && (
        <div className="modal-overlay" onClick={() => setShowAddCaseModal(false)}>
          <div className="modal-content add-case-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <Plus size={24} />
                Add New Debt Collection Case
              </h3>
              <button className="close-btn" onClick={() => { setShowAddCaseModal(false); resetForm(); }}>
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="modal-tabs">
              <button 
                className={`modal-tab ${addCaseMode === 'form' ? 'active' : ''}`}
                onClick={() => setAddCaseMode('form')}
              >
                <FileText size={18} />
                Single Case
              </button>
              <button 
                className={`modal-tab ${addCaseMode === 'csv' ? 'active' : ''}`}
                onClick={() => setAddCaseMode('csv')}
              >
                <Upload size={18} />
                CSV Import
              </button>
            </div>
            
            <div className="modal-body">
              {addCaseMode === 'form' ? (
                <div className="add-case-form">
                  <div className="form-section">
                    <h4>Customer Information</h4>
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Customer Name <span className="required">*</span></label>
                        <input 
                          type="text"
                          value={newCaseForm.customer_name}
                          onChange={(e) => handleFormChange('customer_name', e.target.value)}
                          placeholder="Enter customer/company name"
                        />
                      </div>
                      <div className="form-group">
                        <label>Customer ID</label>
                        <input 
                          type="text"
                          value={newCaseForm.customer_id}
                          onChange={(e) => handleFormChange('customer_id', e.target.value)}
                          placeholder="Auto-generated if blank"
                        />
                      </div>
                      <div className="form-group">
                        <label>Customer Type</label>
                        <select 
                          value={newCaseForm.customer_type}
                          onChange={(e) => handleFormChange('customer_type', e.target.value)}
                        >
                          <option value="Commercial">Commercial</option>
                          <option value="Residential">Residential</option>
                          <option value="Government">Government</option>
                          <option value="Enterprise">Enterprise</option>
                          <option value="SMB">SMB</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Credit Score</label>
                        <input 
                          type="number"
                          value={newCaseForm.credit_score}
                          onChange={(e) => handleFormChange('credit_score', e.target.value)}
                          placeholder="300-850 (default: 650)"
                          min="300"
                          max="850"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="form-section">
                    <h4>Debt Information</h4>
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Invoice Amount ($) <span className="required">*</span></label>
                        <input 
                          type="number"
                          value={newCaseForm.invoice_amount}
                          onChange={(e) => handleFormChange('invoice_amount', e.target.value)}
                          placeholder="Enter amount in USD"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="form-group">
                        <label>Days Overdue <span className="required">*</span></label>
                        <input 
                          type="number"
                          value={newCaseForm.days_overdue}
                          onChange={(e) => handleFormChange('days_overdue', e.target.value)}
                          placeholder="Number of days overdue"
                          min="0"
                        />
                      </div>
                      <div className="form-group">
                        <label>Dispute History</label>
                        <input 
                          type="number"
                          value={newCaseForm.dispute_history}
                          onChange={(e) => handleFormChange('dispute_history', e.target.value)}
                          placeholder="Number of previous disputes"
                          min="0"
                        />
                      </div>
                      <div className="form-group">
                        <label>Initial Status</label>
                        <select 
                          value={newCaseForm.case_status}
                          onChange={(e) => handleFormChange('case_status', e.target.value)}
                        >
                          <option value="OPEN">Open</option>
                          <option value="DISPUTE">Dispute</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  <div className="form-section">
                    <h4>Priority & Escalation</h4>
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Initial Priority</label>
                        <select 
                          value={newCaseForm.priority_level}
                          onChange={(e) => handleFormChange('priority_level', e.target.value)}
                        >
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                        </select>
                        <small>Priority may be auto-adjusted based on risk assessment</small>
                      </div>
                      <div className="form-group full-width">
                        <label>Escalation Reason (Optional)</label>
                        <textarea 
                          value={newCaseForm.escalation_reason}
                          onChange={(e) => handleFormChange('escalation_reason', e.target.value)}
                          placeholder="Enter reason if this case needs immediate attention..."
                          rows="2"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="form-info">
                    <AlertCircle size={16} />
                    <span>New cases will be assigned to <strong>FedEx HQ</strong> (unassigned) and appear in the "FedEx HQ Cases" tab for allocation to a DCA.</span>
                  </div>
                </div>
              ) : (
                <div className="csv-upload-section">
                  <div className="csv-instructions">
                    <h4>CSV File Import</h4>
                    <p>Upload a CSV file to import multiple cases at once. The file should include the following columns:</p>
                    <div className="column-list">
                      <span className="column required">customer_name*</span>
                      <span className="column required">invoice_amount*</span>
                      <span className="column">customer_id</span>
                      <span className="column">days_overdue</span>
                      <span className="column">credit_score</span>
                      <span className="column">customer_type</span>
                      <span className="column">priority_level</span>
                      <span className="column">dispute_history</span>
                    </div>
                    <button className="btn-template" onClick={downloadCsvTemplate}>
                      <Download size={16} />
                      Download Template
                    </button>
                  </div>
                  
                  <div className="csv-dropzone" onClick={() => fileInputRef.current?.click()}>
                    <input 
                      type="file"
                      ref={fileInputRef}
                      accept=".csv"
                      onChange={handleCsvFileChange}
                      style={{ display: 'none' }}
                    />
                    <Upload size={40} />
                    <p>Click to select CSV file or drag and drop</p>
                    {csvFile && (
                      <div className="file-selected">
                        <FileText size={20} />
                        <span>{csvFile.name}</span>
                        <button onClick={(e) => { e.stopPropagation(); setCsvFile(null); setCsvPreview([]); }}>
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {csvPreview.length > 0 && (
                    <div className="csv-preview">
                      <h4>Preview (First 5 rows)</h4>
                      <div className="preview-table-container">
                        <table className="preview-table">
                          <thead>
                            <tr>
                              <th>Row</th>
                              <th>Customer Name</th>
                              <th>Amount</th>
                              <th>Days Overdue</th>
                              <th>Credit Score</th>
                            </tr>
                          </thead>
                          <tbody>
                            {csvPreview.map((row, idx) => (
                              <tr key={idx}>
                                <td>{row._rowNum}</td>
                                <td>{row.customer_name || row.customername || row.name || '-'}</td>
                                <td>${parseFloat(row.invoice_amount || row.amount || 0).toLocaleString()}</td>
                                <td>{row.days_overdue || row.overdue || '0'}</td>
                                <td>{row.credit_score || row.credit || '650'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  
                  <div className="form-info">
                    <AlertCircle size={16} />
                    <span>All imported cases will be assigned to <strong>FedEx HQ</strong> for allocation. Case IDs will be auto-generated.</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => { setShowAddCaseModal(false); resetForm(); }}>
                Cancel
              </button>
              <button 
                className="btn-confirm"
                disabled={addCaseLoading}
                onClick={addCaseMode === 'form' ? handleAddCase : handleCsvUpload}
              >
                {addCaseLoading ? (
                  <>
                    <RefreshCw size={18} className="spinning" />
                    {addCaseMode === 'form' ? 'Creating...' : 'Importing...'}
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    {addCaseMode === 'form' ? 'Create Case' : `Import ${csvFile ? 'Cases' : ''}`}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CaseManager;
