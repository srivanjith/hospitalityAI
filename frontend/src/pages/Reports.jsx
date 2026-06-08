import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  FileText, 
  Download, 
  Printer, 
  Calendar, 
  Search,
  CheckCircle,
  Eye,
  BadgeAlert
} from 'lucide-react';
import api from '../services/api';

const Reports = () => {
  const [reportType, setReportType] = useState('occupancy');
  const [startDate, setStartDate] = useState(() => {
    // 30 days ago
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);
  const [previewHeaders, setPreviewHeaders] = useState([]);
  const [searched, setSearched] = useState(false);

  const handlePreview = async () => {
    setLoading(true);
    setSearched(true);
    try {
      if (reportType === 'occupancy') {
        const data = await api.getOccupancyAnalytics(100);
        // filter by date range
        const filtered = (data.chartData || []).filter(d => d.date >= startDate && d.date <= endDate);
        setPreviewHeaders(['Date', 'Occupancy Rate', 'Rooms Occupied', 'Guest Count', 'Revenue']);
        setPreviewRows(filtered.map(d => ({
          'Date': d.date,
          'Occupancy Rate': `${d.occupancyPercentage}%`,
          'Rooms Occupied': d.roomsOccupied,
          'Guest Count': d.guestCount,
          'Revenue': `₹${d.revenue.toLocaleString()}`
        })));

      } else if (reportType === 'staffing') {
        const data = await api.getForecast(startDate, 15);
        // filter by date range
        const filtered = data.filter(d => d.date >= startDate && d.date <= endDate);
        setPreviewHeaders(['Date', 'Forecast Occupancy', 'Front Desk Staff', 'Housekeeping Staff', 'Restaurant Staff', 'Status']);
        setPreviewRows(filtered.map(d => ({
          'Date': d.date,
          'Forecast Occupancy': `${d.predictedOccupancy}%`,
          'Front Desk Staff': `${d.actualStaffScheduled['Front Desk']} / ${d.recommendedStaff['Front Desk']}`,
          'Housekeeping Staff': `${d.actualStaffScheduled['Housekeeping']} / ${d.recommendedStaff['Housekeeping']}`,
          'Restaurant Staff': `${d.actualStaffScheduled['Restaurant Services']} / ${d.recommendedStaff['Restaurant Services']}`,
          'Status': d.optimized ? 'Optimized' : 'Balanced'
        })));

      } else if (reportType === 'revenue') {
        const data = await api.getOccupancyAnalytics(100);
        const filtered = (data.chartData || []).filter(d => d.date >= startDate && d.date <= endDate);
        setPreviewHeaders(['Date', 'Rooms Occupied', 'Room Revenue', 'Dining Add-ons', 'Total Daily Revenue']);
        setPreviewRows(filtered.map(d => {
          const roomRev = d.roomsOccupied * 150;
          const diningRev = Math.max(0, d.revenue - roomRev);
          return {
            'Date': d.date,
            'Rooms Occupied': d.roomsOccupied,
            'Room Revenue': `₹${roomRev.toLocaleString()}`,
            'Dining Add-ons': `₹${diningRev.toLocaleString()}`,
            'Total Daily Revenue': `₹${d.revenue.toLocaleString()}`
          };
        }));

      } else if (reportType === 'performance') {
        const employees = await api.getEmployees();
        setPreviewHeaders(['Name', 'Department', 'Shift Block', 'Base Salary', 'Attendance Rate', 'Performance Grade']);
        setPreviewRows(employees.map(emp => {
          const att = emp.attendance || [];
          const presentDays = att.filter(a => a.status === 'present').length;
          const totalTracked = att.length;
          const attRate = totalTracked > 0 ? `${Math.round((presentDays / totalTracked) * 100)}%` : '100%';
          return {
            'Name': emp.name,
            'Department': emp.department,
            'Shift Block': emp.shift,
            'Base Salary': `₹${emp.salary.toLocaleString()}`,
            'Attendance Rate': attRate,
            'Performance Grade': `${emp.performance} / 5.0`
          };
        }));
      }
    } catch (err) {
      console.error('Error generating report preview:', err);
      alert('Error rendering preview rows.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    // Triggers direct browser download from API
    const url = api.getExportUrl(reportType, startDate, endDate);
    window.open(url, '_blank');
  };

  const handlePrintPDF = () => {
    // Opens standard browser print dialog. CSS prints handle formatting.
    window.print();
  };

  return (
    <div className="space-y-8 animate-fade-in print:bg-white print:text-black">
      
      {/* 1. Configuration Panel (hidden when printing) */}
      <div className="glass-panel p-6 rounded-2xl shadow-glass space-y-4 print:hidden">
        <div>
          <h3 className="text-lg font-bold font-serif dark:text-white">Report Compiler Center</h3>
          <p className="text-xs text-slate-400">Generate executive audits, spreadsheet spreadsheets, and printable PDF documents</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          {/* Report Type */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-505 uppercase tracking-wider block">Report Profile</label>
            <select
              value={reportType}
              onChange={(e) => {
                setReportType(e.target.value);
                setSearched(false);
                setPreviewRows([]);
              }}
              className="w-full bg-white dark:bg-luxury-dark border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-700 dark:text-white focus:outline-none"
            >
              <option value="occupancy">Hotel Occupancy Report</option>
              <option value="staffing">Staff Recommendation Report</option>
              <option value="revenue">Financial Revenue Report</option>
              <option value="performance">Employee Performance Metrics</option>
            </select>
          </div>

          {/* Start Date */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-505 uppercase tracking-wider block">Starting Date</label>
            <div className="flex items-center space-x-2 bg-white dark:bg-luxury-dark border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setSearched(false);
                }}
                disabled={reportType === 'performance'}
                className="bg-transparent border-none text-xs text-slate-700 dark:text-white focus:outline-none disabled:opacity-40"
              />
            </div>
          </div>

          {/* End Date */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-550 uppercase tracking-wider block">Ending Date</label>
            <div className="flex items-center space-x-2 bg-white dark:bg-luxury-dark border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setSearched(false);
                }}
                disabled={reportType === 'performance'}
                className="bg-transparent border-none text-xs text-slate-700 dark:text-white focus:outline-none disabled:opacity-40"
              />
            </div>
          </div>

          {/* Action trigger */}
          <div className="flex items-end">
            <button
              onClick={handlePreview}
              disabled={loading}
              className="w-full btn-gold py-2.5 text-xs flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Eye className="h-4.5 w-4.5" />
              <span>Compile Preview</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Compiled Preview Pane */}
      {searched && (
        <div className="glass-panel rounded-2xl shadow-glass overflow-hidden animate-fade-in print:border-none print:shadow-none print:m-0">
          
          {/* Header Controls (hidden when printing) */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
            <div>
              <h3 className="text-md font-bold uppercase tracking-wider dark:text-white">Compiled Document Preview</h3>
              <p className="text-xs text-slate-400">Previewing compiled metrics below. Select download options below.</p>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handleExportExcel}
                className="btn-gold-outline flex items-center space-x-1.5 py-2 text-xs cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>Export Excel/CSV</span>
              </button>
              <button
                onClick={handlePrintPDF}
                className="btn-gold flex items-center space-x-1.5 py-2 text-xs cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Print PDF</span>
              </button>
            </div>
          </div>

          {/* Report Paper Heading (Visible only when printing) */}
          <div className="hidden print:block p-8 text-center border-b border-slate-800">
            <h1 className="text-3xl font-serif font-bold text-slate-900 tracking-wider">THE GRAND ROYAL RESORT</h1>
            <p className="text-xs uppercase tracking-widest text-slate-500 mt-1">Audit Ledger Profile: {reportType} logs</p>
            <p className="text-xs text-slate-500 mt-0.5">Period Scope: {startDate} to {endDate} | Generated: {new Date().toLocaleDateString()}</p>
          </div>

          {/* Preview Table data grid */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {previewHeaders.map((header) => (
                    <th key={header} className="table-luxury-header text-xs print:bg-slate-200 print:text-black">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.length === 0 ? (
                  <tr>
                    <td colSpan={previewHeaders.length} className="py-8 text-center text-sm text-slate-450">
                      No records found in range. Check parameter boundaries.
                    </td>
                  </tr>
                ) : (
                  previewRows.map((row, rIdx) => (
                    <tr key={rIdx} className="table-luxury-row print:border-b print:border-slate-300">
                      {previewHeaders.map((header) => (
                        <td key={header} className="py-3.5 px-4 text-xs dark:text-slate-300 font-medium font-mono">
                          {row[header]}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Print Signoffs (Visible only when printing) */}
          <div className="hidden print:flex justify-between items-end mt-16 px-8 py-4">
            <div className="text-center w-48 border-t border-slate-400 pt-2 text-xs">
              <p className="font-semibold text-slate-700">Prepared By</p>
              <p className="text-[10px] text-slate-550 mt-1">Audit Manager</p>
            </div>
            <div className="text-center w-48 border-t border-slate-400 pt-2 text-xs">
              <p className="font-semibold text-slate-700">Approved By</p>
              <p className="text-[10px] text-slate-550 mt-1">Executive Board Director</p>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default Reports;
