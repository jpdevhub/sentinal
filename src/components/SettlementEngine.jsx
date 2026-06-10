import { useState } from 'react';
import { TrendingDown, CreditCard, AlertTriangle, CheckCircle, RefreshCw, DollarSign, Calendar, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './SettlementEngine.css';

const DEBTOR_INTENT_LABELS = {
  WILLING_AND_ABLE: { label: 'Willing & Able to Pay', color: '#22c55e', icon: '✅' },
  WILLING_BUT_UNABLE: { label: 'Willing but Unable', color: '#f59e0b', icon: '⚠️' },
  DISPUTED_INVOICE: { label: 'Disputed Invoice', color: '#ef4444', icon: '⚖️' },
  EVADING_CONTACT: { label: 'Evading Contact', color: '#8b5cf6', icon: '🚫' },
};

function SettlementEngine({ caseData, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [ptpDate, setPtpDate] = useState('');
  const [showPtpForm, setShowPtpForm] = useState(false);

  const riskScore = caseData?.risk_score ?? 50;
  const invoiceAmount = caseData?.invoice_amount ?? 0;
  const isHighRisk = riskScore > 80;
  const isStable = riskScore < 40;

  const discountAmount = parseFloat((invoiceAmount * 0.10).toFixed(2));
  const settledAmount = parseFloat((invoiceAmount * 0.90).toFixed(2));

  const emiMonthly = parseFloat((invoiceAmount / 3).toFixed(2));

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

  // Apply 10% instant discount — immediately writes to DB
  const applyInstantDiscount = async () => {
    if (!caseData?.case_id) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('cases')
        .update({
          amount_recovered: settledAmount,
          case_status: 'RECONCILED',
          case_closed_date: new Date().toISOString(),
          recovered: true,
        })
        .eq('case_id', caseData.case_id);

      if (error) throw error;

      await supabase.from('case_actions').insert([{
        case_id: caseData.case_id,
        action_type: 'INSTANT_SETTLEMENT',
        note: `10% instant discount applied. Invoice: ${formatCurrency(invoiceAmount)}. Settled for: ${formatCurrency(settledAmount)}. Discount: ${formatCurrency(discountAmount)}.`,
        created_at: new Date().toISOString(),
      }]);

      onUpdate?.();
    } catch (err) {
      console.error('Settlement error:', err);
      alert(`Failed to apply settlement: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Set up 3-month EMI Promise-to-Pay
  const applyEmiPlan = async () => {
    if (!caseData?.case_id || !ptpDate) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('cases')
        .update({
          case_status: 'PROMISE_TO_PAY',
          ptp_date: new Date(ptpDate).toISOString(),
          current_intent: 'WILLING_BUT_UNABLE',
        })
        .eq('case_id', caseData.case_id);

      if (error) throw error;

      await supabase.from('case_actions').insert([{
        case_id: caseData.case_id,
        action_type: 'EMI_PLAN_SET',
        note: `3-Month EMI plan agreed. Monthly instalment: ${formatCurrency(emiMonthly)}. First payment due: ${ptpDate}.`,
        created_at: new Date().toISOString(),
      }]);

      setShowPtpForm(false);
      onUpdate?.();
    } catch (err) {
      console.error('EMI plan error:', err);
      alert(`Failed to set EMI plan: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Determine today's min date for PTP picker
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  return (
    <div className="settlement-engine">
      {/* Risk Band Header */}
      <div className={`risk-band ${isHighRisk ? 'high-risk' : isStable ? 'stable' : 'medium-risk'}`}>
        <div className="risk-band-icon">
          {isHighRisk ? <AlertTriangle size={22} /> : isStable ? <ShieldCheck size={22} /> : <TrendingDown size={22} />}
        </div>
        <div className="risk-band-info">
          <span className="risk-band-label">
            {isHighRisk ? 'High Flight Risk' : isStable ? 'Stable Debtor' : 'Moderate Risk'}
          </span>
          <span className="risk-band-score">Risk Score: {riskScore}</span>
        </div>
        <div className={`risk-score-badge ${isHighRisk ? 'badge-red' : isStable ? 'badge-green' : 'badge-amber'}`}>
          {riskScore}
        </div>
      </div>

      {/* Invoice Summary */}
      <div className="invoice-summary">
        <div className="invoice-row">
          <span className="invoice-label">Outstanding Invoice</span>
          <span className="invoice-value">{formatCurrency(invoiceAmount)}</span>
        </div>
        <div className="invoice-row">
          <span className="invoice-label">Current Intent</span>
          <span className="intent-chip" style={{ color: DEBTOR_INTENT_LABELS[caseData?.current_intent]?.color ?? '#9ca3af' }}>
            {DEBTOR_INTENT_LABELS[caseData?.current_intent]?.icon ?? '—'}{' '}
            {DEBTOR_INTENT_LABELS[caseData?.current_intent]?.label ?? 'Not Captured'}
          </span>
        </div>
      </div>

      {/* ── HIGH RISK: 10% Instant Discount ── */}
      {isHighRisk && caseData?.case_status !== 'RECONCILED' && (
        <div className="settlement-option discount-option">
          <div className="option-header">
            <DollarSign size={20} className="option-icon discount-icon" />
            <div>
              <h4>10% Instant Settlement Discount</h4>
              <p>Grab guaranteed cash before full default. Debtor pays <strong>{formatCurrency(settledAmount)}</strong> now — saving {formatCurrency(discountAmount)}.</p>
            </div>
          </div>
          <div className="option-breakdown">
            <div className="breakdown-row">
              <span>Full Invoice</span>
              <span className="strikethrough">{formatCurrency(invoiceAmount)}</span>
            </div>
            <div className="breakdown-row highlight">
              <span>Settlement Amount (90%)</span>
              <span>{formatCurrency(settledAmount)}</span>
            </div>
            <div className="breakdown-row muted">
              <span>Discount Given</span>
              <span>− {formatCurrency(discountAmount)}</span>
            </div>
          </div>
          <button
            className="settlement-btn discount-btn"
            onClick={applyInstantDiscount}
            disabled={loading}
          >
            {loading ? <RefreshCw size={16} className="spinning" /> : <CheckCircle size={16} />}
            Apply Instant Settlement
          </button>
        </div>
      )}

      {/* ── STABLE: 3-Month EMI Plan ── */}
      {isStable && caseData?.case_status !== 'RECONCILED' && caseData?.case_status !== 'PROMISE_TO_PAY' && (
        <div className="settlement-option emi-option">
          <div className="option-header">
            <Calendar size={20} className="option-icon emi-icon" />
            <div>
              <h4>3-Month EMI Plan</h4>
              <p>Debtor pays full amount in 3 equal monthly instalments of <strong>{formatCurrency(emiMonthly)}</strong>.</p>
            </div>
          </div>
          <div className="option-breakdown">
            <div className="breakdown-row">
              <span>Total Invoice</span>
              <span>{formatCurrency(invoiceAmount)}</span>
            </div>
            <div className="breakdown-row highlight">
              <span>Monthly Instalment (×3)</span>
              <span>{formatCurrency(emiMonthly)}</span>
            </div>
            <div className="breakdown-row muted">
              <span>Discount Given</span>
              <span>None — full recovery</span>
            </div>
          </div>

          {!showPtpForm ? (
            <button className="settlement-btn emi-btn" onClick={() => setShowPtpForm(true)}>
              <Calendar size={16} />
              Set Up EMI Plan
            </button>
          ) : (
            <div className="ptp-form">
              <label>First Payment Due Date</label>
              <input
                type="date"
                min={minDateStr}
                value={ptpDate}
                onChange={(e) => setPtpDate(e.target.value)}
                className="ptp-date-input"
              />
              <div className="ptp-actions">
                <button className="btn-ghost" onClick={() => setShowPtpForm(false)}>Cancel</button>
                <button
                  className="settlement-btn emi-btn"
                  onClick={applyEmiPlan}
                  disabled={!ptpDate || loading}
                >
                  {loading ? <RefreshCw size={16} className="spinning" /> : <CheckCircle size={16} />}
                  Confirm EMI Plan
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MEDIUM: Standard Recovery ── */}
      {!isHighRisk && !isStable && (
        <div className="settlement-option standard-option">
          <div className="option-header">
            <CreditCard size={20} className="option-icon standard-icon" />
            <div>
              <h4>Standard Collection</h4>
              <p>Debtor risk is moderate. Follow standard collection script. No discount or EMI plan unlocked at this risk level.</p>
            </div>
          </div>
          <div className="standard-guidance">
            <p>📋 Recommended actions: Send formal demand letter, escalate if no response in 7 days.</p>
          </div>
        </div>
      )}

      {/* Already Settled */}
      {caseData?.case_status === 'RECONCILED' && (
        <div className="settled-badge">
          <CheckCircle size={20} />
          Case Reconciled — Amount Recovered: {formatCurrency(caseData?.amount_recovered)}
        </div>
      )}

      {/* PTP Active */}
      {caseData?.case_status === 'PROMISE_TO_PAY' && caseData?.ptp_date && (
        <div className="ptp-active-badge">
          <Calendar size={20} />
          PTP Active — First payment due: {new Date(caseData.ptp_date).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}

export default SettlementEngine;
