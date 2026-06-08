import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Star, 
  Clock, 
  UserPlus, 
  UserCheck, 
  X,
  SlidersHorizontal,
  Mail,
  User,
  BadgeIndianRupee,
  CheckCircle2,
  AlertOctagon
} from 'lucide-react';
import api from '../services/api';

const StaffManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('Housekeeping');
  const [shift, setShift] = useState('Morning');
  const [salary, setSalary] = useState('');
  const [formError, setFormError] = useState(null);

  // Attendance date log
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split('T')[0]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const data = await api.getEmployees();
      setEmployees(data);
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setFormError(null);
    try {
      await api.addEmployee({
        name,
        email,
        department,
        shift,
        salary: Number(salary)
      });
      setName('');
      setEmail('');
      setDepartment('Housekeeping');
      setShift('Morning');
      setSalary('');
      setShowAddModal(false);
      await loadEmployees();
    } catch (err) {
      setFormError(err.message || 'Failed to enroll worker');
    }
  };

  const handleDeleteEmployee = async (id) => {
    if (!window.confirm('Are you sure you want to remove this employee from registry?')) return;
    try {
      await api.deleteEmployee(id);
      await loadEmployees();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleRatingChange = async (id, stars) => {
    try {
      await api.rateEmployee(id, stars);
      // Local state update
      setEmployees(prev => prev.map(emp => {
        if (emp.id === id || emp._id === id) {
          return { ...emp, performance: stars };
        }
        return emp;
      }));
    } catch (err) {
      alert(`Failed to log rating: ${err.message}`);
    }
  };

  const handleAttendanceChange = async (id, status) => {
    try {
      await api.recordAttendance(id, attendanceDate, status);
      await loadEmployees();
    } catch (err) {
      alert(`Failed to log attendance: ${err.message}`);
    }
  };

  // Filter logic
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          emp.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = deptFilter === 'All' || emp.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  // Calculate stats
  const departments = ['Front Desk', 'Housekeeping', 'Restaurant Services', 'Security', 'Maintenance'];
  const shifts = ['Morning', 'Evening', 'Night'];

  // Attendance lookup for an employee
  const getAttendanceStatusForDate = (emp, dateStr) => {
    const log = (emp.attendance || []).find(a => a.date === dateStr);
    return log ? log.status : 'unlogged';
  };

  // ── Weekly Roster Helpers ────────────────────────────────────────────
  const getWeekDates = (anchorDateStr) => {
    let anchor = new Date(anchorDateStr);
    if (!anchorDateStr || isNaN(anchor.getTime())) {
      anchor = new Date();
    }
    // Monday of anchor week
    const day = anchor.getDay();
    const diff = (day === 0 ? -6 : 1 - day);
    const monday = new Date(anchor);
    monday.setDate(anchor.getDate() + diff);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d.toISOString().split('T')[0];
    });
  };

  const weekDates = getWeekDates(attendanceDate);
  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Staff on leave or absent today
  const onLeaveToday = employees.filter(emp => {
    const att = (emp.attendance || []).find(a => a.date === attendanceDate);
    return att && (att.status === 'leave' || att.status === 'absent');
  });

  // Overtime employees (attended > 26 days)
  const overtimeStaff = employees.filter(emp => {
    return (emp.attendance || []).filter(a => a.status === 'present').length > 26;
  });

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-luxury-gold mx-auto"></div>
          <p className="text-sm text-slate-500 font-mono">Syncing Staff Records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ── 0. Weekly Roster Calendar ─────────────────────────── */}
      <div className="glass-panel rounded-2xl shadow-glass overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold font-serif dark:text-white">Weekly Roster Calendar</h3>
            <p className="text-xs text-slate-400">Attendance coverage across all departments for week of {weekDates[0]} — {weekDates[6]}</p>
          </div>
          <input
            type="date"
            value={attendanceDate}
            onChange={e => setAttendanceDate(e.target.value)}
            className="bg-white dark:bg-luxury-dark border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-700 dark:text-white focus:outline-none focus:border-luxury-gold"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[700px]">
            <thead>
              <tr className="bg-luxury-navy dark:bg-luxury-darkCard text-luxury-gold">
                <th className="text-left px-4 py-3 font-serif font-normal">Department</th>
                {weekDates.map((d, i) => (
                  <th key={d} className={`text-center px-3 py-3 font-serif font-normal ${
                    d === attendanceDate ? 'text-luxury-gold bg-amber-500/10' : ''
                  }`}>
                    <div>{DAY_LABELS[i]}</div>
                    <div className="text-[9px] opacity-70">{d.slice(5)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {departments.map(dept => (
                <tr key={dept} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3 font-semibold dark:text-white text-[11px]">{dept}</td>
                  {weekDates.map(dateStr => {
                    const deptEmps = employees.filter(e => e.department === dept && e.status === 'active');
                    const present = deptEmps.filter(e => getAttendanceStatusForDate(e, dateStr) === 'present').length;
                    const onLeave = deptEmps.filter(e => getAttendanceStatusForDate(e, dateStr) === 'leave').length;
                    const absent = deptEmps.filter(e => getAttendanceStatusForDate(e, dateStr) === 'absent').length;
                    const total = deptEmps.length;
                    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
                    return (
                      <td key={dateStr} className={`px-2 py-3 text-center ${
                        dateStr === attendanceDate ? 'bg-amber-500/5' : ''
                      }`}>
                        <div className={`inline-flex flex-col items-center px-2 py-1 rounded-lg ${
                          rate >= 80 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : rate >= 50 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        }`}>
                          <span className="font-bold text-[11px]">{present}/{total}</span>
                          {(onLeave > 0 || absent > 0) && (
                            <span className="text-[9px] opacity-70">
                              {onLeave > 0 ? `${onLeave}L` : ''}{absent > 0 ? ` ${absent}A` : ''}
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 bg-slate-50/40 dark:bg-luxury-darkCard/20 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-4 text-[10px] text-slate-500">
          <span className="flex items-center space-x-1.5"><span className="w-3 h-3 rounded bg-emerald-500/30 inline-block"></span><span>≥80% present</span></span>
          <span className="flex items-center space-x-1.5"><span className="w-3 h-3 rounded bg-amber-500/30 inline-block"></span><span>50-79% present</span></span>
          <span className="flex items-center space-x-1.5"><span className="w-3 h-3 rounded bg-slate-300/60 dark:bg-slate-700/60 inline-block"></span><span>&lt;50% or unlogged</span></span>
          <span className="ml-auto">L = Leave &nbsp; A = Absent</span>
        </div>
      </div>

      {/* ── 0b. Leave & Absence Management Panel ──────────────── */}
      <div className="glass-panel p-6 rounded-2xl shadow-glass">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl border ${
              onLeaveToday.length > 0 ? 'bg-sky-500/10 border-sky-500/20' : 'bg-emerald-500/10 border-emerald-500/20'
            }`}>
              <SlidersHorizontal className={`h-5 w-5 ${
                onLeaveToday.length > 0 ? 'text-sky-500' : 'text-emerald-500'
              }`} />
            </div>
            <div>
              <h3 className="text-lg font-bold font-serif dark:text-white">Leave & Absence Management</h3>
              <p className="text-xs text-slate-400">Staff on approved leave or marked absent on {attendanceDate}</p>
            </div>
          </div>
          {onLeaveToday.length > 0 && (
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
              onLeaveToday.some(e => {
                const att = (e.attendance || []).find(a => a.date === attendanceDate);
                return att && att.status === 'absent';
              }) 
                ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' 
                : 'bg-sky-500/10 text-sky-500 border-sky-500/20'
            }`}>
              {onLeaveToday.length} unavailable
            </span>
          )}
        </div>
        {onLeaveToday.length === 0 ? (
          <div className="p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-center space-x-3 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            <span>No employees are on leave or absent on {attendanceDate}. Full workforce is available.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {onLeaveToday.map(emp => {
              const att = (emp.attendance || []).find(a => a.date === attendanceDate);
              const isAbsent = att && att.status === 'absent';
              return (
                <div key={emp.id || emp._id} className={`flex items-center space-x-3 p-3 rounded-xl border ${
                  isAbsent 
                    ? 'bg-rose-500/5 border-rose-500/15' 
                    : 'bg-sky-500/5 border-sky-500/15'
                }`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                    isAbsent
                      ? 'bg-rose-500/15 text-rose-500'
                      : 'bg-sky-500/15 text-sky-500'
                  }`}>
                    {emp.name[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold dark:text-white truncate">{emp.name}</p>
                    <p className="text-[10px] text-slate-400">{emp.department} · {emp.shift} shift</p>
                  </div>
                  <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${
                    isAbsent
                      ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                      : 'bg-sky-500/10 text-sky-500 border-sky-500/20'
                  }`}>
                    {isAbsent ? 'Absent' : 'Leave'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 0c. Overtime Control Tracker ────────────────────── */}
      {overtimeStaff.length > 0 && (
        <div className="glass-panel p-6 rounded-2xl shadow-glass border border-rose-500/20">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <AlertOctagon className="h-5 w-5 text-rose-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-serif dark:text-white">Overtime Control</h3>
                <p className="text-xs text-slate-400">Employees who exceeded 26 working days this month</p>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-full">
              {overtimeStaff.length} flagged
            </span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-rose-950/30 dark:bg-rose-950/50 border-b border-rose-500/20 text-rose-400 font-bold uppercase tracking-wider">
                  <th className="text-left px-4 py-3">Employee</th>
                  <th className="text-left px-4 py-3">Dept / Shift</th>
                  <th className="text-center px-4 py-3">Days Present</th>
                  <th className="text-center px-4 py-3">Extra Days</th>
                  <th className="text-right px-4 py-3">Est. Overtime Pay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-500/10">
                {overtimeStaff.map((emp, i) => {
                  const presentDays = (emp.attendance || []).filter(a => a.status === 'present').length;
                  const extraDays = presentDays - 26;
                  const dailySalary = (emp.salary || 0) / 26;
                  const overtimePay = Math.round(extraDays * dailySalary * 1.5);
                  return (
                    <tr key={emp.id || emp._id || i} className="hover:bg-rose-500/3 transition-colors">
                      <td className="px-4 py-3 font-semibold dark:text-white">{emp.name}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{emp.department} · {emp.shift}</td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-rose-500">{presentDays}</td>
                      <td className="px-4 py-3 text-center font-mono text-amber-500">+{extraDays}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-rose-500">₹{overtimePay.toLocaleString('en-IN')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 1. Shift Schedule Matrix (Visual representation of workforce distribution) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {shifts.map((sTime) => {
          const shiftEmployees = employees.filter(emp => emp.shift === sTime && emp.status === 'active');
          return (
            <div key={sTime} className="glass-panel p-5 rounded-2xl shadow-glass flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <Clock className="h-5 w-5 text-luxury-gold" />
                  <h4 className="font-serif font-bold text-sm dark:text-white">{sTime} Shift Roster</h4>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase block border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
                  Total Workers: {shiftEmployees.length}
                </span>
                
                {shiftEmployees.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3">No employees assigned to this shift.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {shiftEmployees.map(emp => (
                      <div key={emp.id || emp._id} className="flex items-center justify-between p-2 bg-slate-50/50 dark:bg-luxury-darkCard/30 rounded-lg text-xs">
                        <div className="font-medium truncate dark:text-slate-300">{emp.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800">
                          {emp.department}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Employee Directory Header & Filter Log */}
      <div className="glass-panel rounded-2xl shadow-glass overflow-hidden">
        
        {/* Controls Panel */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold font-serif dark:text-white">Hospitality Employee Registry</h3>
            <p className="text-xs text-slate-400">Manage staffing departments, shifts, performance ratings, and attendance logs</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff file..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white dark:bg-luxury-dark border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-800 dark:text-white focus:outline-none w-48 focus:border-luxury-gold"
              />
            </div>

            {/* Department Filter */}
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-white dark:bg-luxury-dark border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-700 dark:text-white focus:outline-none focus:border-luxury-gold"
            >
              <option value="All">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            {/* Add Employee Trigger */}
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-gold flex items-center space-x-1 py-2 text-xs cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              <span>Recruit Staff</span>
            </button>
          </div>
        </div>

        {/* Live Attendance Date Log selector */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-luxury-darkCard/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span className="text-xs text-slate-500 font-semibold">
            Attendance logging date:
          </span>
          <input
            type="date"
            value={attendanceDate}
            onChange={(e) => setAttendanceDate(e.target.value)}
            className="bg-white dark:bg-luxury-dark border border-slate-200 dark:border-slate-800 rounded px-2 py-0.5 text-xs text-slate-700 dark:text-white focus:outline-none"
          />
        </div>

        {/* Workers directory List */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="table-luxury-header text-xs">Worker Name</th>
                <th className="table-luxury-header text-xs">Email</th>
                <th className="table-luxury-header text-xs">Department</th>
                <th className="table-luxury-header text-xs">Shift Block</th>
                <th className="table-luxury-header text-xs text-right">Monthly Salary</th>
                <th className="table-luxury-header text-xs text-center">Performance</th>
                <th className="table-luxury-header text-xs text-center">Attendance Log ({attendanceDate.slice(5)})</th>
                <th className="table-luxury-header text-xs text-center">Terminate</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-sm text-slate-450">
                    No active staff matching parameters.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const currentAttendance = getAttendanceStatusForDate(emp, attendanceDate);
                  return (
                    <tr key={emp.id || emp._id} className="table-luxury-row">
                      <td className="py-4 px-4 text-xs font-semibold dark:text-white">
                        {emp.name}
                      </td>
                      <td className="py-4 px-4 text-xs text-slate-500">
                        {emp.email}
                      </td>
                      <td className="py-4 px-4 text-xs font-medium text-slate-700 dark:text-slate-350">
                        {emp.department}
                      </td>
                      <td className="py-4 px-4 text-xs">
                        <span className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-semibold px-2 py-0.5 rounded text-[10px]">
                          {emp.shift}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs text-right font-bold text-slate-800 dark:text-slate-300 font-mono">
                        ₹{emp.salary.toLocaleString()}
                      </td>
                      {/* Performance rating selector */}
                      <td className="py-4 px-4 text-xs">
                        <div className="flex items-center justify-center space-x-0.5">
                          {[1, 2, 3, 4, 5].map((stars) => (
                            <button
                              key={stars}
                              type="button"
                              onClick={() => handleRatingChange(emp.id || emp._id, stars)}
                              className="text-slate-300 hover:text-luxury-gold focus:outline-none cursor-pointer transition-colors duration-150"
                            >
                              <Star 
                                className={`h-4.5 w-4.5 ${
                                  stars <= (emp.performance || 5) ? 'text-luxury-gold fill-luxury-gold' : 'text-slate-300 dark:text-slate-700'
                                }`} 
                              />
                            </button>
                          ))}
                        </div>
                      </td>
                      {/* Attendance toggles */}
                      <td className="py-4 px-4 text-xs">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => handleAttendanceChange(emp.id || emp._id, 'present')}
                            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase cursor-pointer ${
                              currentAttendance === 'present' 
                                ? 'bg-emerald-500 text-white' 
                                : 'bg-slate-100 text-slate-400 dark:bg-slate-800 hover:bg-emerald-500/10'
                            }`}
                          >
                            P
                          </button>
                          <button
                            onClick={() => handleAttendanceChange(emp.id || emp._id, 'absent')}
                            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase cursor-pointer ${
                              currentAttendance === 'absent' 
                                ? 'bg-rose-500 text-white' 
                                : 'bg-slate-100 text-slate-400 dark:bg-slate-800 hover:bg-rose-500/10'
                            }`}
                          >
                            A
                          </button>
                          <button
                            onClick={() => handleAttendanceChange(emp.id || emp._id, 'leave')}
                            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase cursor-pointer ${
                              currentAttendance === 'leave' 
                                ? 'bg-sky-500 text-white' 
                                : 'bg-slate-100 text-slate-400 dark:bg-slate-800 hover:bg-sky-500/10'
                            }`}
                          >
                            L
                          </button>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-xs text-center">
                        <button
                          onClick={() => handleDeleteEmployee(emp.id || emp._id)}
                          className="p-1 hover:bg-rose-500/15 rounded text-rose-500 transition-colors cursor-pointer"
                          title="Terminate employment file"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Recruit Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-luxury-cream dark:bg-luxury-darkCard border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xl animate-fade-in">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-luxury-navy text-luxury-gold dark:bg-luxury-darkCard">
              <div className="flex items-center space-x-2">
                <UserCheck className="h-5 w-5 text-luxury-gold" />
                <h3 className="text-lg font-bold font-serif text-white">Enroll Staff Member</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddEmployee} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-400 rounded-lg text-xs">
                  {formError}
                </div>
              )}

              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Employee Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="E.g. George Washington"
                    className="w-full bg-white dark:bg-luxury-dark border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-luxury-gold"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Corporate Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="george.w@grandroyal.com"
                    className="w-full bg-white dark:bg-luxury-dark border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-luxury-gold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Department */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-white dark:bg-luxury-dark border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none"
                  >
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                {/* Shift */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Shift block</label>
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value)}
                    className="w-full bg-white dark:bg-luxury-dark border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none"
                  >
                    {shifts.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Salary */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Monthly Base Salary (₹)</label>
                <div className="relative">
                  <BadgeIndianRupee className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-500" />
                  <input
                    type="number"
                    required
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    placeholder="2800"
                    className="w-full bg-white dark:bg-luxury-dark border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-luxury-gold"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="btn-gold text-xs cursor-pointer"
                >
                  Hire Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;
