const { db } = require('../config/db');
const mlService = require('../services/mlService');
const notificationService = require('../services/notificationService');

// Helper to count scheduled staff by department for a date
const getScheduledStaffForDate = async (dateStr) => {
  const employees = await db.collection('employees').find({ status: 'active' });
  const counts = {
    'Front Desk': 0,
    'Housekeeping': 0,
    'Restaurant Services': 0,
    'Security': 0,
    'Maintenance': 0
  };

  employees.forEach(emp => {
    // Check if employee is marked absent/leave on this date
    const attendance = (emp.attendance || []).find(a => a.date === dateStr);
    if (attendance && (attendance.status === 'absent' || attendance.status === 'leave')) {
      return; // Not working
    }
    
    // Add to department count if department matches
    if (counts[emp.department] !== undefined) {
      counts[emp.department]++;
    }
  });

  return counts;
};

// Helper to count total active staff by department
const getActiveStaffCounts = async () => {
  const employees = await db.collection('employees').find({ status: 'active' });
  const counts = {
    'Front Desk': 0,
    'Housekeeping': 0,
    'Restaurant Services': 0,
    'Security': 0,
    'Maintenance': 0
  };

  employees.forEach(emp => {
    if (counts[emp.department] !== undefined) {
      counts[emp.department]++;
    }
  });

  return counts;
};

// @desc    Get occupancy forecasting and staffing recommendations for a range
// @route   GET /api/forecasts
// @access  Private
const getForecast = async (req, res) => {
  const { startDate, days } = req.query;
  const numDays = days ? Number(days) : 7;
  const start = startDate || new Date().toISOString().split('T')[0];

  try {
    const hotels = await db.collection('hotels').find();
    const totalRooms = hotels[0]?.totalRooms || 120;
    
    // 1. Get raw forecasts from ML engine
    const rawForecasts = await mlService.getForecastRange(start, numDays, totalRooms);
    
    // 2. Decorate forecasts with actual scheduled numbers from active employee database
    const decoratedForecasts = [];
    const todayStr = new Date().toISOString().split('T')[0];
    const activeStaffCounts = await getActiveStaffCounts();

    for (const f of rawForecasts) {
      if (f.date === todayStr) {
        const checkedInBookings = await db.collection('bookings').find({ status: 'checked-in' });
        let actualGuestsCount = 0;
        const actualRoomsOccupied = checkedInBookings.filter(b => {
          const checkInDate = b.checkIn instanceof Date ? b.checkIn.toISOString().split('T')[0] : (typeof b.checkIn === 'string' ? b.checkIn.split('T')[0] : '');
          const checkOutDate = b.checkOut instanceof Date ? b.checkOut.toISOString().split('T')[0] : (typeof b.checkOut === 'string' ? b.checkOut.split('T')[0] : '');
          const isActive = f.date >= checkInDate && f.date < checkOutDate;
          if (isActive) {
            actualGuestsCount += (b.guestsCount || 0);
          }
          return isActive;
        }).length;
        
        f.roomsOccupied = actualRoomsOccupied;
        f.predictedOccupancy = Math.round((actualRoomsOccupied / totalRooms) * 100);
        f.predictedGuests = actualGuestsCount;
      }

      const actualStaff = await getScheduledStaffForDate(f.date);
      
      // Check if we have a manually optimized state saved in DB
      let savedRec = await db.collection('recommendations').findOne({ date: f.date });
      
      let finalForecast;
      let adjustedStaffScheduled;

      if (savedRec) {
        adjustedStaffScheduled = { ...savedRec.actualStaffScheduled };
        
        if (savedRec.optimized) {
          // If optimized, subtract any absences on that date from the optimized count
          for (const dept of Object.keys(adjustedStaffScheduled)) {
            const totalActive = activeStaffCounts[dept] || 0;
            const totalPresent = actualStaff[dept] || 0;
            const absentCount = Math.max(0, totalActive - totalPresent);
            adjustedStaffScheduled[dept] = Math.max(0, adjustedStaffScheduled[dept] - absentCount);
          }
        } else {
          // If not optimized, actual staff is just the present/available staff
          adjustedStaffScheduled = actualStaff;
        }

        finalForecast = {
          ...f,
          actualStaffScheduled: adjustedStaffScheduled,
          optimized: savedRec.optimized,
          insights: savedRec.insights.length ? savedRec.insights : f.insights
        };
      } else {
        adjustedStaffScheduled = actualStaff;
        finalForecast = {
          ...f,
          actualStaffScheduled: adjustedStaffScheduled,
          optimized: false
        };
      }

      // 3. Proactively check and generate notifications/alerts for staffing deviations
      await notificationService.checkAndGenerateAlerts(finalForecast);
      
      // Save or update recommendation in database to track status
      if (savedRec) {
        await db.collection('recommendations').findByIdAndUpdate(savedRec.id || savedRec._id, {
          $set: {
            predictedOccupancy: finalForecast.predictedOccupancy,
            predictedGuests: finalForecast.predictedGuests,
            recommendedStaff: finalForecast.recommendedStaff,
            // Keep the original, unadjusted target counts in the database if optimized
            actualStaffScheduled: savedRec.optimized ? savedRec.actualStaffScheduled : finalForecast.actualStaffScheduled,
            insights: finalForecast.insights
          }
        });
      } else {
        await db.collection('recommendations').create({
          date: finalForecast.date,
          predictedOccupancy: finalForecast.predictedOccupancy,
          predictedGuests: finalForecast.predictedGuests,
          recommendedStaff: finalForecast.recommendedStaff,
          actualStaffScheduled: finalForecast.actualStaffScheduled,
          optimized: false,
          insights: finalForecast.insights
        });
      }

      decoratedForecasts.push(finalForecast);
    }

    return res.json(decoratedForecasts);
  } catch (error) {
    console.error('Fetch Forecast Error:', error);
    return res.status(500).json({ message: 'Server error generating forecasts' });
  }
};

