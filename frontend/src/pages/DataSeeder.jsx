import { useState } from 'react';
import { DatabaseZap, Play, CheckCircle2, AlertCircle, Loader2, CalendarRange, BarChart3, BookOpen, Sparkles, Info } from 'lucide-react';
import api from '../services/api';

const DataSeeder = () => {
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState('2025-01-01');
  const [endDate, setEndDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState([]);
  const [phase, setPhase] = useState('idle'); 

  const handleSeed = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates.');
      return;
    }
    if (new Date(startDate) >= new Date(endDate)) {
      setError('Start date must be before end date.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setLogs([]);
    setPhase('running');

    try {
      setLogs(['🚀 Starting Groq AI data generation...', '⏳ This may take 1-3 minutes depending on date range...']);
      const data = await api.seedData(startDate, endDate);

      setLogs(data.progress || ['✅ Completed']);
      setResult(data.summary);
      setPhase('done');
    } catch (err) {
      setError(err.message || 'Seeding failed. Check backend logs.');
      setLogs(prev => [...prev, `❌ Error: ${err.message}`]);
      setPhase('error');
    } finally {
      setLoading(false);
    }
  };

  // Estimate number of days in range
  const estimatedDays = startDate && endDate
    ? Math.max(0, Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="space-y-8 max-w-3xl mx-auto">

      {/* ── Page Header ── */}
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-500/20">
          <DatabaseZap className="w-8 h-8 text-amber-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white font-serif">
            AI Synthetic Data Seeder
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Uses Groq LLaMA 3.3-70B to generate realistic hotel booking &amp; occupancy history
            and bulk-insert it into your MongoDB database.
          </p>
        </div>
      </div>

      {/* ── Info Banner ── */}
      <div className="flex gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <p className="font-semibold">What this does:</p>
          <ul className="list-disc list-inside space-y-0.5 text-blue-600 dark:text-blue-400 text-xs">
            <li>Generates daily occupancy history (seasonality, weekends, Indian festivals)</li>
            <li>Creates realistic hotel bookings with Indian guest names &amp; room types</li>
            <li>Skips dates already present in the database (safe to re-run)</li>
            <li>Data is used by the AI Forecasting &amp; ML engine for predictions</li>
          </ul>
        </div>
      </div>

      {/* ── Date Range Configurator ── */}
      <div className="glass-panel rounded-2xl p-6 space-y-5 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-2">
          <CalendarRange className="w-5 h-5 text-luxury-gold" />
          <h3 className="font-semibold text-slate-800 dark:text-white">Date Range Configuration</h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
              Start Date
            </label>
            <input
              id="seeder-start-date"
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              max={today}
              disabled={loading}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-all disabled:opacity-60"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
              End Date
            </label>
            <input
              id="seeder-end-date"
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              max={today}
              disabled={loading}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-all disabled:opacity-60"
            />
          </div>
        </div>

        {/* Estimation bar */}
        {estimatedDays > 0 && (
          <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <BarChart3 className="w-4 h-4 text-amber-500" />
              <span>~<strong>{estimatedDays}</strong> occupancy records</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <BookOpen className="w-4 h-4 text-amber-500" />
              <span>~<strong>{Math.round(estimatedDays * 0.25)}</strong> booking records</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>~<strong>{Math.ceil(estimatedDays / 90) * 2}</strong> Groq API calls</span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Seed Button */}
        <button
          id="seeder-run-btn"
          onClick={handleSeed}
          disabled={loading || !startDate || !endDate}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold text-sm shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating data with Groq AI…
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Generate &amp; Seed MongoDB Database
            </>
          )}
        </button>
      </div>

      {/* ── Live Progress Log ── */}
      {(logs.length > 0 || loading) && (
        <div className="glass-panel rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            {loading
              ? <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
              : phase === 'done'
              ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              : <AlertCircle className="w-4 h-4 text-red-500" />
            }
            <h3 className="font-semibold text-slate-800 dark:text-white text-sm">
              {loading ? 'Progress Log' : phase === 'done' ? 'Completed' : 'Error Log'}
            </h3>
          </div>

          <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs space-y-1.5 max-h-52 overflow-y-auto">
            {logs.map((log, idx) => (
              <p
                key={idx}
                className={`leading-relaxed ${
                  log.includes('✅') ? 'text-emerald-400'
                  : log.includes('❌') ? 'text-red-400'
                  : log.includes('⚠️') ? 'text-amber-400'
                  : log.includes('🎉') ? 'text-amber-300 font-bold'
                  : 'text-slate-300'
                }`}
              >
                {log}
              </p>
            ))}
            {loading && (
              <p className="text-amber-400 animate-pulse">
                ⏳ Waiting for Groq response…
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Success Summary ── */}
      {result && phase === 'done' && (
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/30 p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            <h3 className="font-bold text-emerald-700 dark:text-emerald-300 text-lg">
              Database Seeded Successfully!
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-emerald-100 dark:border-emerald-900/50">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {result.occupancyRecordsInserted}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Occupancy Records</p>
            </div>
            <div className="text-center bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-emerald-100 dark:border-emerald-900/50">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {result.bookingsInserted}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Booking Records</p>
            </div>
            <div className="text-center bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-emerald-100 dark:border-emerald-900/50">
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {result.dateRange?.start}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">to</p>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {result.dateRange?.end}
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 text-center">
            ✨ Your AI Forecasting model now has rich historical data to learn from. Visit the <strong>AI Staffing Forecast</strong> page to see predictions.
          </p>
        </div>
      )}
    </div>
  );
};

export default DataSeeder;
