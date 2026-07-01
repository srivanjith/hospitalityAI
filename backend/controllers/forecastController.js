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

// Helper to generate dynamic insights based on adjusted occupancy and date
const generateForecastInsights = (dateStr, occupancy) => {
  const targetDate = new Date(dateStr);
  const day = targetDate.getDay();
  const month = targetDate.getMonth();
  const monthDayStr = `${String(month + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
  
  const insights = [];
  const holiday = mlService.HOLIDAYS_EVENTS[monthDayStr];
  if (holiday) {
    insights.push(`Holiday surge for ${holiday.name} (+${holiday.impact}% demand expected). Ensure all shifts are fully staffed.`);
  }

  if (occupancy >= 85) {
    insights.push("Critically high occupancy (>85%) predicted. Housekeeping requires double allocation. Consider scheduling a backup receptionist.");
  } else if (occupancy >= 60) {
    insights.push("Moderate-to-high occupancy expected. Standard staffing levels recommended across all shifts.");
  } else if (occupancy < 35) {
    insights.push("Low demand window. Staffing counts minimized. Save labor costs by offering voluntary time off or scheduling maintenance work.");
  }

  if (day === 5 || day === 6) {
    insights.push("Weekend peak check-in patterns. Front desk staffing levels increased to prevent bottlenecks.");
  }

  return insights;
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
    const totalRooms = hotels[0]?.totalRooms || 500;
    
    // 1. Get raw forecasts from ML engine
    const rawForecasts = await mlService.getForecastRange(start, numDays, totalRooms);
    
    // 2. Decorate forecasts with actual scheduled numbers from active employee database
    const decoratedForecasts = [];
    const todayStr = new Date().toISOString().split('T')[0];
    const activeStaffCounts = await getActiveStaffCounts();

    // Fetch active bookings (non-cancelled) to match guests present on each date
    const bookings = await db.collection('bookings').find();
    const activeBookings = bookings.filter(b => b.status !== 'cancelled');

    for (const f of rawForecasts) {
      // Find active bookings present on this date
      const bookingsOnDate = activeBookings.filter(b => {
        const checkInStr = b.checkIn.split('T')[0];
        const checkOutStr = b.checkOut.split('T')[0];
        return checkInStr <= f.date && checkOutStr > f.date;
      });

      let actualGuestsCount = 0;
      bookingsOnDate.forEach(b => {
        actualGuestsCount += (b.guestsCount || 0);
      });
      const actualRoomsOccupied = bookingsOnDate.length;

      // Adjust predicted stats based on actual present bookings
      if (f.date <= todayStr) {
        f.roomsOccupied = actualRoomsOccupied;
        f.predictedOccupancy = Math.round((actualRoomsOccupied / totalRooms) * 100);
        f.predictedGuests = actualGuestsCount;
      } else {
        f.roomsOccupied = Math.max(f.roomsOccupied || 0, actualRoomsOccupied);
        f.predictedOccupancy = Math.max(f.predictedOccupancy || 0, Math.round((f.roomsOccupied / totalRooms) * 100));
        f.predictedGuests = Math.max(f.predictedGuests || 0, actualGuestsCount);
      }

      // Recalculate staff optimization/recommendation based on actual present guests
      f.recommendedStaff = mlService.calculateStaffForOccupancy(f.predictedOccupancy, f.predictedGuests);
      
      // Update insights based on new occupancy levels
      f.insights = generateForecastInsights(f.date, f.predictedOccupancy);

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
      
      // Fetch bookings and count active guests/rooms for this date
      const bookings = await db.collection('bookings').find();
      const activeBookings = bookings.filter(b => b.status !== 'cancelled');
      const bookingsOnDate = activeBookings.filter(b => {
        const checkInStr = b.checkIn.split('T')[0];
        const checkOutStr = b.checkOut.split('T')[0];
        return checkInStr <= date && checkOutStr > date;
      });

      let actualGuestsCount = 0;
      bookingsOnDate.forEach(b => {
        actualGuestsCount += (b.guestsCount || 0);
      });
      const actualRoomsOccupied = bookingsOnDate.length;

      const hotels = await db.collection('hotels').find();
      const totalRooms = hotels[0]?.totalRooms || 500;
      const todayStr = new Date().toISOString().split('T')[0];

      if (date <= todayStr) {
        prediction.roomsOccupied = actualRoomsOccupied;
        prediction.predictedOccupancy = Math.round((actualRoomsOccupied / totalRooms) * 100);
        prediction.predictedGuests = actualGuestsCount;
      } else {
        prediction.roomsOccupied = Math.max(prediction.roomsOccupied || 0, actualRoomsOccupied);
        prediction.predictedOccupancy = Math.max(prediction.predictedOccupancy || 0, Math.round((prediction.roomsOccupied / totalRooms) * 100));
        prediction.predictedGuests = Math.max(prediction.predictedGuests || 0, actualGuestsCount);
      }

      prediction.recommendedStaff = mlService.calculateStaffForOccupancy(prediction.predictedOccupancy, prediction.predictedGuests);
      prediction.insights = generateForecastInsights(date, prediction.predictedOccupancy);
      
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
    const todayStr = new Date().toISOString().split('T')[0];
    const notifications = await db.collection('notifications').find();
    // Filter out notifications with a future date
    const filtered = notifications.filter(n => !n.date || n.date <= todayStr);
    // Sort: newest first
    const sorted = filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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

// @desc    Delete all notifications
// @route   DELETE /api/forecasts/notifications
// @access  Private
const deleteAllNotifications = async (req, res) => {
  try {
    await db.collection('notifications').deleteMany({});
    return res.json({ message: 'All notifications cleared successfully' });
  } catch (error) {
    console.error('Delete All Notifications Error:', error);
    return res.status(500).json({ message: 'Server error clearing notifications' });
  }
};

// @desc    Delete a notification
// @route   DELETE /api/forecasts/notifications/:id
// @access  Private
const deleteNotification = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.collection('notifications').deleteOne({ id });
    if (result.deletedCount === 0) {
      await db.collection('notifications').deleteOne({ _id: id });
    }
    return res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete Notification Error:', error);
    return res.status(500).json({ message: 'Server error deleting notification' });
  }
};

module.exports = {
  getForecast,
  optimizeShifts,
  getNotifications,
  markNotificationsRead,
  deleteNotification,
  deleteAllNotifications
};