// @desc    Auto-optimize shifts for a specific date
// @route   POST /api/forecasts/optimize
// @access  Private
const optimizeShifts = async (req, res) => {
  const { date } = req.body;

  try {
    if (!date) {
      return res.status(400).json({ message: 'Please provide a target date for optimization' });
    }

    let rec = await db.collection('recommendations').findOne({ date });
    if (!rec) {
      // Generate forecast first if not present
      const history = await db.collection('occupancyHistory').find();
      const model = mlService.fitForecastingModel(history);
      const prediction = mlService.predictForDate(date, model);
      
      rec = await db.collection('recommendations').create({
        date,
        predictedOccupancy: prediction.predictedOccupancy,
        predictedGuests: prediction.predictedGuests,
        recommendedStaff: prediction.recommendedStaff,
        actualStaffScheduled: prediction.recommendedStaff, // set to match immediately
        optimized: true,
        insights: ['Shifts automatically optimized: scheduled workforce matches recommendations exactly.']
      });
    } else {
      // Update scheduled to match recommended exactly (simulating automated schedule adjustments)
      const adjustedStaff = { ...rec.recommendedStaff };
      const newInsights = [
        ...rec.insights.filter(i => !i.includes('optimized')),
        `Shifts automatically optimized on ${new Date().toLocaleDateString()}. Work shifts adjusted to match forecast requirements.`
      ];

      await db.collection('recommendations').findByIdAndUpdate(rec.id || rec._id, {
        $set: {
          actualStaffScheduled: adjustedStaff,
          optimized: true,
          insights: newInsights
        }
      });
    }

    // Clear staffing alerts for this date since we optimized it!
    await db.collection('notifications').deleteMany({
      type: 'staffing',
      date
    });

    // Create confirmation system notification
    await notificationService.createNotification(
      'system',
      'Shifts Auto-Optimized',
      `Staff scheduling has been balanced for ${date} according to guest forecast demand.`,
      date
    );

    const updatedRec = await db.collection('recommendations').findOne({ date });
    return res.json(updatedRec);
  } catch (error) {
    console.error('Optimize Shifts Error:', error);
    return res.status(500).json({ message: 'Server error during shift optimization' });
  }
};

// @desc    Get active notifications list
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const notifications = await db.collection('notifications').find();
    // Sort: newest first
    const sorted = notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json(sorted);
  } catch (error) {
    console.error('Fetch Notifications Error:', error);
    return res.status(500).json({ message: 'Server error fetching notifications' });
  }
};

// @desc    Mark notifications as read
// @route   PUT /api/notifications/read
// @access  Private
const markNotificationsRead = async (req, res) => {
  try {
    await db.collection('notifications').updateMany({ read: false }, { $set: { read: true } });
    return res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Read Notifications Error:', error);
    return res.status(500).json({ message: 'Server error marking notifications read' });
  }
};

module.exports = {
  getForecast,
  optimizeShifts,
  getNotifications,
  markNotificationsRead
};
