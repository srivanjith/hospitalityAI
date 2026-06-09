import { useState, useEffect } from 'react';
import {
  BadgeIndianRupee,
  Calculator,
  TrendingUp,
  Clock,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Zap,
  PiggyBank,
  ArrowDownRight,
  ArrowUpRight,
  Calendar
} from 'lucide-react';
import api from '../services/api';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

// ── Hourly wage defaults per department (INR) ──────────────────────────────
const DEPT_HOURLY_WAGES = {
  'Front Desk':          120,
  'Housekeeping':         90,
  'Restaurant Services': 100,
  'Security':             80,
  'Maintenance':          85
};

const SHIFT_HOURS = { Morning: 8, Evening: 8, Night: 8 };

const DEPARTMENTS = Object.keys(DEPT_HOURLY_WAGES);

const getAttendanceStatusForDate = (emp, dateStr) => {
  const log = (emp.attendance || []).find(a => a.date === dateStr);
  return log ? log.status : 'unlogged';
};

const CostOptimization = () => {
  const [employees, setEmployees]   = useState([]);
  const [forecasts, setForecasts]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [wages, setWages]           = useState({ ...DEPT_HOURLY_WAGES });
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [staffCounts, setStaffCounts] = useState({
    'Front Desk': 0,
    'Housekeeping': 0,
    'Restaurant Services': 0,
    'Security': 0,
    'Maintenance': 0
  });
  const overtimeThreshold = 8;
  const [overtimeMultiplier, setOvertimeMultiplier] = useState(1.5);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [emps, fcs] = await Promise.all([
          api.getEmployees(),
          api.getForecast(selectedDate, 7)
        ]);
        setEmployees(emps);
        setForecasts(fcs);

        // Initialize staffCounts from active employee present counts on selectedDate
        const counts = {};
        DEPARTMENTS.forEach(dept => {
          counts[dept] = emps.filter(e => 
            e.department === dept && 
            e.status === 'active' && 
            getAttendanceStatusForDate(e, selectedDate) === 'present'
          ).length;
        });
        setStaffCounts(counts);
      } catch (err) {
        console.error('CostOpt load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedDate]);

  // ── Derived calculations ────────────────────────────────────────────────
  const activeEmployees = employees.filter(e => e.status === 'active');

  // Weekly labor cost by department calculated via user manual inputs
  const deptWeeklyCosts = DEPARTMENTS.map(dept => {
    const count = staffCounts[dept] !== undefined ? staffCounts[dept] : 0;
    const wage = wages[dept] || 0;
    const weeklyCost = count * wage * SHIFT_HOURS.Morning * 7;
    return { dept, count, weeklyCost };
  });

  const totalWeeklyCost = deptWeeklyCosts.reduce((s, d) => s + d.weeklyCost, 0);

  // Estimated optimal cost using recommended staffing from forecasts
  const avgForecast = forecasts[0] || null;
  const optimizedWeeklyCost = avgForecast
    ? DEPARTMENTS.reduce((sum, dept) => {
        const rec = avgForecast.recommendedStaff?.[dept] || 0;
        const wage = wages[dept];
        return sum + rec * SHIFT_HOURS.Morning * wage * 7;
      }, 0)
    : 0;

  const savingsVsNonOptimized = Math.max(0, totalWeeklyCost - optimizedWeeklyCost);
  const savingsPct = totalWeeklyCost > 0
    ? Math.round((savingsVsNonOptimized / totalWeeklyCost) * 100)
    : 0;

  // Monthly projections
  const monthlyActual = totalWeeklyCost * 4.33;
  const monthlyOptimized = optimizedWeeklyCost * 4.33;
  const monthlySavings = Math.max(0, monthlyActual - monthlyOptimized);

  // Overtime employees (those who worked more than threshold in attendance)
  const overtimeEmployees = activeEmployees.filter(emp => {
    const totalPresent = (emp.attendance || []).filter(a => a.status === 'present').length;
    // Simulate overtime: if they worked more than 26 standard days in a 30-day month
    return totalPresent > 26;
  });
  const overtimeCostTotal = overtimeEmployees.reduce((sum, emp) => {
    const extraDays = ((emp.attendance || []).filter(a => a.status === 'present').length) - 26;
    const dailyWage = (emp.salary || 0) / 26;
    return sum + extraDays * dailyWage * overtimeMultiplier;
  }, 0);

  // ── Chart: Weekly cost by department (Bar) ──────────────────────────────
  const barData = {
    labels: DEPARTMENTS.map(d => d.replace(' Services', '').replace('Front ', 'Front\n')),
    datasets: [
      {
        label: 'Current Weekly Cost (₹)',
        data: deptWeeklyCosts.map(d => Math.round(d.weeklyCost)),
        backgroundColor: 'rgba(212,175,55,0.8)',
        borderRadius: 6,
        borderSkipped: false
      },
      {
        label: 'Optimized Weekly Cost (₹)',
        data: DEPARTMENTS.map(dept => {
          const rec = avgForecast?.recommendedStaff?.[dept] || 0;
          return Math.round(rec * wages[dept] * SHIFT_HOURS.Morning * 7);
        }),
        backgroundColor: 'rgba(99,102,241,0.7)',
        borderRadius: 6,
        borderSkipped: false
      }
    ]
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: '#94a3b8', font: { size: 10 } } },
      tooltip: {
        backgroundColor: '#131926',
        callbacks: {
          label: ctx => ` ₹${ctx.parsed.y.toLocaleString('en-IN')}`
        }
      }
    },
    scales: {
      y: {
        ticks: {
          color: '#64748b',
          callback: v => `₹${(v / 1000).toFixed(0)}K`
        },
        grid: { color: 'rgba(255,255,255,0.04)' }
      },
      x: { ticks: { color: '#64748b', font: { size: 9 } }, grid: { display: false } }
    }
  };

  // ── Chart: Cost allocation donut ─────────────────────────────────────────
  const donutData = {
    labels: DEPARTMENTS,
    datasets: [{
      data: deptWeeklyCosts.map(d => Math.round(d.weeklyCost)),
      backgroundColor: [
        'rgba(212,175,55,0.85)',
        'rgba(99,102,241,0.85)',
        'rgba(20,184,166,0.85)',
        'rgba(239,68,68,0.75)',
        'rgba(249,115,22,0.75)'
      ],
      borderWidth: 2,
      borderColor: 'rgba(19,25,38,0.8)'
    }]
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 12 } },
      tooltip: {
        backgroundColor: '#131926',
        callbacks: {
          label: ctx => ` ₹${ctx.parsed.toLocaleString('en-IN')}/week`
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-luxury-gold mx-auto"></div>
          <p className="text-sm text-slate-500 font-mono">Computing cost and staff details....</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ── 0. Date Selector Panel ─────────────────────────────────────────── */}
      <div className="glass-panel p-6 rounded-2xl shadow-glass flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-2">
          <BadgeIndianRupee className="h-6 w-6 text-luxury-gold" />
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider dark:text-white">Cost Ledger & Labor Optimization</h3>
            <p className="text-[10px] text-slate-400">Analyze real-time present staff headcounts and labor wage expenditures</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Active Date Selector */}
          <div className="flex items-center space-x-1.5 bg-white dark:bg-luxury-dark border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5">
            <Calendar className="h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none text-xs text-slate-700 dark:text-white focus:outline-none"
            />
          </div>

          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-xs flex items-center space-x-1 dark:text-white px-3"
            title="Reset to Today"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500 mr-1" />
            <span>Today</span>
          </button>
        </div>
      </div>

      {/* ── 1. Summary KPI Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* Weekly Labor Cost */}
        <div className="glass-panel p-6 rounded-2xl shadow-glass flex items-start justify-between hover:shadow-glassGold transition-all duration-300">
          <div>
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Weekly Labor Cost</p>
            <h3 className="text-2xl font-bold font-serif mt-2 text-luxury-navy dark:text-white">
              ₹{Math.round(totalWeeklyCost).toLocaleString('en-IN')}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">
              {Object.values(staffCounts).reduce((a, b) => a + b, 0)} staff configured
            </p>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
            <BadgeIndianRupee className="h-6 w-6 text-luxury-gold" />
          </div>
        </div>

        {/* Monthly Projection */}
        <div className="glass-panel p-6 rounded-2xl shadow-glass flex items-start justify-between hover:shadow-glassGold transition-all duration-300">
          <div>
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Monthly Projection</p>
            <h3 className="text-2xl font-bold font-serif mt-2 text-luxury-navy dark:text-white">
              ₹{Math.round(monthlyActual).toLocaleString('en-IN')}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">Based on current headcount</p>
          </div>
          <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
            <Calculator className="h-6 w-6 text-indigo-400" />
          </div>
        </div>

        {/* AI Optimized Savings */}
        <div className="glass-panel p-6 rounded-2xl shadow-glass flex items-start justify-between hover:shadow-glassGold transition-all duration-300 border border-emerald-500/20">
          <div>
            <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">AI Savings Potential</p>
            <h3 className="text-2xl font-bold font-serif mt-2 text-emerald-600 dark:text-emerald-400">
              ₹{Math.round(monthlySavings).toLocaleString('en-IN')}
            </h3>
            <div className="flex items-center mt-1">
              <ArrowDownRight className="h-3 w-3 text-emerald-500 mr-1" />
              <span className="text-[10px] text-emerald-500 font-semibold">{savingsPct}% cost reduction</span>
            </div>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <PiggyBank className="h-6 w-6 text-emerald-500" />
          </div>
        </div>

        {/* Overtime Cost */}
        <div className={`glass-panel p-6 rounded-2xl shadow-glass flex items-start justify-between hover:shadow-glassGold transition-all duration-300 ${overtimeCostTotal > 0 ? 'border border-rose-500/20' : ''}`}>
          <div>
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Overtime Cost</p>
            <h3 className={`text-2xl font-bold font-serif mt-2 ${overtimeCostTotal > 0 ? 'text-rose-500' : 'text-luxury-navy dark:text-white'}`}>
              ₹{Math.round(overtimeCostTotal).toLocaleString('en-IN')}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">{overtimeEmployees.length} staff over threshold</p>
          </div>
          <div className={`p-3 rounded-xl border ${overtimeCostTotal > 0 ? 'bg-rose-500/10 border-rose-500/20' : 'bg-slate-500/10 border-slate-500/20'}`}>
            <Clock className={`h-6 w-6 ${overtimeCostTotal > 0 ? 'text-rose-500' : 'text-slate-400'}`} />
          </div>
        </div>
      </div>

      {/* ── 2. Labor Cost Formula & Settings ────────────────────────────── */}
      <div className="glass-panel p-6 rounded-2xl shadow-glass">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
            <Calculator className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold font-serif dark:text-white">Labor Cost Formula Settings</h3>
            <p className="text-xs text-slate-400">Adjust hourly wages per department to recalculate projections in real time</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DEPARTMENTS.map(dept => (
            <div key={dept} className="p-4 bg-slate-50 dark:bg-luxury-darkCard/50 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between space-y-3 hover:border-indigo-500/25 transition-colors duration-200">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold dark:text-white">{dept}</p>
                <p className="text-[10px] text-slate-400 font-mono">
                  {SHIFT_HOURS.Morning}h/shift
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col space-y-1">
                  <label className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Staff Count</label>
                  <input
                    type="number"
                    min="0"
                    value={staffCounts[dept] ?? 0}
                    onChange={e => setStaffCounts(prev => ({ ...prev, [dept]: Math.max(0, parseInt(e.target.value) || 0) }))}
                    className="w-full bg-white dark:bg-luxury-dark border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-luxury-gold text-right font-mono"
                  />
                </div>
                <div className="flex flex-col space-y-1">
                  <label className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Hourly Wage (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={wages[dept] ?? 0}
                    onChange={e => setWages(prev => ({ ...prev, [dept]: Math.max(0, Number(e.target.value) || 0) }))}
                    className="w-full bg-white dark:bg-luxury-dark border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-luxury-gold text-right font-mono"
                  />
                </div>
              </div>
            </div>
          ))}
          <div className="p-4 bg-rose-500/5 rounded-xl border border-rose-500/15 flex flex-col justify-between space-y-3 hover:border-rose-500/30 transition-colors duration-200">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-rose-500">Overtime Control</p>
              <p className="text-[10px] text-slate-400 font-mono">&gt;{overtimeThreshold}h/day</p>
            </div>
            <div className="flex flex-col space-y-1">
              <label className="text-[9px] text-rose-400 font-semibold uppercase tracking-wider">Overtime Multiplier</label>
              <input
                type="number"
                min="1"
                max="3"
                step="0.1"
                value={overtimeMultiplier}
                onChange={e => setOvertimeMultiplier(Math.max(1, Number(e.target.value) || 1.5))}
                className="w-full bg-white dark:bg-luxury-dark border border-rose-500/30 rounded-lg px-2.5 py-1.5 text-xs text-rose-500 focus:outline-none focus:border-rose-400 text-right font-mono font-bold"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Charts Row ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Bar: Current vs Optimized per dept */}
        <div className="lg:col-span-3 glass-panel p-6 rounded-2xl shadow-glass">
          <h4 className="text-sm font-bold uppercase tracking-wider dark:text-white mb-1">Dept. Cost — Current vs AI Optimized</h4>
          <p className="text-[10px] text-slate-400 mb-4">Weekly labor cost comparison based on scheduled vs. recommended headcount</p>
          <div className="h-64 relative">
            <Bar data={barData} options={barOptions} />
          </div>
        </div>

        {/* Donut: Cost allocation */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl shadow-glass flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider dark:text-white mb-1">Cost Allocation</h4>
            <p className="text-[10px] text-slate-400 mb-4">Weekly share of labor spend per department</p>
          </div>
          <div className="h-48 relative">
            <Doughnut data={donutData} options={donutOptions} />
          </div>
          <div className="mt-3 text-center">
            <p className="text-[10px] text-slate-400">Total weekly spend</p>
            <p className="text-lg font-bold font-serif dark:text-white">₹{Math.round(totalWeeklyCost).toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* ── 4. AI Savings Analysis Panel ────────────────────────────────── */}
      <div className="glass-panel p-6 rounded-2xl shadow-glass border border-emerald-500/20 bg-gradient-to-br from-emerald-500/3 to-transparent">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <Sparkles className="h-5 w-5 text-emerald-500 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-bold font-serif dark:text-white">AI Cost Optimization Analysis</h3>
            <p className="text-xs text-slate-400">Comparing current schedule vs ML-recommended optimal staffing</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Baseline */}
          <div className="p-5 bg-slate-50 dark:bg-luxury-darkCard/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center space-x-2">
              <ArrowUpRight className="h-4 w-4 text-amber-500" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500">Baseline Schedule</h4>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold font-serif dark:text-white">₹{Math.round(monthlyActual).toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-slate-400">Est. monthly at current headcount</p>
            </div>
            <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-700">
              {deptWeeklyCosts.map(d => (
                <div key={d.dept} className="flex justify-between text-[10px]">
                  <span className="text-slate-500 truncate">{d.dept}</span>
                  <span className="font-mono font-bold dark:text-slate-300">₹{Math.round(d.weeklyCost * 4.33).toLocaleString('en-IN')}/mo</span>
                </div>
              ))}
            </div>
          </div>

          {/* Optimized */}
          <div className="p-5 bg-emerald-500/5 rounded-xl border border-emerald-500/20 space-y-3">
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-emerald-500" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-500">AI-Optimized Schedule</h4>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold font-serif text-emerald-600 dark:text-emerald-400">₹{Math.round(monthlyOptimized).toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-slate-400">Est. monthly with ML-recommended staffing</p>
            </div>
            <div className="space-y-1.5 pt-2 border-t border-emerald-500/20">
              {DEPARTMENTS.map(dept => {
                const rec = avgForecast?.recommendedStaff?.[dept] || 0;
                const moCost = rec * wages[dept] * SHIFT_HOURS.Morning * 7 * 4.33;
                return (
                  <div key={dept} className="flex justify-between text-[10px]">
                    <span className="text-slate-500 truncate">{dept}</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">₹{Math.round(moCost).toLocaleString('en-IN')}/mo</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Savings breakdown */}
          <div className="p-5 bg-indigo-500/5 rounded-xl border border-indigo-500/20 space-y-3">
            <div className="flex items-center space-x-2">
              <PiggyBank className="h-4 w-4 text-indigo-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Savings Breakdown</h4>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold font-serif text-indigo-400">₹{Math.round(monthlySavings).toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-slate-400">Potential monthly reduction ({savingsPct}%)</p>
            </div>
            <div className="space-y-2 pt-2 border-t border-indigo-500/20">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-500">Monthly savings</span>
                <span className="font-mono text-emerald-500 font-bold">+ ₹{Math.round(monthlySavings).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-500">Annual savings</span>
                <span className="font-mono text-emerald-500 font-bold">+ ₹{Math.round(monthlySavings * 12).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-500">Overtime expenses</span>
                <span className={`font-mono font-bold ${overtimeCostTotal > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {overtimeCostTotal > 0 ? `- ₹${Math.round(overtimeCostTotal).toLocaleString('en-IN')}` : 'None'}
                </span>
              </div>
              <div className="flex justify-between text-[10px] pt-1 border-t border-indigo-500/20 font-bold">
                <span className="text-slate-400">Net benefit</span>
                <span className="font-mono text-luxury-gold">₹{Math.round(Math.max(0, monthlySavings - overtimeCostTotal)).toLocaleString('en-IN')}/mo</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. Department Staffing Cost Table ────────────────────────────── */}
      <div className="glass-panel rounded-2xl shadow-glass overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-bold font-serif dark:text-white">Department-Level Cost Ledger</h3>
          <p className="text-xs text-slate-400">Breakdown of current labor cost across all departments with optimization delta</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-luxury-navy dark:bg-luxury-darkCard text-luxury-gold">
                <th className="text-left px-5 py-3 font-serif font-normal">Department</th>
                <th className="text-center px-5 py-3 font-serif font-normal">Headcount</th>
                <th className="text-center px-5 py-3 font-serif font-normal">Hourly Rate</th>
                <th className="text-right px-5 py-3 font-serif font-normal">Daily Cost</th>
                <th className="text-right px-5 py-3 font-serif font-normal">Weekly Cost</th>
                <th className="text-right px-5 py-3 font-serif font-normal">Monthly Cost</th>
                <th className="text-center px-5 py-3 font-serif font-normal">Recommended</th>
                <th className="text-center px-5 py-3 font-serif font-normal">Δ vs Optimal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {DEPARTMENTS.map(dept => {
                const d = deptWeeklyCosts.find(x => x.dept === dept);
                const rec = avgForecast?.recommendedStaff?.[dept] || 0;
                const gap = (d?.count || 0) - rec;
                const dailyCost = (d?.count || 0) * wages[dept] * SHIFT_HOURS.Morning;
                const weeklyCost = dailyCost * 7;
                const monthlyCost = weeklyCost * 4.33;

                return (
                  <tr key={dept} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors duration-150">
                    <td className="px-5 py-4 font-semibold dark:text-white">{dept}</td>
                    <td className="px-5 py-4 text-center font-mono dark:text-slate-300">{d?.count || 0}</td>
                    <td className="px-5 py-4 text-center font-mono text-luxury-goldDark dark:text-luxury-gold">₹{wages[dept]}/hr</td>
                    <td className="px-5 py-4 text-right font-mono dark:text-slate-300">₹{Math.round(dailyCost).toLocaleString('en-IN')}</td>
                    <td className="px-5 py-4 text-right font-mono dark:text-slate-300">₹{Math.round(weeklyCost).toLocaleString('en-IN')}</td>
                    <td className="px-5 py-4 text-right font-mono font-bold dark:text-white">₹{Math.round(monthlyCost).toLocaleString('en-IN')}</td>
                    <td className="px-5 py-4 text-center font-mono text-indigo-400">{rec}</td>
                    <td className="px-5 py-4 text-center">
                      {gap === 0 ? (
                        <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full font-semibold text-[10px] inline-flex items-center space-x-1">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Optimal</span>
                        </span>
                      ) : gap > 0 ? (
                        <span className="px-2.5 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full font-semibold text-[10px] inline-flex items-center space-x-1">
                          <TrendingUp className="h-3 w-3" />
                          <span>+{gap} over</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-full font-semibold text-[10px] inline-flex items-center space-x-1">
                          <AlertTriangle className="h-3 w-3" />
                          <span>{gap} short</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-luxury-navy dark:bg-luxury-darkCard/80 text-luxury-gold font-bold">
                <td className="px-5 py-3 font-serif">Total</td>
                <td className="px-5 py-3 text-center font-mono">
                  {Object.values(staffCounts).reduce((a, b) => a + b, 0)}
                </td>
                <td className="px-5 py-3"></td>
                <td className="px-5 py-3 text-right font-mono">₹{Math.round(totalWeeklyCost / 7).toLocaleString('en-IN')}</td>
                <td className="px-5 py-3 text-right font-mono">₹{Math.round(totalWeeklyCost).toLocaleString('en-IN')}</td>
                <td className="px-5 py-3 text-right font-mono">₹{Math.round(monthlyActual).toLocaleString('en-IN')}</td>
                <td className="px-5 py-3"></td>
                <td className="px-5 py-3 text-center text-emerald-400 font-mono text-[10px]">₹{Math.round(monthlySavings).toLocaleString('en-IN')} saved</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── 6. Overtime Tracker ──────────────────────────────────────────── */}
      <div className="glass-panel p-6 rounded-2xl shadow-glass">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl border ${overtimeEmployees.length > 0 ? 'bg-rose-500/10 border-rose-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
              <Clock className={`h-5 w-5 ${overtimeEmployees.length > 0 ? 'text-rose-500' : 'text-emerald-500'}`} />
            </div>
            <div>
              <h3 className="text-lg font-bold font-serif dark:text-white">Overtime Control Tracker</h3>
              <p className="text-xs text-slate-400">Employees who exceeded the {overtimeThreshold}h/day attendance threshold this month</p>
            </div>
          </div>
          {overtimeEmployees.length > 0 && (
            <span className="text-xs font-bold px-3 py-1 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-full">
              {overtimeEmployees.length} flagged
            </span>
          )}
        </div>

        {overtimeEmployees.length === 0 ? (
          <div className="p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-center space-x-3 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            <span>No overtime detected. All staff attendance is within the {overtimeThreshold}h daily threshold.</span>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-luxury-darkCard border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="text-left px-4 py-3">Employee</th>
                  <th className="text-left px-4 py-3">Department</th>
                  <th className="text-left px-4 py-3">Shift</th>
                  <th className="text-center px-4 py-3">Days Attended</th>
                  <th className="text-center px-4 py-3">Extra Days</th>
                  <th className="text-right px-4 py-3">Overtime Pay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {overtimeEmployees.map((emp, i) => {
                  const attended = (emp.attendance || []).filter(a => a.status === 'present').length;
                  const extraDays = attended - 26;
                  const dailyWage = (emp.salary || 0) / 26;
                  const overtimePay = extraDays * dailyWage * overtimeMultiplier;
                  return (
                    <tr key={emp.id || emp._id || i} className="hover:bg-rose-500/3 dark:hover:bg-rose-500/5 transition-colors duration-150">
                      <td className="px-4 py-3 font-semibold dark:text-white">{emp.name}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{emp.department}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-[10px] font-medium">{emp.shift}</span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-rose-500 font-bold">{attended}</td>
                      <td className="px-4 py-3 text-center font-mono text-amber-500">+{extraDays}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-rose-500">₹{Math.round(overtimePay).toLocaleString('en-IN')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CostOptimization;
