import React, { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  Scale,
  User,
  Clock,
  Calendar,
  DollarSign,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap,
  Send,
  Upload,
  CreditCard,
  Building,
  Copy,
  X,
  Loader2,
  PartyPopper
} from 'lucide-react';
import confetti from 'canvas-confetti';
import './ActionConsole.css';

function ActionConsole({ caseData, profile, onBack, onCaseUpdate }) {
  const [activeModal, setActiveModal] = useState(null); // 'call', 'sms', 'legal', 'payment'
  const [callState, setCallState] = useState('idle'); // 'idle', 'dialing', 'connected', 'ended'
  const [callNotes, setCallNotes] = useState('');
  const [callOutcome, setCallOutcome] = useState(null);
  const [ptpDate, setPtpDate] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [paymentMode, setPaymentMode] = useState('upi');
  const [utrNumber, setUtrNumber] = useState('');
  const [paymentAmount, setPaymentAmount] = useState(caseData?.invoice_amount || 0);
  const [proofFile, setProofFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const callTimerRef = useRef(null);
  const [callDuration, setCallDuration] = useState(0);

  // AI-generated script based on customer context
  const getAIScript = () => {
    const amount = caseData?.invoice_amount || 0;
    const daysOverdue = caseData?.days_overdue || 0;
    const customerName = caseData?.customer_name?.split(' ')[0] || 'Customer';

    if (daysOverdue < 15) {
      return {
        scenario: 'Early Reminder',
        script: `Hi ${customerName}, this is a courtesy call from FedEx regarding invoice ${caseData?.case_id}. I see there's a balance of ${formatCurrency(amount)} that's coming up for payment. Would you like me to help you process this today?`
      };
    }

    if (daysOverdue < 30) {
      return {
        scenario: 'Standard Follow-up',
        script: `Hello ${customerName}, I'm calling about your outstanding balance of ${formatCurrency(amount)} on invoice ${caseData?.case_id}. It's been ${daysOverdue} days since the due date. I'd love to help resolve this today - do you have a few minutes to discuss payment options?`
      };
    }

    if (daysOverdue < 60) {
      return {
        scenario: 'Escalation Warning',
        script: `Hi ${customerName}, this is an important call regarding your account with FedEx. Your balance of ${formatCurrency(amount)} is now ${daysOverdue} days overdue. To avoid any service disruptions or further escalation, I recommend we settle this today. What payment method works best for you?`
      };
    }

    return {
      scenario: 'Final Notice',
      script: `${customerName}, I'm calling regarding a critical matter on your FedEx account. Your outstanding balance of ${formatCurrency(amount)} is now ${daysOverdue} days past due. This matter may be referred for legal action if not resolved. However, I'm here to help you find a solution today. Can we discuss immediate payment options?`
    };
  };

  // SMS Templates
  const smsTemplates = [
    {
      id: 'soft',
      type: 'Soft Reminder',
      icon: '💬',
      color: '#4ade80',
      message: `Dear ${caseData?.customer_name}, this is a friendly reminder that your FedEx invoice #${caseData?.case_id} for ${formatCurrency(caseData?.invoice_amount)} is pending. Please process the payment at your earliest convenience. Thank you for your business!`
    },
    {
      id: 'hard',
      type: 'Urgent Notice',
      icon: '⚠️',
      color: '#f59e0b',
      message: `URGENT: Your FedEx invoice #${caseData?.case_id} for ${formatCurrency(caseData?.invoice_amount)} is ${caseData?.days_overdue} days overdue. Please settle immediately to avoid service disruption and additional charges. Contact us now.`
    },
    {
      id: 'final',
      type: 'Final Warning',
      icon: '🚨',
      color: '#ef4444',
      message: `FINAL NOTICE: Invoice #${caseData?.case_id} - ${formatCurrency(caseData?.invoice_amount)} overdue. This is your last reminder before escalation to legal proceedings. Clear payment within 48 hours to avoid further action.`
    },
    {
      id: 'payment-link',
      type: 'Payment Link',
      icon: '💳',
      color: '#3b82f6',
      message: `Pay your FedEx invoice instantly! Amount: ${formatCurrency(caseData?.invoice_amount)}. Click here to pay securely via UPI/Card: https://pay.fedex.com/${caseData?.case_id}. Thank you!`
    }
  ];

  // Format currency
  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  }

  // Start call simulation
  const startCall = () => {
    setCallState('dialing');
    setTimeout(() => {
      setCallState('connected');
      // Start timer
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }, 2000);
  };

  // End call
  const endCall = () => {
    setCallState('ended');
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }
  };

  // Format call duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Submit call outcome
  const submitCallOutcome = async () => {
    setSubmitting(true);
    try {
      // Log the action
      const { error } = await supabase
        .from('case_actions')
        .insert({
          case_id: caseData.case_id,
          action_type: 'CALL',
          action_details: {
            outcome: callOutcome,
            notes: callNotes,
            duration: callDuration,
            ptp_date: callOutcome === 'ptp' ? ptpDate : null
          },
          performed_by: profile?.id,
          performed_at: new Date().toISOString()
        });

      if (error) throw error;

      // Update case status if PTP
      if (callOutcome === 'ptp') {
        await supabase
          .from('cases')
          .update({ case_status: 'PROMISE_TO_PAY' })
          .eq('case_id', caseData.case_id);
      }

      // Reset and close
      setActiveModal(null);
      setCallState('idle');
      setCallDuration(0);
      setCallNotes('');
      setCallOutcome(null);
      onCaseUpdate?.();
    } catch (error) {
      console.error('Error logging call:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Send SMS
  const sendSMS = async () => {
    if (!selectedTemplate) return;
    
    setSubmitting(true);
    try {
      await supabase
        .from('case_actions')
        .insert({
          case_id: caseData.case_id,
          action_type: 'SMS',
          action_details: {
            template_type: selectedTemplate.type,
            message: selectedTemplate.message
          },
          performed_by: profile?.id,
          performed_at: new Date().toISOString()
        });

      setActiveModal(null);
      setSelectedTemplate(null);
      onCaseUpdate?.();
    } catch (error) {
      console.error('Error sending SMS:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Trigger legal action
  const triggerLegalAction = async () => {
    setSubmitting(true);
    try {
      await supabase
        .from('case_actions')
        .insert({
          case_id: caseData.case_id,
          action_type: 'LEGAL_REQUEST',
          action_details: {
            requested_by: profile?.full_name || profile?.email,
            reason: 'Non-payment after multiple follow-ups'
          },
          performed_by: profile?.id,
          performed_at: new Date().toISOString()
        });

      // Update case status
      await supabase
        .from('cases')
        .update({ case_status: 'UNDER_LEGAL_REVIEW' })
        .eq('case_id', caseData.case_id);

      setActiveModal(null);
      onCaseUpdate?.();
    } catch (error) {
      console.error('Error triggering legal action:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Log payment
  const logPayment = async () => {
    if (!utrNumber || utrNumber.length < 6) {
      alert('Please enter a valid UTR/Reference number');
      return;
    }

    setSubmitting(true);
    try {
      // Log payment action
      await supabase
        .from('case_actions')
        .insert({
          case_id: caseData.case_id,
          action_type: 'PAYMENT_LOGGED',
          action_details: {
            payment_mode: paymentMode,
            amount: paymentAmount,
            utr_reference: utrNumber,
            logged_by: profile?.full_name || profile?.email
          },
          performed_by: profile?.id,
          performed_at: new Date().toISOString()
        });

      // Update case status to pending verification
      await supabase
        .from('cases')
        .update({ case_status: 'VERIFICATION_PENDING' })
        .eq('case_id', caseData.case_id);

      // Show confetti!
      setShowConfetti(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      setTimeout(() => {
        setShowConfetti(false);
        setActiveModal(null);
        onCaseUpdate?.();
        onBack?.();
      }, 3000);

    } catch (error) {
      console.error('Error logging payment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const aiScript = getAIScript();

  return (
    <div className="action-console">
      {/* Back Button */}
      <button className="back-btn" onClick={onBack}>
        <ArrowLeft size={20} />
        Back to Worklist
      </button>

      {/* Customer 360 Section */}
      <div className="customer-360">
        <div className="customer-header">
          <div className="customer-avatar">
            <User size={32} />
          </div>
          <div className="customer-info">
            <h2>{caseData?.customer_name}</h2>
            <span className="case-id">{caseData?.case_id}</span>
          </div>
          <div className="customer-amount">
            {formatCurrency(caseData?.invoice_amount)}
          </div>
        </div>

        <div className="customer-context">
          <div className="context-item">
            <Clock size={16} />
            <span>Debt Age: <strong>{caseData?.days_overdue || 0} Days</strong></span>
          </div>
          <div className="context-item">
            <AlertTriangle size={16} />
            <span>Risk: <strong style={{ color: caseData?.priority_level === 'HIGH' ? '#ef4444' : '#f59e0b' }}>{caseData?.priority_level || 'MEDIUM'}</strong></span>
          </div>
          <div className="context-item">
            <FileText size={16} />
            <span>Status: <strong>{caseData?.case_status || 'OPEN'}</strong></span>
          </div>
        </div>

        {/* AI Script Box */}
        <div className="ai-script-box">
          <div className="script-header">
            <Zap size={18} />
            <span>AI Suggested Script</span>
            <span className="script-scenario">{aiScript.scenario}</span>
          </div>
          <p className="script-content">{aiScript.script}</p>
        </div>
      </div>

      {/* The Three Powers */}
      <div className="three-powers">
        <h3>
          <Zap size={20} />
          Action Powers
        </h3>
        <div className="powers-grid">
          {/* Power 1: Call */}
          <button className="power-btn call" onClick={() => setActiveModal('call')}>
            <div className="power-icon">
              <Phone size={32} />
            </div>
            <span className="power-label">CALL</span>
            <span className="power-desc">Start Dialer</span>
          </button>

          {/* Power 2: SMS */}
          <button className="power-btn sms" onClick={() => setActiveModal('sms')}>
            <div className="power-icon">
              <MessageSquare size={32} />
            </div>
            <span className="power-label">SMS</span>
            <span className="power-desc">Send Message</span>
          </button>

          {/* Power 3: Legal */}
          <button className="power-btn legal" onClick={() => setActiveModal('legal')}>
            <div className="power-icon">
              <Scale size={32} />
            </div>
            <span className="power-label">LEGAL</span>
            <span className="power-desc">Escalate</span>
          </button>
        </div>
      </div>

      {/* Payment Closer Section */}
      <div className="payment-closer">
        <div className="closer-header">
          <DollarSign size={24} />
          <div>
            <h3>Payment Received?</h3>
            <p>Log the payment when customer confirms transfer</p>
          </div>
        </div>
        <button className="log-payment-btn" onClick={() => setActiveModal('payment')}>
          <CheckCircle size={20} />
          LOG PAYMENT
        </button>
      </div>

      {/* ============ MODALS ============ */}

      {/* Call Modal */}
      {activeModal === 'call' && (
        <div className="modal-overlay" onClick={() => callState === 'idle' && setActiveModal(null)}>
          <div className="modal call-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <Phone size={24} />
              <h3>Call {caseData?.customer_name}</h3>
              <button className="close-btn" onClick={() => setActiveModal(null)}>
                <X size={20} />
              </button>
            </div>

            {callState === 'idle' && (
              <div className="call-start-screen">
                <div className="call-avatar">
                  <User size={48} />
                </div>
                <p>Ready to call?</p>
                <button className="dial-btn" onClick={startCall}>
                  <Phone size={24} />
                  Start Call
                </button>
              </div>
            )}

            {callState === 'dialing' && (
              <div className="call-dialing-screen">
                <div className="dialing-animation">
                  <Phone size={48} className="ringing" />
                </div>
                <p>Dialing...</p>
              </div>
            )}

            {callState === 'connected' && (
              <div className="call-connected-screen">
                <div className="call-timer">
                  <span className="timer-dot"></span>
                  {formatDuration(callDuration)}
                </div>
                <div className="call-notes-area">
                  <label>Call Notes</label>
                  <textarea
                    value={callNotes}
                    onChange={(e) => setCallNotes(e.target.value)}
                    placeholder="Type notes during the call..."
                    rows={4}
                  />
                </div>
                <button className="end-call-btn" onClick={endCall}>
                  <Phone size={20} />
                  End Call
                </button>
              </div>
            )}

            {callState === 'ended' && (
              <div className="call-outcome-screen">
                <h4>Call Outcome</h4>
                <div className="outcome-options">
                  <button 
                    className={`outcome-btn ${callOutcome === 'no-answer' ? 'selected' : ''}`}
                    onClick={() => setCallOutcome('no-answer')}
                  >
                    <XCircle size={20} />
                    No Answer
                  </button>
                  <button 
                    className={`outcome-btn ptp ${callOutcome === 'ptp' ? 'selected' : ''}`}
                    onClick={() => setCallOutcome('ptp')}
                  >
                    <Calendar size={20} />
                    Promise to Pay
                  </button>
                  <button 
                    className={`outcome-btn dispute ${callOutcome === 'dispute' ? 'selected' : ''}`}
                    onClick={() => setCallOutcome('dispute')}
                  >
                    <AlertTriangle size={20} />
                    Dispute
                  </button>
                </div>

                {callOutcome === 'ptp' && (
                  <div className="ptp-date-picker">
                    <label>Expected Payment Date</label>
                    <input 
                      type="date" 
                      value={ptpDate}
                      onChange={(e) => setPtpDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                )}

                <div className="call-summary">
                  <p>Duration: {formatDuration(callDuration)}</p>
                </div>

                <button 
                  className="submit-outcome-btn"
                  onClick={submitCallOutcome}
                  disabled={!callOutcome || submitting}
                >
                  {submitting ? <Loader2 className="spinning" size={20} /> : <CheckCircle size={20} />}
                  Save & Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SMS Modal */}
      {activeModal === 'sms' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal sms-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <MessageSquare size={24} />
              <h3>Send SMS</h3>
              <button className="close-btn" onClick={() => setActiveModal(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="sms-templates">
              {smsTemplates.map(template => (
                <div 
                  key={template.id}
                  className={`template-card ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
                  onClick={() => setSelectedTemplate(template)}
                  style={{ '--accent-color': template.color }}
                >
                  <div className="template-header">
                    <span className="template-icon">{template.icon}</span>
                    <span className="template-type">{template.type}</span>
                  </div>
                  <p className="template-message">{template.message}</p>
                </div>
              ))}
            </div>

            <button 
              className="send-sms-btn"
              onClick={sendSMS}
              disabled={!selectedTemplate || submitting}
            >
              {submitting ? <Loader2 className="spinning" size={20} /> : <Send size={20} />}
              Send SMS
            </button>
          </div>
        </div>
      )}

      {/* Legal Modal */}
      {activeModal === 'legal' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal legal-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <Scale size={24} />
              <h3>Legal Action Request</h3>
              <button className="close-btn" onClick={() => setActiveModal(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="legal-warning">
              <AlertTriangle size={32} />
              <h4>Request Legal Notice</h4>
              <p>
                This will send a request to your Manager to initiate legal proceedings for case <strong>{caseData?.case_id}</strong>.
              </p>
              <p className="warning-note">
                The case will be marked as <strong>"UNDER LEGAL REVIEW"</strong> until the Manager approves or denies the request.
              </p>
            </div>

            <div className="case-summary">
              <div className="summary-row">
                <span>Customer</span>
                <strong>{caseData?.customer_name}</strong>
              </div>
              <div className="summary-row">
                <span>Amount</span>
                <strong>{formatCurrency(caseData?.invoice_amount)}</strong>
              </div>
              <div className="summary-row">
                <span>Days Overdue</span>
                <strong>{caseData?.days_overdue} days</strong>
              </div>
            </div>

            <button 
              className="trigger-legal-btn"
              onClick={triggerLegalAction}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="spinning" size={20} /> : <Scale size={20} />}
              Trigger Legal Notice
            </button>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {activeModal === 'payment' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal payment-modal" onClick={e => e.stopPropagation()}>
            {!showConfetti ? (
              <>
                <div className="modal-header">
                  <DollarSign size={24} />
                  <h3>Log Payment</h3>
                  <button className="close-btn" onClick={() => setActiveModal(null)}>
                    <X size={20} />
                  </button>
                </div>

                <div className="payment-form">
                  <div className="form-group">
                    <label>Payment Mode</label>
                    <div className="payment-mode-selector">
                      <button 
                        className={`mode-btn ${paymentMode === 'upi' ? 'active' : ''}`}
                        onClick={() => setPaymentMode('upi')}
                      >
                        <CreditCard size={18} />
                        UPI
                      </button>
                      <button 
                        className={`mode-btn ${paymentMode === 'netbanking' ? 'active' : ''}`}
                        onClick={() => setPaymentMode('netbanking')}
                      >
                        <Building size={18} />
                        Net Banking
                      </button>
                      <button 
                        className={`mode-btn ${paymentMode === 'card' ? 'active' : ''}`}
                        onClick={() => setPaymentMode('card')}
                      >
                        <CreditCard size={18} />
                        Card
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Amount</label>
                    <div className="amount-input">
                      <span className="currency">$</span>
                      <input 
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group utr-group">
                    <label>
                      <span className="golden-label">✨ UTR / Reference Number</span>
                    </label>
                    <input 
                      type="text"
                      value={utrNumber}
                      onChange={(e) => setUtrNumber(e.target.value.toUpperCase())}
                      placeholder="Enter 12-digit reference number"
                      className="utr-input"
                    />
                    <p className="utr-script">
                      📜 "Please read me the 12-digit Reference Number starting with 'UTR' so I can secure your account immediately."
                    </p>
                  </div>

                  <div className="form-group">
                    <label>Proof (Optional)</label>
                    <div className="file-upload">
                      <input 
                        type="file"
                        accept="image/*"
                        onChange={(e) => setProofFile(e.target.files[0])}
                        id="proof-upload"
                      />
                      <label htmlFor="proof-upload" className="upload-btn">
                        <Upload size={18} />
                        {proofFile ? proofFile.name : 'Upload Screenshot'}
                      </label>
                    </div>
                  </div>
                </div>

                <button 
                  className="submit-payment-btn"
                  onClick={logPayment}
                  disabled={submitting || !utrNumber}
                >
                  {submitting ? <Loader2 className="spinning" size={20} /> : <CheckCircle size={20} />}
                  Submit Payment
                </button>
              </>
            ) : (
              <div className="payment-success">
                <PartyPopper size={64} />
                <h2>Payment Logged!</h2>
                <p>Case moved to Verification Pending</p>
                <p className="points-earned">+50 Points Earned! 🎉</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ActionConsole;
