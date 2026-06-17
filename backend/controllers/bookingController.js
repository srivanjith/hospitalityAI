const { db } = require('../config/db');

// Helper to get dates between check-in and check-out (exclusive of check-out day)
const getDatesRange = (startStr, endStr) => {
  const dates = [];
  const start = new Date(startStr);
  const end = new Date(endStr);
  
  // Set time to midnight to prevent issues
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  const current = new Date(start);
  while (current < end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

// Helper to update occupancy history for a range of dates
const adjustOccupancyHistory = async (dates, deltaRooms, deltaGuests, deltaRevenue) => {
  const hotels = await db.collection('hotels').find();
  const totalRooms = hotels[0]?.totalRooms || 100;

  for (const dateStr of dates) {
    let hist = await db.collection('occupancyHistory').findOne({ date: dateStr });
    
    if (hist) {
      const roomsOccupied = Math.max(0, (hist.roomsOccupied || 0) + deltaRooms);
      const occupancyPercentage = Math.round((roomsOccupied / totalRooms) * 1000) / 10;
      const guestCount = Math.max(0, (hist.guestCount || 0) + deltaGuests);
      const revenue = Math.max(0, (hist.revenue || 0) + deltaRevenue);
      
      await db.collection('occupancyHistory').findByIdAndUpdate(hist.id || hist._id, {
        $set: {
          roomsOccupied,
          occupancyPercentage,
          guestCount,
          revenue
        }
      });
    } else {
      // If no history record exists yet (future date or missing), create it
      const roomsOccupied = Math.max(0, deltaRooms);
      const occupancyPercentage = Math.round((roomsOccupied / totalRooms) * 1000) / 10;
      
      await db.collection('occupancyHistory').create({
        date: dateStr,
        occupancyPercentage,
        guestCount: Math.max(0, deltaGuests),
        roomsOccupied,
        revenue: Math.max(0, deltaRevenue)
      });
    }
  }
};

// @desc    Get all bookings
// @route   GET /api/bookings
// @access  Private
const getBookings = async (req, res) => {
  try {
    const bookings = await db.collection('bookings').find();
    // Sort bookings: newest check-in first
    const sorted = bookings.sort((a, b) => new Date(b.checkIn) - new Date(a.checkIn));
    return res.json(sorted);
  } catch (error) {
    console.error('Fetch Bookings Error:', error);
    return res.status(500).json({ message: 'Server error fetching bookings' });
  }
};

// @desc    Add a new booking
// @route   POST /api/bookings
// @access  Private
const addBooking = async (req, res) => {
  const { guestName, roomType, checkIn, checkOut, checkInTime, checkOutTime, guestsCount } = req.body;

  try {
    if (!guestName || !roomType || !checkIn || !checkOut || !guestsCount) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkInDate = new Date(checkIn);
    if (checkInDate < today) {
      return res.status(400).json({ message: 'invalid date' });
    }

    const hotels = await db.collection('hotels').find();
    const hotelId = hotels[0]?.id || hotels[0]?._id;

    // Calculate dynamic pricing based on room type
    let rate = 120;
    if (roomType === 'Deluxe Room') rate = 180;
    if (roomType === 'Executive Suite') rate = 280;
    if (roomType === 'Presidential Suite') rate = 450;

    const stayDays = Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
    if (stayDays <= 0) {
      return res.status(400).json({ message: 'Check-out date must be after check-in date' });
    }
    const revenue = rate * stayDays;

    const newBooking = await db.collection('bookings').create({
      hotelId,
      guestName,
      roomType,
      checkIn,
      checkOut,
      checkInTime: checkInTime || '14:00',
      checkOutTime: checkOutTime || '12:00',
      guestsCount: Number(guestsCount),
      status: 'booked',
      revenue
    });

    // Update Occupancy History
    const dates = getDatesRange(checkIn, checkOut);
    const revenuePerNight = Math.round(revenue / stayDays);
    await adjustOccupancyHistory(dates, 1, Number(guestsCount), revenuePerNight);

    return res.status(201).json(newBooking);
  } catch (error) {
    console.error('Create Booking Error:', error);
    return res.status(500).json({ message: 'Server error creating booking' });
  }
};

// @desc    Update booking status (check-in / check-out / cancel)
// @route   PUT /api/bookings/:id/status
// @access  Private
const updateBookingStatus = async (req, res) => {
  const { status } = req.body; // 'checked-in' | 'checked-out' | 'cancelled'
  const bookingId = req.params.id;

  try {
    const booking = await db.collection('bookings').findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const prevStatus = booking.status;
    const updated = await db.collection('bookings').findByIdAndUpdate(
      bookingId,
      { $set: { status } }
    );

    const dates = getDatesRange(booking.checkIn, booking.checkOut);
    const stayDays = dates.length || 1;
    const revenuePerNight = Math.round(booking.revenue / stayDays);

    // If cancelled, deduct from occupancy history
    if (status === 'cancelled' && prevStatus !== 'cancelled') {
      await adjustOccupancyHistory(dates, -1, -Number(booking.guestsCount), -revenuePerNight);
    } 
    // If reactivated from cancelled (not common but good safety)
    else if (prevStatus === 'cancelled' && status !== 'cancelled') {
      await adjustOccupancyHistory(dates, 1, Number(booking.guestsCount), revenuePerNight);
    }

    return res.json({ ...booking, status });
  } catch (error) {
    console.error('Update Booking Status Error:', error);
    return res.status(500).json({ message: 'Server error updating booking status' });
  }
};

// @desc    Get historical occupancy metrics
// @route   GET /api/occupancy/analytics
// @access  Private
const getOccupancyAnalytics = async (req, res) => {
  try {
    const history = await db.collection('occupancyHistory').find();
    // Sort chronologically
    const sorted = history.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Take the last 30 days for short-term display, but return all for reports
    const limit = req.query.limit ? Number(req.query.limit) : 30;
    const recent = sorted.slice(-limit);

    // Calculate key analytics metrics
    const totalRooms = 120;
    let totalOccupiedSum = 0;
    let totalGuestsSum = 0;
    let totalRevenueSum = 0;

    recent.forEach(day => {
      totalOccupiedSum += day.roomsOccupied || 0;
      totalGuestsSum += day.guestCount || 0;
      totalRevenueSum += day.revenue || 0;
    });

    const avgOccupancy = recent.length 
      ? Math.round((recent.reduce((sum, day) => sum + day.occupancyPercentage, 0) / recent.length) * 10) / 10
      : 0;

    return res.json({
      summary: {
        avgOccupancy,
        totalGuests: totalGuestsSum,
        totalRevenue: totalRevenueSum,
        periodDays: recent.length
      },
      chartData: recent
    });
  } catch (error) {
    console.error('Occupancy Analytics Error:', error);
    return res.status(500).json({ message: 'Server error fetching occupancy analytics' });
  }
};


const getOccupancySuggestion = async (req, res) => {
  try {
    const mlService = require('../services/mlService');
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // ── A. Gather last 14 days of history around this day last year ──
    const lastYear = new Date(today);
    lastYear.setFullYear(lastYear.getFullYear() - 1);

    const lastYearStart = new Date(lastYear);
    lastYearStart.setDate(lastYearStart.getDate() - 3);
    const lastYearEnd = new Date(lastYear);
    lastYearEnd.setDate(lastYearEnd.getDate() + 10);

    const lYStartStr = lastYearStart.toISOString().split('T')[0];
    const lYEndStr   = lastYearEnd.toISOString().split('T')[0];

    const allHistory = await db.collection('occupancyHistory').find();

    // Last year same period actuals
    const lastYearActuals = allHistory
      .filter(h => h.date >= lYStartStr && h.date <= lYEndStr)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // ── B. ML model forecast for next 7 days ──
    const hotels = await db.collection('hotels').find();
    const totalRooms = hotels[0]?.totalRooms || 120;

    const rawForecasts = await mlService.getForecastRange(todayStr, 7, totalRooms);

    // ── C. Compute accuracy based on same-period last year vs ML prediction ──
    // For days where we have last year data, compare the ML prediction (retrained on same data position)
    // to what actually happened — then compute % accuracy
    const accuracyPoints = [];

    // Fit model on data UP TO (but not including) last year's window
    const trainingData = allHistory
      .filter(h => h.date < lYStartStr)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (trainingData.length >= 14 && lastYearActuals.length > 0) {
      const model = mlService.fitForecastingModel(trainingData);
      lastYearActuals.forEach(actual => {
        const predicted = mlService.predictForDate(actual.date, model, totalRooms);
        const error = Math.abs(predicted.predictedOccupancy - actual.occupancyPercentage);
        accuracyPoints.push({ error, actual: actual.occupancyPercentage, predicted: predicted.predictedOccupancy });
      });
    }

    const avgError = accuracyPoints.length
      ? accuracyPoints.reduce((s, p) => s + p.error, 0) / accuracyPoints.length
      : null;
    const accuracy = avgError !== null ? Math.max(0, Math.round((1 - avgError / 100) * 100)) : null;

    // ── D. Last year same day occupancy ──
    const lastYearSameDayStr = lastYear.toISOString().split('T')[0];
    const lastYearSameDay = allHistory.find(h => h.date === lastYearSameDayStr);

    // ── E. Trend: compare today's ML prediction vs last year same day ──
    const todayPrediction = rawForecasts[0]?.predictedOccupancy || 0;
    const lastYearOcc = lastYearSameDay?.occupancyPercentage || null;
    const trend = lastYearOcc !== null
      ? (todayPrediction > lastYearOcc ? 'up' : todayPrediction < lastYearOcc ? 'down' : 'stable')
      : 'unknown';
    const trendDiff = lastYearOcc !== null ? Math.round((todayPrediction - lastYearOcc) * 10) / 10 : 0;

    // ── F. Peak months insight (last year) ──
    const monthlyAvg = Array(12).fill(null).map(() => ({ sum: 0, count: 0 }));
    allHistory.forEach(h => {
      const m = new Date(h.date).getMonth();
      monthlyAvg[m].sum += h.occupancyPercentage;
      monthlyAvg[m].count++;
    });
    const peakMonth = monthlyAvg.reduce((best, m, idx) => {
      const avg = m.count > 0 ? m.sum / m.count : 0;
      return avg > (best.avg || 0) ? { idx, avg: Math.round(avg) } : best;
    }, {});
    const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    // ── G. Next 7-day forecast for chart ──
    const next7 = rawForecasts.map(f => ({
      date: f.date,
      predicted: f.predictedOccupancy,
      label: new Date(f.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' })
    }));

    // ── H. Last year same window for chart overlay ──
    const next7LastYear = next7.map(f => {
      const lyDate = new Date(f.date);
      lyDate.setFullYear(lyDate.getFullYear() - 1);
      const lyStr = lyDate.toISOString().split('T')[0];
      const actual = allHistory.find(h => h.date === lyStr);
      return { date: lyStr, actual: actual?.occupancyPercentage ?? null };
    });

    return res.json({
      today: todayStr,
      todayPrediction,
      lastYearSameDay: lastYearOcc,
      lastYearSameDayDate: lastYearSameDayStr,
      trend,
      trendDiff,
      modelAccuracy: accuracy,
      avgError: avgError !== null ? Math.round(avgError * 10) / 10 : null,
      totalHistoryDays: allHistory.length,
      peakMonth: peakMonth.idx !== undefined ? { name: MONTH_NAMES[peakMonth.idx], avg: peakMonth.avg } : null,
      next7Forecast: next7,
      next7LastYear,
      lastYearWindowData: lastYearActuals.map(h => ({
        date: h.date,
        occupancy: h.occupancyPercentage,
        revenue: h.revenue
      }))
    });
  } catch (error) {
    console.error('Occupancy Suggestion Error:', error);
    return res.status(500).json({ message: 'Server error generating occupancy suggestion' });
  }
};

module.exports = {
  getBookings,
  addBooking,
  updateBookingStatus,
  getOccupancyAnalytics,
  getOccupancySuggestion
};
