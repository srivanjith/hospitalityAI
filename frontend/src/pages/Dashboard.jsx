import { useState, useEffect } from 'react';
import { 
  DoorOpen, 
  Percent, 
  BadgeIndianRupee, 
  UsersRound, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  BrainCircuit,
  Flag,
  MessageSquareWarning,
  User,
  BedDouble,
  Wrench,
  Clock4,
  Lightbulb,
  BarChart2,
  Target,
  Calendar,
  Star,
  MessageSquare
} from 'lucide-react';
import api from '../services/api';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
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
  Title,
  Tooltip,
  Legend,
  Filler
);

const Dashboard = ({ setCurrentPage }) => {
  const [stats, setStats] = useState({
    totalRooms: 500,
    occupiedRooms: 0,
    availableRooms: 500,
    occupancyRate: 0,
    monthlyRevenue: 0,
    staffUtilization: 0
  });
  const [forecast7Days, setForecast7Days] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [staffReports, setStaffReports] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [occupancySuggestion, setOccupancySuggestion] = useState(null);
  const [suggestionLoading, setSuggestionLoading] = useState(true);
  const [suggestionError, setSuggestionError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const todayStr = new Date().toISOString().split('T')[0];

        // 1. Fetch Occupancy Analytics (last 30 days)
        const analytics = await api.getOccupancyAnalytics(30);
        
        // 2. Fetch 7-day forecast
        const forecast = await api.getForecast(todayStr, 7);
        setForecast7Days(forecast);
        
        // 3. Fetch active alerts/notifications
        const notifications = await api.getNotifications();
        // filter for recent unread alerts matching today's alerts or high priority
        setAlerts(notifications.filter(n => !n.read && (n.type === 'staffing' || n.type === 'high-demand')).slice(0, 4));

        // 4. Calculate dynamic stats
        const todayForecast = forecast[0] || {
          roomsOccupied: 0,
          predictedOccupancy: 0,
          recommendedStaff: {},
          actualStaffScheduled: {}
        };

        const totalRooms = 500;
        const occupied = todayForecast.roomsOccupied || 0;
        const available = totalRooms - occupied;
        const rate = todayForecast.predictedOccupancy || 0;

        // Calculate staff utilization: ratio of scheduled to recommended staff
        const recSum = Object.values(todayForecast.recommendedStaff || {}).reduce((a, b) => a + b, 0);
        const actSum = Object.values(todayForecast.actualStaffScheduled || {}).reduce((a, b) => a + b, 0);
        const utilRate = recSum > 0 ? Math.min(100, Math.round((actSum / recSum) * 100)) : 80;

        setStats({
          totalRooms,
          occupiedRooms: occupied,
          availableRooms: available,
          occupancyRate: rate,
          monthlyRevenue: analytics.summary.totalRevenue,
          staffUtilization: utilRate
        });

        // 5. Fetch guest staff reports
        try {
          const reports = await api.getStaffReports();
          setStaffReports(reports || []);
        } catch {
          // Non-critical
        }

        // Fetch guest feedbacks
        try {
          const feedbacksData = await api.getFeedbacks();
          setFeedbacks(feedbacksData || []);
        } catch {
          // Non-critical
        }

        // 6. Fetch occupancy suggestion (independent — has its own loading state)
        setSuggestionLoading(true);
        setSuggestionError('');
        api.getOccupancySuggestion()
          .then(data => {
            setOccupancySuggestion(data);
            setSuggestionLoading(false);
          })
          .catch(err => {
            setSuggestionError(err.message || 'Could not load suggestion data');
            setSuggestionLoading(false);
          });
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // Forecast Chart configuration
  const chartData = {
    labels: forecast7Days.map(f => {
      const d = new Date(f.date);
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }),
    datasets: [
      {
        label: 'Forecasted Occupancy %',
        data: forecast7Days.map(f => f.predictedOccupancy),
        borderColor: '#d4af37',
        backgroundColor: 'rgba(212, 175, 55, 0.08)',
        borderWidth: 2,
        tension: 0.35,
        fill: true,
        pointBackgroundColor: '#d4af37',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#d4af37',
        pointHoverBorderWidth: 2,
        pointRadius: 4,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: '#131926',
        titleFont: { family: 'Playfair Display' },
        bodyFont: { family: 'Inter' },
        borderColor: 'rgba(212, 175, 55, 0.2)',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (context) => ` Occupancy: ${context.parsed.y}%`
        }
      }
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        grid: {
          color: 'rgba(255, 255, 255, 0.03)'
        },
        ticks: {
          color: '#64748b',
          font: { family: 'Inter', size: 10 }
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: '#64748b',
          font: { family: 'Inter', size: 10 }
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-luxury-gold mx-auto"></div>
          <p className="text-sm text-slate-500 font-mono">Syncing Analytics...</p>
        </div>
      </div>
    );
  }

  const todayForecast = forecast7Days[0] || {};
  const depts = todayForecast.recommendedStaff ? Object.keys(todayForecast.recommendedStaff) : [];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 1. Key Statistics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Occupancy Rate */}
        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between shadow-glass hover:shadow-glassGold transition-all duration-300">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Occupancy Rate</p>
            <h3 className="text-2xl font-bold font-serif mt-2 text-luxury-navy dark:text-white">{stats.occupancyRate}%</h3>
            <span className="text-[10px] text-emerald-500 font-semibold flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-0.5" />
              <span>Optimal target range</span>
            </span>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
            <Percent className="h-6 w-6 text-luxury-gold" />
          </div>
        </div>

        {/* Room Status */}
        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between shadow-glass hover:shadow-glassGold transition-all duration-300">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Rooms Logged</p>
            <h3 className="text-2xl font-bold font-serif mt-2 text-luxury-navy dark:text-white">
              {stats.occupiedRooms} <span className="text-sm font-sans font-normal text-slate-455">/ {stats.totalRooms}</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">{stats.availableRooms} rooms available tonight</p>
          </div>
          <div className="p-3 bg-slate-500/10 rounded-xl border border-slate-500/20">
            <DoorOpen className="h-6 w-6 text-slate-500" />
          </div>
        </div>

        {/* Monthly Revenue */}
        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between shadow-glass hover:shadow-glassGold transition-all duration-300">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Month-to-Date Revenue</p>
            <h3 className="text-2xl font-bold font-serif mt-2 text-luxury-navy dark:text-white">
              ₹{stats.monthlyRevenue.toLocaleString()}
            </h3>
            <p className="text-[10px] text-emerald-500 font-semibold mt-1">Including dine-in add-ons</p>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <BadgeIndianRupee className="h-6 w-6 text-emerald-500" />
          </div>
        </div>

        {/* Staff Utilization */}
        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between shadow-glass hover:shadow-glassGold transition-all duration-300">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Staff Utilization</p>
            <h3 className="text-2xl font-bold font-serif mt-2 text-luxury-navy dark:text-white">{stats.staffUtilization}%</h3>
            <p className="text-[10px] text-slate-400 mt-1">Optimal: 80% to 100%</p>
          </div>
          <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
            <UsersRound className="h-6 w-6 text-indigo-500" />
          </div>
        </div>
      </div>

      {/* 2. Main Dashboard Content splits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: 7-Day Forecast Chart */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl shadow-glass flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold font-serif dark:text-white">7-Day Occupancy Forecast</h3>
              <p className="text-xs text-slate-400">Predicted daily hotel booking ratios generated by Holt-Winters ML Engine</p>
            </div>
            <button
              onClick={() => setCurrentPage('forecasting')}
              className="text-xs text-luxury-gold hover:text-luxury-goldDark font-semibold flex items-center hover:underline cursor-pointer"
            >
              <span>Detailed ML View</span>
              <ChevronRight className="h-4 w-4 ml-0.5" />
            </button>
          </div>
          <div className="h-72 relative">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* Right 1 Col: Urgent Staffing balancing panel */}
        <div className="glass-panel p-6 rounded-2xl shadow-glass flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold font-serif dark:text-white">Today's Staff Balancing</h3>
            <p className="text-xs text-slate-400 mb-4">Comparison of recommended vs scheduled employees</p>
            
            <div className="space-y-3">
              {depts.map(dept => {
                const rec = todayForecast.recommendedStaff[dept] || 0;
                const act = todayForecast.actualStaffScheduled[dept] || 0;
                const gap = act - rec;
                
                return (
                  <div key={dept} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-luxury-darkCard/50 border border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-xs font-semibold block dark:text-white">{dept}</span>
                      <span className="text-[10px] text-slate-400">Rec: {rec} | Scheduled: {act}</span>
                    </div>
                    <div>
                      {gap < 0 ? (
                        <span className="text-[10px] font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20 px-2.5 py-1 rounded-full flex items-center">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          <span>Shortage ({Math.abs(gap)})</span>
                        </span>
                      ) : gap > 2 ? (
                        <span className="text-[10px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-1 rounded-full flex items-center">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          <span>Surplus (+{gap})</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2.5 py-1 rounded-full flex items-center">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          <span>Optimized</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <button
            onClick={() => setCurrentPage('forecasting')}
            className="w-full mt-4 bg-slate-100 dark:bg-slate-800 hover:bg-luxury-gold hover:text-luxury-navy dark:hover:bg-luxury-gold font-bold text-xs py-2.5 rounded-lg text-slate-700 dark:text-slate-300 transition-all cursor-pointer flex items-center justify-center space-x-1"
          >
            <BrainCircuit className="h-4 w-4" />
            <span>Balance Shifts via AI</span>
          </button>
        </div>
      </div>

      {/* 3. Occupancy Suggestion Card */}
      <div className="glass-panel p-6 rounded-2xl shadow-glass border border-indigo-500/10">
        {/* Card Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-600/15 border border-indigo-500/20">
              <Lightbulb className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-serif dark:text-white flex items-center gap-2">
                Occupancy Suggestion
                <span className="text-[10px] font-mono font-normal bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {(() => {
                    const m = new Date().getMonth();
                    if (m >= 2 && m <= 4) return 'Spring Season';
                    if (m >= 5 && m <= 7) return 'Summer Season';
                    if (m >= 8 && m <= 10) return 'Festival Season';
                    return 'Peak Winter Season';
                  })()}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Current prediction validated against same-period last year actuals
              </p>
            </div>
          </div>
          {occupancySuggestion?.modelAccuracy != null && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <Target className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {occupancySuggestion.modelAccuracy}% Model Accuracy
              </span>
            </div>
          )}
        </div>

        {/* Loading state */}
        {suggestionLoading ? (
          <div className="flex items-center justify-center gap-3 py-10 text-slate-400">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-400" />
            <span className="text-sm">Analysing last year's occupancy data…</span>
          </div>

        /* Error state */
        ) : suggestionError ? (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 text-rose-500">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold">Could not load suggestion data</p>
              <p className="text-xs text-rose-400 mt-0.5">{suggestionError}</p>
            </div>
          </div>

        /* No data state */
        ) : !occupancySuggestion ? (
          <div className="text-center py-10 text-slate-400">
            <BarChart2 className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">No historical data available</p>
            <p className="text-xs mt-1">Run the AI Data Seeder (admin) to populate last year&apos;s data.</p>
          </div>

        /* Data loaded — full display */
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Today: Prediction vs Last Year */}
            <div className="md:col-span-1 space-y-3">
              
              {/* Current Prediction */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-indigo-500/15">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 flex items-center gap-1">
                  <BrainCircuit className="h-3 w-3 text-indigo-400" /> Today's AI Prediction
                </p>
                <p className="text-3xl font-bold font-serif text-indigo-600 dark:text-indigo-300">
                  {occupancySuggestion.todayPrediction}%
                </p>
                <p className="text-xs text-slate-400 mt-1">Forecasted occupancy for today</p>
              </div>

              {/* Last Year Same Day */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Last Year ({occupancySuggestion.lastYearSameDayDate})
                </p>
                {occupancySuggestion.lastYearSameDay != null ? (
                  <>
                    <p className="text-3xl font-bold font-serif text-slate-700 dark:text-slate-200">
                      {occupancySuggestion.lastYearSameDay}%
                    </p>
                    <div className={`text-xs font-semibold mt-1 flex items-center gap-1 ${
                      occupancySuggestion.trend === 'up' ? 'text-emerald-500'
                      : occupancySuggestion.trend === 'down' ? 'text-rose-500'
                      : 'text-slate-400'
                    }`}>
                      {occupancySuggestion.trend === 'up' && <TrendingUp className="h-3.5 w-3.5" />}
                      {occupancySuggestion.trend === 'down' && <TrendingDown className="h-3.5 w-3.5" />}
                      {occupancySuggestion.trend === 'stable' && <Minus className="h-3.5 w-3.5" />}
                      {occupancySuggestion.trend === 'up'
                        ? `+${occupancySuggestion.trendDiff}% above last year`
                        : occupancySuggestion.trend === 'down'
                        ? `${occupancySuggestion.trendDiff}% below last year`
                        : 'Same as last year'}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-400">No data for this date last year</p>
                )}
              </div>

              {/* Model Stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 text-center">
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-300">
                    {occupancySuggestion.avgError != null ? `±${occupancySuggestion.avgError}%` : '—'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Avg Error</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 text-center">
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-300">
                    {occupancySuggestion.totalHistoryDays}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">History Days</p>
                </div>
              </div>

              {/* Peak Month */}
              {occupancySuggestion.peakMonth && (
                <div className="p-3 rounded-xl bg-luxury-gold/5 border border-luxury-gold/20 flex items-center gap-3">
                  <div className="text-2xl">🏆</div>
                  <div>
                    <p className="text-xs font-bold text-luxury-gold">Peak Month</p>
                    <p className="text-sm font-semibold dark:text-white">
                      {occupancySuggestion.peakMonth.name} — avg {occupancySuggestion.peakMonth.avg}%
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 7-Day Dual-Line Forecast Chart */}
            <div className="md:col-span-2 flex flex-col">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1">
                <BarChart2 className="h-3.5 w-3.5" /> Next 7 Days — This Year Prediction vs Last Year Actual
              </p>
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <th className="text-left py-2 px-3 text-slate-400 font-semibold">Date</th>
                      <th className="text-center py-2 px-3 text-indigo-400 font-semibold">Predicted</th>
                      <th className="text-center py-2 px-3 text-amber-400 font-semibold">Last Year Actual</th>
                      <th className="text-center py-2 px-3 text-slate-400 font-semibold">Difference</th>
                      <th className="text-left py-2 px-3 text-slate-400 font-semibold">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                    {(occupancySuggestion.next7Forecast || []).map((f, idx) => {
                      const lyActual = occupancySuggestion.next7LastYear?.[idx]?.actual;
                      const diff = lyActual != null ? Math.round((f.predicted - lyActual) * 10) / 10 : null;
                      const accuracy = occupancySuggestion.modelAccuracy || 80;
                      const confidence = accuracy >= 85 ? 'High' : accuracy >= 70 ? 'Moderate' : 'Low';
                      const confColor = accuracy >= 85 ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                        : accuracy >= 70 ? 'text-amber-500 bg-amber-500/10 border-amber-500/20'
                        : 'text-rose-500 bg-rose-500/10 border-rose-500/20';
                      return (
                        <tr key={f.date} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="py-2.5 px-3 font-semibold dark:text-slate-200">{f.label}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="font-bold text-indigo-600 dark:text-indigo-300">{f.predicted}%</span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {lyActual != null
                              ? <span className="font-semibold text-amber-600 dark:text-amber-300">{lyActual}%</span>
                              : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {diff != null ? (
                              <span className={`font-semibold ${
                                diff > 0 ? 'text-emerald-500' : diff < 0 ? 'text-rose-500' : 'text-slate-400'
                              }`}>
                                {diff > 0 ? '+' : ''}{diff}%
                              </span>
                            ) : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${confColor}`}>
                              {confidence}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Accuracy bar */}
              {occupancySuggestion.modelAccuracy != null && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs text-slate-500">Model Accuracy (based on last year validation)</p>
                    <p className="text-xs font-bold dark:text-white">{occupancySuggestion.modelAccuracy}%</p>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-700 ${
                        occupancySuggestion.modelAccuracy >= 85 ? 'bg-emerald-500'
                        : occupancySuggestion.modelAccuracy >= 70 ? 'bg-amber-500'
                        : 'bg-rose-500'
                      }`}
                      style={{ width: `${occupancySuggestion.modelAccuracy}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    ℹ️ Accuracy computed by comparing ML predictions against {occupancySuggestion.lastYearWindowData?.length || 0} same-period actual data points from last year.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="glass-panel p-6 rounded-2xl shadow-glass">
        <h3 className="text-lg font-bold font-serif dark:text-white mb-4">Operations Warning Board</h3>
        {alerts.length === 0 ? (
          <div className="p-4 border border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center space-x-3 text-sm">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            <span>All departments balanced for the upcoming shifts. Guest occupancy parameters are within normal variance.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts.map((alert) => (
              <div
                key={alert.id || alert._id}
                className={`p-4 rounded-xl border flex items-start space-x-3 text-sm transition-all hover:-translate-y-0.5 duration-200 ${
                  alert.type === 'staffing'
                    ? 'bg-rose-500/5 border-rose-500/15 text-rose-600 dark:text-rose-400'
                    : 'bg-amber-500/5 border-amber-500/15 text-amber-600 dark:text-amber-400'
                }`}
              >
                <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block uppercase tracking-wider text-xs mb-1">{alert.title}</span>
                  <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-350">{alert.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Bottom Panels - Staff Reports & Feedback */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Guest Staff Reports Panel */}
        <div className="glass-panel p-6 rounded-2xl shadow-glass flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-5 flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <Flag className="h-5 w-5 text-rose-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-serif dark:text-white">Guest Staff Reports</h3>
                <p className="text-xs text-slate-400">Complaints submitted by residents about hotel staff</p>
              </div>
            </div>
            {staffReports.length > 0 && (
              <span className="text-xs font-bold px-3 py-1 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-full">
                {staffReports.length} {staffReports.length === 1 ? 'report' : 'reports'}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {staffReports.length === 0 ? (
              <div className="p-6 border border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center space-x-3 text-sm h-full flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                <span>No staff complaints have been filed by guests.</span>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-luxury-darkCard border-b border-slate-200 dark:border-slate-800">
                      <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">
                        <div className="flex items-center space-x-1.5">
                          <User className="h-3.5 w-3.5" />
                          <span>Guest</span>
                        </div>
                      </th>
                      <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">
                        <div className="flex items-center space-x-1.5">
                          <BedDouble className="h-3.5 w-3.5" />
                          <span>Room</span>
                        </div>
                      </th>
                      <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">
                        <div className="flex items-center space-x-1.5">
                          <MessageSquareWarning className="h-3.5 w-3.5" />
                          <span>Staff Reported</span>
                        </div>
                      </th>
                      <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">
                        <div className="flex items-center space-x-1.5">
                          <Wrench className="h-3.5 w-3.5" />
                          <span>Service</span>
                        </div>
                      </th>
                      <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">
                        <div className="flex items-center space-x-1.5">
                          <Clock4 className="h-3.5 w-3.5" />
                          <span>Submitted</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {staffReports.map((report, idx) => (
                      <tr
                        key={report._id || report.id || idx}
                        className="hover:bg-rose-500/3 dark:hover:bg-rose-500/5 transition-colors duration-150"
                      >
                        <td className="px-4 py-3 font-semibold dark:text-white">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 rounded-full bg-rose-500/15 flex items-center justify-center text-rose-500 font-bold text-[9px] uppercase flex-shrink-0">
                              {(report.guestName || 'G')[0]}
                            </div>
                            <span className="truncate max-w-[80px]">{report.guestName || '—'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-mono">
                          #{report.roomNo || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-full font-semibold">
                            {report.staffName || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-[120px] truncate" title={report.service}>
                          {report.service || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-400 font-mono text-[10px]">
                          {report.createdAt
                            ? new Date(report.createdAt).toLocaleString('en-IN', {
                                dateStyle: 'short',
                                timeStyle: 'short'
                              })
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Guest Feedback Panel */}
        <div className="glass-panel p-6 rounded-2xl shadow-glass flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-5 flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <MessageSquare className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-serif dark:text-white">Guest Feedback</h3>
                <p className="text-xs text-slate-400">General service and stay feedback submitted by guests</p>
              </div>
            </div>
            {feedbacks.length > 0 && (
              <span className="text-xs font-bold px-3 py-1 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-full">
                {feedbacks.length} {feedbacks.length === 1 ? 'feedback' : 'feedbacks'}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {feedbacks.length === 0 ? (
              <div className="p-6 border border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center space-x-3 text-sm h-full flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                <span>No guest feedback has been submitted yet.</span>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-luxury-darkCard border-b border-slate-200 dark:border-slate-800">
                      <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">
                        <div className="flex items-center space-x-1.5">
                          <User className="h-3.5 w-3.5" />
                          <span>Guest</span>
                        </div>
                      </th>
                      <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">
                        <div className="flex items-center space-x-1.5">
                          <BedDouble className="h-3.5 w-3.5" />
                          <span>Room</span>
                        </div>
                      </th>
                      <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">
                        <div className="flex items-center space-x-1.5">
                          <Wrench className="h-3.5 w-3.5" />
                          <span>Category</span>
                        </div>
                      </th>
                      <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">
                        <div className="flex items-center space-x-1.5">
                          <Star className="h-3.5 w-3.5" />
                          <span>Rating</span>
                        </div>
                      </th>
                      <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">
                        <div className="flex items-center space-x-1.5">
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>Comments</span>
                        </div>
                      </th>
                      <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">
                        <div className="flex items-center space-x-1.5">
                          <Clock4 className="h-3.5 w-3.5" />
                          <span>Submitted</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {feedbacks.map((fb, idx) => (
                      <tr
                        key={fb._id || fb.id || idx}
                        className="hover:bg-amber-500/3 dark:hover:bg-amber-500/5 transition-colors duration-150"
                      >
                        <td className="px-4 py-3 font-semibold dark:text-white">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-500 font-bold text-[9px] uppercase flex-shrink-0">
                              {(fb.guestName || 'G')[0]}
                            </div>
                            <span className="truncate max-w-[80px]">{fb.guestName || '—'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-mono">
                          #{fb.roomNo || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-semibold">
                          {fb.category || '—'}
                        </td>
                        <td className="px-4 py-3 text-amber-500 font-bold text-xs whitespace-nowrap">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i} className={i < fb.rating ? "text-amber-400" : "text-slate-300 dark:text-slate-700"}>
                              ★
                            </span>
                          ))}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-[120px] truncate" title={fb.comments}>
                          {fb.comments || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-400 font-mono text-[10px]">
                          {fb.createdAt
                            ? new Date(fb.createdAt).toLocaleString('en-IN', {
                                dateStyle: 'short',
                                timeStyle: 'short'
                              })
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
