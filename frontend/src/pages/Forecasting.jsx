import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle, 
  CheckCircle, 
  Undo,
  Brain,
  Calendar,
  RefreshCw,
  Cpu,
  SlidersHorizontal,
  Flame,
  CloudRain,
  Sun,
  Snowflake
} from 'lucide-react';
import api from '../services/api';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Forecasting = () => {
  const [forecasts, setForecasts] = useState([]);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [forecastDays, setForecastDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [expandedDate, setExpandedDate] = useState(null);
  const [optimizingDate, setOptimizingDate] = useState(null);

  // ── ML Model & Input Factor States ────────────────────────────────────
  const ML_MODELS = [
    { id: 'linear',  label: 'Linear Regression', color: 'text-luxury-gold',  badge: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',  desc: 'Fast, interpretable. Uses historical trend + seasonality.' },
    { id: 'rf',      label: 'Random Forest',      color: 'text-emerald-500', badge: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400', desc: 'Ensemble of decision trees. Captures non-linear patterns.' },
    { id: 'xgb',     label: 'XGBoost',            color: 'text-indigo-400',  badge: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400',  desc: 'Gradient boosting. Best for tabular structured data.' },
    { id: 'lstm',    label: 'LSTM Neural Net',     color: 'text-rose-400',   badge: 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400',         desc: 'Deep learning sequence model. Ideal for long-range patterns.' },
  ];
  const SEASONS = [
    { id: 'summer',  label: 'Summer',  icon: Sun,       factor: 1.15 },
    { id: 'winter',  label: 'Winter',  icon: Snowflake, factor: 0.90 },
    { id: 'monsoon', label: 'Monsoon', icon: CloudRain, factor: 0.80 },
    { id: 'holiday', label: 'Holidays', icon: Flame,    factor: 1.25 },
  ];

  const [selectedModel, setSelectedModel] = useState('lstm');
  const [selectedSeason, setSelectedSeason] = useState('summer');
  const [festivalActive, setFestivalActive] = useState(false);
  const [cancellationRate, setCancellationRate] = useState(10);

  // Effective multiplier for display (does NOT mutate backend forecasts)
  const modelMultipliers = { linear: 1.00, rf: 1.03, xgb: 1.05, lstm: 1.08 };
  const seasonFactor = SEASONS.find(s => s.id === selectedSeason)?.factor || 1;
  const festivalFactor = festivalActive ? 1.12 : 1;
  const cancellationFactor = 1 - (cancellationRate / 100);
  const effectiveMultiplier = modelMultipliers[selectedModel] * seasonFactor * festivalFactor * cancellationFactor;

  const adjustedForecasts = forecasts.map(f => ({
    ...f,
    predictedOccupancy: Math.min(100, Math.round(f.predictedOccupancy * effectiveMultiplier * 10) / 10)
  }));

  const loadForecast = async () => {
    try {
      setLoading(true);
      const data = await api.getForecast(startDate, forecastDays);
      setForecasts(data);
      if (data.length > 0 && !expandedDate) {
        setExpandedDate(data[0].date); // Expand first date by default
      }
    } catch (err) {
      console.error('Error loading forecasts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadForecast();
  }, [startDate, forecastDays]);

  const handleOptimize = async (dateStr) => {
    try {
      setOptimizingDate(dateStr);
      await api.optimizeShifts(dateStr);
      // Reload forecast to show adjusted scheduled staff
      const updated = await api.getForecast(startDate, forecastDays);
      setForecasts(updated);
    } catch (err) {
      alert(`Shift optimization failed: ${err.message}`);
    } finally {
      setOptimizingDate(null);
    }
  };

  // Compile general AI recommendations from all forecast insights
  const compileGlobalRecommendations = () => {
    const holidayAlerts = [];
    const shortageAlerts = [];
    const surplusAlerts = [];

    forecasts.forEach(f => {
      // Find holidays
      const holInsight = f.insights.find(i => i.toLowerCase().includes('holiday') || i.toLowerCase().includes('festival'));
      if (holInsight && !holidayAlerts.includes(holInsight)) {
        holidayAlerts.push(holInsight);
      }

      // Check staffing gaps
      const rec = f.recommendedStaff;
      const act = f.actualStaffScheduled;
      if (rec && act) {
        Object.keys(rec).forEach(dept => {
          const rCount = rec[dept];
          const aCount = act[dept] || 0;
          if (aCount < rCount) {
            shortageAlerts.push(`${dept} understaffed on ${f.date} (${aCount}/${rCount} scheduled)`);
          } else if (aCount > rCount + 2) {
            surplusAlerts.push(`${dept} overstaffed on ${f.date} (${aCount}/${rCount} scheduled)`);
          }
        });
      }
    });

    return { holidayAlerts, shortageAlerts, surplusAlerts };
  };

  const { holidayAlerts, shortageAlerts, surplusAlerts } = compileGlobalRecommendations();

  // Chart configuration: Daily forecast occupancy
  const lineChartData = {
    labels: adjustedForecasts.map(f => {
      const d = new Date(f.date);
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
    }),
    datasets: [
      {
        label: `${ML_MODELS.find(m => m.id === selectedModel)?.label} — Predicted Occupancy %`,
        data: adjustedForecasts.map(f => f.predictedOccupancy),
        borderColor: selectedModel === 'linear' ? '#d4af37' : selectedModel === 'rf' ? '#10b981' : selectedModel === 'xgb' ? '#818cf8' : '#f43f5e',
        backgroundColor: selectedModel === 'linear' ? 'rgba(212,175,55,0.05)' : selectedModel === 'rf' ? 'rgba(16,185,129,0.05)' : selectedModel === 'xgb' ? 'rgba(129,140,248,0.05)' : 'rgba(244,63,94,0.05)',
        borderWidth: 2,
        tension: 0.3,
        fill: true,
        pointBackgroundColor: selectedModel === 'linear' ? '#d4af37' : selectedModel === 'rf' ? '#10b981' : selectedModel === 'xgb' ? '#818cf8' : '#f43f5e'
      }
    ]
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#131926',
        titleFont: { family: 'Playfair Display' },
        bodyFont: { family: 'Inter' }
      }
    },
    scales: {
      y: { min: 0, max: 100, ticks: { color: '#64748b' } },
      x: { grid: { display: false }, ticks: { color: '#64748b' } }
    }
  };

  // Staffing summary chart configuration
  const staffChartData = {
    labels: adjustedForecasts.map(f => {
      const d = new Date(f.date);
      return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
    }),
    datasets: [
      {
        label: 'Recommended Staff',
        data: adjustedForecasts.map(f => Object.values(f.recommendedStaff || {}).reduce((a, b) => a + b, 0)),
        backgroundColor: '#1e293b',
        borderRadius: 4
      },
      {
        label: 'Actual Scheduled Staff',
        data: adjustedForecasts.map(f => Object.values(f.actualStaffScheduled || {}).reduce((a, b) => a + b, 0)),
        backgroundColor: '#d4af37',
        borderRadius: 4
      }
    ]
  };

  const staffChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#64748b', font: { family: 'Inter', size: 10 } }
      },
      tooltip: {
        backgroundColor: '#131926'
      }
    },
    scales: {
      y: { ticks: { color: '#64748b' } },
      x: { grid: { display: false }, ticks: { color: '#64748b' } }
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-luxury-gold mx-auto"></div>
          <p className="text-sm text-slate-500 font-mono">Running Holt-Winters Forecasting Algorithms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* 1. Filters & Search controls */}
      <div className="glass-panel p-6 rounded-2xl shadow-glass flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-2">
          <Brain className="h-6 w-6 text-luxury-gold" />
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider dark:text-white">Forecasting Parameters</h3>
            <p className="text-[10px] text-slate-400">Configure range parameters for the ML regression models</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Start Date */}
          <div className="flex items-center space-x-1.5 bg-white dark:bg-luxury-dark border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5">
            <Calendar className="h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent border-none text-xs text-slate-700 dark:text-white focus:outline-none"
            />
          </div>

          {/* Days Select */}
          <select
            value={forecastDays}
            onChange={(e) => setForecastDays(Number(e.target.value))}
            className="bg-white dark:bg-luxury-dark border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-700 dark:text-white focus:outline-none"
          >
            <option value="7">7 Days Ahead</option>
            <option value="15">15 Days Ahead</option>
            <option value="30">30 Days Ahead</option>
          </select>

          <button
            onClick={loadForecast}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            title="Refresh Models"
          >
            <RefreshCw className="h-4 w-4 text-slate-500" />
          </button>
        </div>
      </div>

      {/* 1b. ML Model Selector + Input Factors Panel */}
      <div className="glass-panel p-6 rounded-2xl shadow-glass border border-indigo-500/15 bg-gradient-to-br from-indigo-500/3 to-transparent">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
            <Cpu className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider dark:text-white">ML Engine Configuration</h3>
            <p className="text-[10px] text-slate-400">Forecasting engine </p>
          </div>
          <div className="ml-auto">
            <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${
              ML_MODELS.find(m => m.id === selectedModel)?.badge
            }`}>
              {ML_MODELS.find(m => m.id === selectedModel)?.label} Active
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Season Selector */}
          <div className="p-4 bg-slate-50 dark:bg-luxury-darkCard/50 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">Season Demand Shift</p>
              <label className="text-[10px] text-slate-400 block mb-2">
                Active Season <span className="text-luxury-gold font-bold">({(seasonFactor * 100 - 100).toFixed(0) >= 0 ? '+' : ''}{(seasonFactor * 100 - 100).toFixed(0)}% demand shift)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SEASONS.map(s => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSeason(s.id)}
                      className={`flex flex-col items-center py-2 rounded-lg border text-[10px] font-semibold transition-all cursor-pointer ${
                        selectedSeason === s.id
                          ? 'bg-luxury-gold/10 border-luxury-gold/50 text-luxury-gold'
                          : 'border-slate-200 dark:border-slate-850 text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <Icon className="h-4 w-4 mb-0.5" />
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Environmental Events & Combined Multiplier */}
          <div className="flex flex-col justify-between space-y-4">
            {/* Festival toggle */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-luxury-darkCard/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-xs font-bold dark:text-white">Local Festival / Event</p>
                <p className="text-[10px] text-slate-400">Adds +12% demand boost when active</p>
              </div>
              <button
                onClick={() => setFestivalActive(p => !p)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer ${
                  festivalActive ? 'bg-luxury-gold' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                  festivalActive ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Combined occupancy adjustment pill */}
            <div className="flex flex-col justify-center p-3 bg-indigo-500/5 border border-indigo-500/15 rounded-xl space-y-1 h-full">
              <span className="text-[9px] text-indigo-400 uppercase font-semibold tracking-wider">Combined Demand Modifier</span>
              <span className={`text-base font-bold font-mono ${
                effectiveMultiplier >= 1 ? 'text-emerald-500' : 'text-rose-400'
              }`}>
                {effectiveMultiplier >= 1 ? '+' : ''}{((effectiveMultiplier - 1) * 100).toFixed(1)}% demand target
              </span>
            </div>
          </div>

          {/* Cancellation Risk */}
          <div className="p-4 bg-slate-50 dark:bg-luxury-darkCard/50 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">Booking Cancellation Risk</p>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold dark:text-white">Cancellation Rate</p>
                <span className="text-sm font-bold font-mono text-rose-500">{cancellationRate}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                step="1"
                value={cancellationRate}
                onChange={e => setCancellationRate(Number(e.target.value))}
                className="w-full h-1.5 rounded-full accent-luxury-gold cursor-pointer"
              />
            </div>
            <div className="flex justify-between text-[9px] text-slate-400 mt-2">
              <span>0% (No cancellations)</span>
              <span>40% (High risk)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Global AI Recommendations Insight Card */}
      <div className="glass-panel p-6 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-luxury-gold/5 shadow-glass">
        <div className="flex items-center space-x-2 mb-4">
          <Sparkles className="h-5 w-5 text-luxury-gold animate-pulse" />
          <h3 className="font-serif text-lg font-bold text-luxury-goldDark dark:text-luxury-gold">Actionable AI Insights</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Holidays */}
          <div className="space-y-2 border-r border-slate-200/50 dark:border-slate-800 pr-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Demand Modifiers</h4>
            {holidayAlerts.length === 0 ? (
              <p className="text-xs text-slate-400">No holiday spikes or event surges forecasted in this window.</p>
            ) : (
              <ul className="space-y-1">
                {holidayAlerts.map((h, i) => (
                  <li key={i} className="text-xs text-slate-600 dark:text-slate-300 list-disc list-inside">{h}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Understaffing */}
          <div className="space-y-2 border-r border-slate-200/50 dark:border-slate-800 px-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-500">Shortage Risks</h4>
            {shortageAlerts.length === 0 ? (
              <p className="text-xs text-emerald-500 font-semibold flex items-center">
                <CheckCircle className="h-3 w-3 mr-1" /> No understaffing risks!
              </p>
            ) : (
              <ul className="space-y-1">
                {shortageAlerts.slice(0, 3).map((s, i) => (
                  <li key={i} className="text-xs text-rose-600 dark:text-rose-400 list-disc list-inside truncate" title={s}>{s}</li>
                ))}
                {shortageAlerts.length > 3 && <li className="text-[10px] text-slate-400">+ {shortageAlerts.length - 3} more shortage points</li>}
              </ul>
            )}
          </div>

          {/* Overstaffing */}
          <div className="space-y-2 pl-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500">Labor Leakage</h4>
            {surplusAlerts.length === 0 ? (
              <p className="text-xs text-slate-400">Labor costs optimized. No budget leaks detected.</p>
            ) : (
              <ul className="space-y-1">
                {surplusAlerts.slice(0, 3).map((s, i) => (
                  <li key={i} className="text-xs text-amber-600 dark:text-amber-400 list-disc list-inside truncate" title={s}>{s}</li>
                ))}
                {surplusAlerts.length > 3 && <li className="text-[10px] text-slate-400">+ {surplusAlerts.length - 3} more overstaffing points</li>}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* 3. Dual Chart Visual Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Occupancy curve */}
        <div className="glass-panel p-6 rounded-2xl shadow-glass">
          <h4 className="text-sm font-bold uppercase tracking-wider dark:text-white mb-4">Occupancy Curve Forecast</h4>
          <div className="h-60 relative">
            <Line data={lineChartData} options={lineChartOptions} />
          </div>
        </div>

        {/* Staff comparison */}
        <div className="glass-panel p-6 rounded-2xl shadow-glass">
          <h4 className="text-sm font-bold uppercase tracking-wider dark:text-white mb-4">Recommended vs Scheduled Staff Load</h4>
          <div className="h-60 relative">
            <Bar data={staffChartData} options={staffChartOptions} />
          </div>
        </div>
      </div>

      {/* 4. Forecast Accordion Schedule list */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold font-serif dark:text-white">Day-by-Day Forecast Balancing Log</h3>
        
        {adjustedForecasts.map((f) => {
          const isExpanded = expandedDate === f.date;
          const totalRec = Object.values(f.recommendedStaff || {}).reduce((a, b) => a + b, 0);
          const totalAct = Object.values(f.actualStaffScheduled || {}).reduce((a, b) => a + b, 0);
          const isBalanced = totalAct >= totalRec && totalAct <= totalRec + 2;

          return (
            <div
              key={f.date}
              className={`glass-panel rounded-xl overflow-hidden shadow-glass transition-all duration-200 border ${
                isExpanded ? 'border-luxury-gold/50 dark:border-luxury-gold/30' : 'border-transparent'
              }`}
            >
              {/* Header card click toggle */}
              <button
                onClick={() => setExpandedDate(isExpanded ? null : f.date)}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center space-x-4">
                  <div>
                    <span className="text-sm font-bold dark:text-white">
                      {new Date(f.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                    <span className="text-xs text-slate-400 block mt-0.5">
                      Predicted Occupancy: <span className="font-bold text-luxury-goldDark dark:text-luxury-gold">{f.predictedOccupancy}%</span> ({f.predictedGuests} expected guests)
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  {/* Status indicator badge */}
                  <div>
                    {f.optimized ? (
                      <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center">
                        <CheckCircle className="h-3 w-3 mr-0.5" />
                        <span>AI Balanced</span>
                      </span>
                    ) : isBalanced ? (
                      <span className="text-[10px] font-bold bg-slate-500/10 text-slate-500 border border-slate-500/20 px-2 py-0.5 rounded-full flex items-center">
                        <CheckCircle className="h-3 w-3 mr-0.5" />
                        <span>Balanced</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full flex items-center">
                        <AlertTriangle className="h-3 w-3 mr-0.5" />
                        <span>Mismatch</span>
                      </span>
                    )}
                  </div>
                  {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                </div>
              </button>

              {/* Expandable details panel */}
              {isExpanded && (
                <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-luxury-darkCard/20 space-y-4 animate-fade-in">
                  
                  {/* Department columns */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                    {Object.keys(f.recommendedStaff || {}).map(dept => {
                      const rec = f.recommendedStaff[dept];
                      const act = f.actualStaffScheduled[dept] || 0;
                      
                      return (
                        <div key={dept} className="p-3 bg-white dark:bg-luxury-darkCard border border-slate-100 dark:border-slate-800 rounded-xl">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">{dept}</span>
                          <div className="flex items-baseline space-x-1 mt-1">
                            <span className="text-xl font-bold dark:text-white">{act}</span>
                            <span className="text-xs text-slate-400 font-medium">/ {rec} recommended</span>
                          </div>
                          {/* Gap bar */}
                          <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${act < rec ? 'bg-rose-500' : act > rec + 2 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(100, (act / rec) * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Actions & Insights box */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
                    <div className="flex-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Recommended Adjustments</span>
                      {f.insights.map((insight, idx) => (
                        <p key={idx} className="text-xs text-slate-600 dark:text-slate-350 flex items-start space-x-1.5 mt-1 leading-relaxed">
                          <Sparkles className="h-3.5 w-3.5 text-luxury-gold mt-0.5 flex-shrink-0" />
                          <span>{insight}</span>
                        </p>
                      ))}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleOptimize(f.date)}
                        disabled={optimizingDate === f.date}
                        className="btn-gold text-xs py-2 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Sparkles className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: '3s' }} />
                        <span>{optimizingDate === f.date ? 'Balancing...' : 'Auto-Optimize Shifts'}</span>
                      </button>
                    </div>
                  </div>

                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Forecasting;
