const { db } = require('../config/db');

// Helper to convert array of objects to CSV string
const convertToCSV = (headers, rows) => {
  const headerLine = headers.join(',');
  const rowLines = rows.map(row => 
    headers.map(header => {
      let cell = row[header] === undefined || row[header] === null ? '' : row[header];
      // Escape commas and quotes
      if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
        cell = `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join(',')
  );
  return [headerLine, ...rowLines].join('\n');
};

// @desc    Export reports based on type (occupancy, staffing, revenue, performance)
// @route   GET /api/reports/export
// @access  Private
const exportReport = async (req, res) => {
  const { type, startDate, endDate } = req.query;

  try {
    let headers = [];
    let rows = [];
    let filename = `hospitality_report_${type || 'general'}.csv`;

    if (type === 'occupancy') {
      const history = await db.collection('occupancyHistory').find();
      const filtered = history.filter(h => {
        if (startDate && h.date < startDate) return false;
        if (endDate && h.date > endDate) return false;
        return true;
      }).sort((a, b) => new Date(a.date) - new Date(b.date));

      headers = ['Date', 'OccupancyPercentage', 'RoomsOccupied', 'GuestCount', 'Revenue'];
      rows = filtered.map(h => ({
        'Date': h.date,
        'OccupancyPercentage': `${h.occupancyPercentage}%`,
        'RoomsOccupied': h.roomsOccupied,
        'GuestCount': h.guestCount,
        'Revenue': `₹${h.revenue || 0}`
      }));
      filename = `occupancy_report_${startDate || 'start'}_to_${endDate || 'end'}.csv`;

    } else if (type === 'staffing') {
      const recommendations = await db.collection('recommendations').find();
      const filtered = recommendations.filter(r => {
        if (startDate && r.date < startDate) return false;
        if (endDate && r.date > endDate) return false;
        return true;
      }).sort((a, b) => new Date(a.date) - new Date(b.date));

      headers = ['Date', 'PredictedOccupancy', 'PredictedGuests', 'RecommendedStaff_FrontDesk', 'RecommendedStaff_Housekeeping', 'RecommendedStaff_Restaurant', 'ActualScheduled_FrontDesk', 'ActualScheduled_Housekeeping', 'ActualScheduled_Restaurant', 'OptimizedStatus'];
      rows = filtered.map(r => ({
        'Date': r.date,
        'PredictedOccupancy': `${r.predictedOccupancy}%`,
        'PredictedGuests': r.predictedGuests,
        'RecommendedStaff_FrontDesk': r.recommendedStaff?.['Front Desk'] || 0,
        'RecommendedStaff_Housekeeping': r.recommendedStaff?.['Housekeeping'] || 0,
        'RecommendedStaff_Restaurant': r.recommendedStaff?.['Restaurant Services'] || 0,
        'ActualScheduled_FrontDesk': r.actualStaffScheduled?.['Front Desk'] || 0,
        'ActualScheduled_Housekeeping': r.actualStaffScheduled?.['Housekeeping'] || 0,
        'ActualScheduled_Restaurant': r.actualStaffScheduled?.['Restaurant Services'] || 0,
        'OptimizedStatus': r.optimized ? 'Optimized' : 'Draft Schedule'
      }));
      filename = `staffing_report_${startDate || 'start'}_to_${endDate || 'end'}.csv`;

    } else if (type === 'revenue') {
      const history = await db.collection('occupancyHistory').find();
      const filtered = history.filter(h => {
        if (startDate && h.date < startDate) return false;
        if (endDate && h.date > endDate) return false;
        return true;
      }).sort((a, b) => new Date(a.date) - new Date(b.date));

      headers = ['Date', 'RoomsOccupied', 'EstimatedRoomRevenue', 'GuestDiningRevenue', 'TotalRevenue'];
      rows = filtered.map(h => {
        const roomRev = Math.round((h.roomsOccupied || 0) * 150);
        const diningRev = Math.max(0, (h.revenue || 0) - roomRev);
        return {
          'Date': h.date,
          'RoomsOccupied': h.roomsOccupied,
          'EstimatedRoomRevenue': `₹${roomRev}`,
          'GuestDiningRevenue': `₹${diningRev}`,
          'TotalRevenue': `₹${h.revenue || 0}`
        };
      });
      filename = `revenue_report_${startDate || 'start'}_to_${endDate || 'end'}.csv`;

    } else if (type === 'performance') {
      const employees = await db.collection('employees').find();
      
      headers = ['EmployeeName', 'Department', 'Shift', 'MonthlySalary', 'PerformanceRating', 'AttendanceRate'];
      rows = employees.map(emp => {
        const att = emp.attendance || [];
        const presentDays = att.filter(a => a.status === 'present').length;
        const totalTracked = att.length;
        const attRate = totalTracked > 0 ? `${Math.round((presentDays / totalTracked) * 100)}%` : '100%';

        return {
          'EmployeeName': emp.name,
          'Department': emp.department,
          'Shift': emp.shift,
          'MonthlySalary': `₹${emp.salary}`,
          'PerformanceRating': `${emp.performance} / 5.0`,
          'AttendanceRate': attRate
        };
      });
      filename = `employee_performance_report.csv`;
    }

    const csvContent = convertToCSV(headers, rows);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    return res.status(200).send(csvContent);

  } catch (error) {
    console.error('Export Report Error:', error);
    return res.status(500).json({ message: 'Server error generating spreadsheet export' });
  }
};

module.exports = {
  exportReport
};
