import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  AlertTriangle, 
  Target,
  Award,
  Activity,
  BarChart3
} from 'lucide-react';
import {
  BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, Cell, ZAxis
} from 'recharts';
import { supabase } from '../lib/supabase';
import './DCAPerformanceAnalytics.css';

function DCAPerformanceAnalytics() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({
    totalLiquidation: 0,
    slaBreachRatio: 0,
    portfolioRiskScore: 0,
    topPerformingAgency: null
  });
  const [dcaComparison, setDcaComparison] = useState([]);
  const [dcaDetails, setDcaDetails] = useState([]);

  const loadDCAPerformanceData = async () => {
    try {
      setLoading(true);

      // Fetch all cases from Supabase
      const { data: cases, error } = await supabase
        .from('cases')
        .select('*');

      if (error) {
        console.error('Error loading cases:', error);
        return;
      }

      // Calculate KPIs
      const totalInvoiced = cases.reduce((sum, c) => sum + (c.invoice_amount || 0), 0);
      const totalRecovered = cases.reduce((sum, c) => sum + (c.amount_recovered || 0), 0);
      const totalLiquidation = totalInvoiced > 0 ? (totalRecovered / totalInvoiced) * 100 : 0;

      const slaBreachCases = cases.filter(c => c.sla_breach_count > 0).length;
      const slaBreachRatio = cases.length > 0 ? (slaBreachCases / cases.length) * 100 : 0;

      const openCases = cases.filter(c => c.case_status === 'OPEN');
      const portfolioRiskScore = openCases.length > 0 
        ? openCases.reduce((sum, c) => sum + (c.risk_score || 0), 0) / openCases.length 
        : 0;

      // Calculate DCA Performance
      const dcaGroups = {};
      cases.forEach(c => {
        if (!dcaGroups[c.dca_id]) {
          dcaGroups[c.dca_id] = {
            dca_id: c.dca_id,
            totalCases: 0,
            totalInvoiced: 0,
            totalRecovered: 0,
            slaBreaches: 0,
            openCases: 0,
            paidCases: 0,
            avgRiskScore: 0,
            riskScoreSum: 0
          };
        }
        
        const dca = dcaGroups[c.dca_id];
        dca.totalCases++;
        dca.totalInvoiced += c.invoice_amount || 0;
        dca.totalRecovered += c.amount_recovered || 0;
        dca.slaBreaches += c.sla_breach_count > 0 ? 1 : 0;
        dca.riskScoreSum += c.risk_score || 0;
        
        if (c.case_status === 'OPEN') dca.openCases++;
        if (c.case_status === 'PAID') dca.paidCases++;
      });

      // Process DCA data for visualization
      const dcaArray = Object.values(dcaGroups).map(dca => {
        const recoveryRate = dca.totalInvoiced > 0 ? (dca.totalRecovered / dca.totalInvoiced) * 100 : 0;
        const avgRiskScore = dca.totalCases > 0 ? dca.riskScoreSum / dca.totalCases : 0;
        const slaBreachRate = dca.totalCases > 0 ? (dca.slaBreaches / dca.totalCases) * 100 : 0;
        
        return {
          ...dca,
          recoveryRate: parseFloat(recoveryRate.toFixed(2)),
          avgRiskScore: parseFloat(avgRiskScore.toFixed(2)),
          slaBreachRate: parseFloat(slaBreachRate.toFixed(2)),
          successRate: dca.totalCases > 0 ? (dca.paidCases / dca.totalCases) * 100 : 0
        };
      });

      // Find top performing agency
      const topPerformer = dcaArray.reduce((best, current) => 
        current.recoveryRate > (best?.recoveryRate || 0) ? current : best
      , null);

      setKpis({
        totalLiquidation: parseFloat(totalLiquidation.toFixed(2)),
        slaBreachRatio: parseFloat(slaBreachRatio.toFixed(2)),
        portfolioRiskScore: parseFloat(portfolioRiskScore.toFixed(2)),
        topPerformingAgency: topPerformer
      });

      setDcaComparison(dcaArray);
      setDcaDetails(dcaArray);
      setLoading(false);

    } catch (error) {
      console.error('Error calculating DCA performance:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        await loadDCAPerformanceData();
      } catch (error) {
        console.error('Error loading performance data:', error);
      }
    };
    loadData();
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
    return `${value.toFixed(2)}%`;
  };

  const getDCAColor = (slaBreachRate) => {
    if (slaBreachRate < 2) return '#4ecdc4'; // Green - Excellent
    if (slaBreachRate < 5) return '#ffe66d'; // Yellow - Good
    if (slaBreachRate < 10) return '#ff9f43'; // Orange - Warning
    return '#ff6b6b'; // Red - Critical
  };

  const getRiskColor = (riskScore) => {
    if (riskScore >= 75) return '#ff6b6b';
    if (riskScore >= 50) return '#ffe66d';
    return '#4ecdc4';
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner-large"></div>
        <p>Loading DCA Performance Analytics...</p>
      </div>
    );
  }

  return (
    <div className="dca-performance-analytics">
      <div className="analytics-header">
        <h1>DCA Performance & Analytics</h1>
        <p>Command Center - Real-time Agency Performance Monitoring</p>
      </div>

      {/* 4 Key KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card liquidation">
          <div className="kpi-icon">
            <TrendingUp size={32} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Total Liquidation Rate</div>
            <div className="kpi-value">{formatPercent(kpis.totalLiquidation)}</div>
            <div className="kpi-description">
              We have recovered {formatPercent(kpis.totalLiquidation)} of the total debt portfolio
            </div>
          </div>
        </div>

        <div className="kpi-card sla-breach">
          <div className="kpi-icon">
            <AlertTriangle size={32} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">SLA Breach Ratio</div>
            <div className="kpi-value">{formatPercent(kpis.slaBreachRatio)}</div>
            <div className="kpi-description">
              {formatPercent(kpis.slaBreachRatio)} of our cases are experiencing delays
            </div>
          </div>
        </div>

        <div className="kpi-card portfolio-risk">
          <div className="kpi-icon">
            <Target size={32} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Portfolio Risk Score (AI)</div>
            <div className="kpi-value" style={{ color: getRiskColor(kpis.portfolioRiskScore) }}>
              {kpis.portfolioRiskScore.toFixed(0)}/100
            </div>
            <div className="kpi-description">
              Current portfolio carries {kpis.portfolioRiskScore >= 75 ? 'HIGH' : kpis.portfolioRiskScore >= 50 ? 'MEDIUM' : 'LOW'} risk
            </div>
          </div>
        </div>

        <div className="kpi-card top-performer">
          <div className="kpi-icon">
            <Award size={32} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Top Performing Agency</div>
            <div className="kpi-value">{kpis.topPerformingAgency?.dca_id || 'N/A'}</div>
            <div className="kpi-description">
              {formatPercent(kpis.topPerformingAgency?.recoveryRate || 0)} recovery rate
            </div>
          </div>
        </div>
      </div>

      {/* DCA Comparison Matrix - Bubble/Scatter Chart */}
      <div className="chart-section">
        <h2>
          <BarChart3 size={24} />
          DCA Comparison Matrix
        </h2>
        <p className="chart-description">
          X-Axis: Volume of Cases • Y-Axis: Recovery Rate • Color: SLA Performance
        </p>
        
        <ResponsiveContainer width="100%" height={500}>
          <ScatterChart margin={{ top: 20, right: 30, bottom: 60, left: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3d3d3d" />
            <XAxis 
              type="number" 
              dataKey="totalCases" 
              name="Volume of Cases"
              stroke="#999"
              label={{ value: 'Volume of Cases Assigned', position: 'bottom', offset: 40, fill: '#fff' }}
            />
            <YAxis 
              type="number" 
              dataKey="recoveryRate" 
              name="Recovery Rate %"
              stroke="#999"
              label={{ value: 'Recovery Rate (%)', angle: -90, position: 'left', offset: 40, fill: '#fff' }}
            />
            <ZAxis type="number" dataKey="slaBreachRate" range={[100, 1000]} name="SLA Breach Rate" />
            <Tooltip 
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{ 
                background: 'rgba(0, 0, 0, 0.9)', 
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#fff'
              }}
              formatter={(value, name) => {
                if (name === 'Recovery Rate %' || name === 'SLA Breach Rate') {
                  return [`${value.toFixed(2)}%`, name];
                }
                return [value, name];
              }}
            />
            <Legend 
              wrapperStyle={{ color: '#fff' }}
              iconType="circle"
            />
            <Scatter 
              name="DCA Performance" 
              data={dcaComparison} 
              fill="#8884d8"
            >
              {dcaComparison.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getDCAColor(entry.slaBreachRate)}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>

        <div className="chart-legend">
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#4ecdc4' }}></div>
            <span>Excellent (&lt; 2% SLA Breach)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#ffe66d' }}></div>
            <span>Good (2-5% SLA Breach)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#ff9f43' }}></div>
            <span>Warning (5-10% SLA Breach)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#ff6b6b' }}></div>
            <span>Critical (&gt; 10% SLA Breach)</span>
          </div>
        </div>
      </div>

      {/* Recovery Rate Comparison Bar Chart */}
      <div className="chart-section">
        <h2>
          <Activity size={24} />
          Recovery Rate Comparison
        </h2>
        
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={dcaDetails} margin={{ top: 20, right: 30, bottom: 20, left: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3d3d3d" />
            <XAxis dataKey="dca_id" stroke="#999" />
            <YAxis 
              stroke="#999"
              label={{ value: 'Recovery Rate (%)', angle: -90, position: 'left', fill: '#fff' }}
            />
            <Tooltip 
              contentStyle={{ 
                background: 'rgba(0, 0, 0, 0.9)', 
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#fff'
              }}
              formatter={(value) => `${value.toFixed(2)}%`}
            />
            <Legend wrapperStyle={{ color: '#fff' }} />
            <Bar dataKey="recoveryRate" name="Recovery Rate %" fill="#4ecdc4" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed DCA Performance Table */}
      <div className="performance-table-section">
        <h2>Detailed Agency Performance</h2>
        
        <table className="performance-table">
          <thead>
            <tr>
              <th>DCA</th>
              <th>Total Cases</th>
              <th>Total Invoiced</th>
              <th>Total Recovered</th>
              <th>Recovery Rate</th>
              <th>Success Rate</th>
              <th>SLA Breaches</th>
              <th>Avg Risk Score</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {dcaDetails.map((dca) => (
              <tr key={dca.dca_id}>
                <td className="dca-name">{dca.dca_id}</td>
                <td>{dca.totalCases.toLocaleString()}</td>
                <td>{formatCurrency(dca.totalInvoiced)}</td>
                <td>{formatCurrency(dca.totalRecovered)}</td>
                <td className="recovery-rate">{formatPercent(dca.recoveryRate)}</td>
                <td>{formatPercent(dca.successRate)}</td>
                <td>
                  <span className={`breach-badge ${dca.slaBreachRate > 5 ? 'high' : 'low'}`}>
                    {dca.slaBreaches} ({formatPercent(dca.slaBreachRate)})
                  </span>
                </td>
                <td>
                  <span style={{ color: getRiskColor(dca.avgRiskScore) }}>
                    {dca.avgRiskScore.toFixed(0)}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${dca.slaBreachRate < 2 ? 'excellent' : dca.slaBreachRate < 5 ? 'good' : 'warning'}`}>
                    {dca.slaBreachRate < 2 ? 'Excellent' : dca.slaBreachRate < 5 ? 'Good' : dca.slaBreachRate < 10 ? 'Warning' : 'Critical'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DCAPerformanceAnalytics;
