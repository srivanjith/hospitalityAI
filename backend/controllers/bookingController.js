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
  const { guestName, roomType, checkIn, checkOut, guestsCount } = req.body;

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

module.exports = {
  getBookings,
  addBooking,
  updateBookingStatus,
  getOccupancyAnalytics
};
