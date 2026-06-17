const { db } = require('../config/db');
const groqService = require('../services/groqService');

const fetchDataSnapshot = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];


    const allHistory = await db.collection('occupancyHistory').find();
    const sorted = allHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
    const last30 = sorted.slice(-30);

    const allBookings = await db.collection('bookings').find();
    const activeBookings = allBookings.filter(b => {
      const checkIn = (b.checkIn || '').toString().split('T')[0];
      const checkOut = (b.checkOut || '').toString().split('T')[0];
      return checkIn <= today && checkOut > today;
    });

    const totalRevenue = allBookings
      .filter(b => (b.checkIn || '').toString().split('T')[0].startsWith(today.slice(0, 7)))
      .reduce((sum, b) => sum + (b.revenue || 0), 0);

    const employees = await db.collection('employees').find({ status: 'active' });
    const byDept = {};
    employees.forEach(e => {
      byDept[e.department] = (byDept[e.department] || 0) + 1;
    });

    const recs = await db.collection('recommendations').find();
    const latestRecs = recs.sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-7);

    const notifications = await db.collection('notifications').find({ read: false });

    const hotels = await db.collection('hotels').find();
    const totalRooms = hotels[0]?.totalRooms || 120;

    return {
      today,
      totalRooms,
      activeBookingsCount: activeBookings.length,
      currentOccupancyPct: Math.round((activeBookings.length / totalRooms) * 100),
      monthlyRevenueSoFar: totalRevenue,
      activeEmployeesByDepartment: byDept,
      totalActiveEmployees: employees.length,
      last30DaysOccupancyHistory: last30.map(h => ({
        date: h.date,
        occupancy: h.occupancyPercentage,
        guests: h.guestCount,
        revenue: h.revenue
      })),
      upcomingForecasts: latestRecs.map(r => ({
        date: r.date,
        predictedOccupancy: r.predictedOccupancy,
        recommendedStaff: r.recommendedStaff,
        actualStaffScheduled: r.actualStaffScheduled,
        optimized: r.optimized
      })),
      unreadNotifications: notifications.length
    };
  } catch (err) {
    console.error('Snapshot fetch error:', err);
    return {};
  }
};

const aiChat = async (req, res) => {
  try {
    const { message, pageContext, conversationHistory = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Please provide a message' });
    }

    // Fetch live database snapshot
    const snapshot = await fetchDataSnapshot();

    const systemPrompt = `You are HospitalityAI, an intelligent hotel management assistant built into the HospitalityAI platform. You help hotel managers and admins make data-driven decisions.

The manager is currently on the "${pageContext || 'dashboard'}" page.

Here is the LIVE data snapshot from the hotel database as of ${snapshot.today}:

HOTEL OVERVIEW:
- Total rooms: ${snapshot.totalRooms}
- Currently occupied rooms: ${snapshot.activeBookingsCount} (${snapshot.currentOccupancyPct}% occupancy)
- Monthly revenue so far: ₹${(snapshot.monthlyRevenueSoFar || 0).toLocaleString()}
- Unread alerts: ${snapshot.unreadNotifications}

ACTIVE STAFF BY DEPARTMENT:
${JSON.stringify(snapshot.activeEmployeesByDepartment, null, 2)}
Total active employees: ${snapshot.totalActiveEmployees}

LAST 30 DAYS OCCUPANCY HISTORY (most recent last):
${JSON.stringify(snapshot.last30DaysOccupancyHistory, null, 2)}

UPCOMING FORECASTS & STAFFING:
${JSON.stringify(snapshot.upcomingForecasts, null, 2)}

INSTRUCTIONS:
- Answer the manager's question analytically using the above data
- Be concise but insightful — use numbers, percentages, and trends from the data
- If asked about staffing gaps, compare recommendedStaff vs actualStaffScheduled for each department
- If asked about revenue or occupancy trends, calculate averages/changes from the history
- Format your response cleanly (use bullet points or short paragraphs as appropriate)
- If data is insufficient to answer, say so honestly
- Never fabricate numbers not present in the data above`;

    // Build conversation messages
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-6), // keep last 6 turns for context
      { role: 'user', content: message }
    ];

    const reply = await groqService.chat(messages, 'llama-3.3-70b-versatile', 1024);

    return res.json({
      reply,
      snapshot: {
        today: snapshot.today,
        occupancyPct: snapshot.currentOccupancyPct,
        activeBookings: snapshot.activeBookingsCount
      }
    });

  } catch (error) {
    console.error('AI Chat Error:', error);
    if (error.message.includes('GROQ_API_KEY')) {
      return res.status(503).json({ message: 'AI service not configured. Please set GROQ_API_KEY in backend .env file.' });
    }
    return res.status(500).json({ message: 'AI service error: ' + error.message });
  }
};

// ─────────────────────────────────────────────────────────────
//  Helper: Generate a batch of occupancy records via Groq
// ─────────────────────────────────────────────────────────────
const generateOccupancyBatch = async (startDate, endDate) => {
  const prompt = `Generate realistic daily hotel occupancy history data for a 4-star hotel in India with 120 rooms.
Generate records for each day from ${startDate} to ${endDate}.
Consider: Indian festivals (Diwali, Holi, Eid, Christmas), weekends having higher occupancy, summer season (Apr-Jun) being peak.
Occupancy should vary between 25% and 98% depending on season/events.

Return a JSON array where each element is an object with these fields:
- date: "YYYY-MM-DD"
- occupancyPercentage: number (25 to 98)
- guestCount: number (roughly occupancyPercentage/100 * 120 * 1.7)
- roomsOccupied: number (roughly occupancyPercentage/100 * 120)
- revenue: number in INR (roomsOccupied * a nightly rate between 3500 and 8500 depending on occupancy)

Return ONLY the raw JSON array, no other text.`;

  const result = await groqService.generateJSON(prompt, 8192);
  return Array.isArray(result) ? result : [];
};

// ─────────────────────────────────────────────────────────────
//  Helper: Generate booking records via Groq
// ─────────────────────────────────────────────────────────────
const generateBookingBatch = async (startDate, endDate, hotelId) => {
  const prompt = `Generate realistic hotel booking records for a 4-star hotel in India (hotel ID: "${hotelId}").
Generate approximately 80 bookings with check-in dates between ${startDate} and ${endDate}.
Use common Indian guest names, a mix of room types (Standard, Deluxe, Suite, Executive).
Stays should be 1-5 nights mostly, with some longer ones.

Return a JSON array where each element has:
- hotelId: "${hotelId}"
- guestName: string (realistic Indian names)
- roomType: "Standard" | "Deluxe" | "Suite" | "Executive"
- checkIn: "YYYY-MM-DD"
- checkOut: "YYYY-MM-DD" (checkIn + 1 to 5 days)
- guestsCount: number (1 to 4)
- status: "checked-out" (for past dates)
- revenue: number in INR (Standard: 3500-5000, Deluxe: 5000-7500, Suite: 8000-12000, Executive: 6000-9000 per night * nights)

Return ONLY the raw JSON array, no other text.`;

  const result = await groqService.generateJSON(prompt, 8192);
  return Array.isArray(result) ? result : [];
};

// ─────────────────────────────────────────────────────────────
//  @desc    Seed synthetic data into MongoDB using Groq
//  @route   POST /api/ai/seed
//  @access  Private (Admin only)
// ─────────────────────────────────────────────────────────────
const seedData = async (req, res) => {
  try {
    // Admin-only guard
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required to seed data' });
    }

    const startDate = req.body.startDate || '2025-01-01';
    const endDate = req.body.endDate || new Date().toISOString().split('T')[0];

    // Ensure we have a hotel record
    let hotels = await db.collection('hotels').find();
    let hotelId;
    if (!hotels.length) {
      const hotel = await db.collection('hotels').create({
        name: 'The Grand Palace Hotel',
        location: 'Mumbai, Maharashtra, India',
        totalRooms: 120
      });
      hotelId = hotel.id || hotel._id;
    } else {
      hotelId = hotels[0].id || hotels[0]._id;
    }

    const progress = [];
    let totalOccupancy = 0;
    let totalBookings = 0;

    // ── Step 1: Generate occupancy history in 3-month batches ──
    progress.push('📊 Generating occupancy history with Groq AI...');

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Split into ~3-month chunks to stay within Groq token limits
    let cursor = new Date(start);
    while (cursor <= end) {
      const chunkEnd = new Date(cursor);
      chunkEnd.setMonth(chunkEnd.getMonth() + 3);
      if (chunkEnd > end) chunkEnd.setTime(end.getTime());

      const chunkStartStr = cursor.toISOString().split('T')[0];
      const chunkEndStr = chunkEnd.toISOString().split('T')[0];

      progress.push(`  → Generating occupancy data: ${chunkStartStr} to ${chunkEndStr}`);

      // Check existing dates to avoid duplicates
      const existingHistory = await db.collection('occupancyHistory').find();
      const existingDates = new Set(existingHistory.map(h => h.date));

      const batch = await generateOccupancyBatch(chunkStartStr, chunkEndStr);
      const toInsert = batch.filter(r => r.date && !existingDates.has(r.date));

      if (toInsert.length > 0) {
        await db.collection('occupancyHistory').insertMany(toInsert);
        totalOccupancy += toInsert.length;
        progress.push(`  ✅ Inserted ${toInsert.length} occupancy records`);
      } else {
        progress.push(`  ⚠️ All dates in this range already exist, skipping`);
      }

      cursor.setMonth(cursor.getMonth() + 3);
      cursor.setDate(cursor.getDate() + 1);
    }

    // ── Step 2: Generate bookings in 6-month batches ──
    progress.push('🏨 Generating booking records with Groq AI...');

    let bookingCursor = new Date(start);
    while (bookingCursor <= end) {
      const chunkEnd = new Date(bookingCursor);
      chunkEnd.setMonth(chunkEnd.getMonth() + 6);
      if (chunkEnd > end) chunkEnd.setTime(end.getTime());

      const chunkStartStr = bookingCursor.toISOString().split('T')[0];
      const chunkEndStr = chunkEnd.toISOString().split('T')[0];

      progress.push(`  → Generating bookings: ${chunkStartStr} to ${chunkEndStr}`);

      const batch = await generateBookingBatch(chunkStartStr, chunkEndStr, hotelId.toString());

      if (batch.length > 0) {
        await db.collection('bookings').insertMany(batch);
        totalBookings += batch.length;
        progress.push(`  ✅ Inserted ${batch.length} booking records`);
      }

      bookingCursor.setMonth(bookingCursor.getMonth() + 6);
      bookingCursor.setDate(bookingCursor.getDate() + 1);
    }

    progress.push(`🎉 Seeding complete! Inserted ${totalOccupancy} occupancy records and ${totalBookings} bookings.`);

    return res.json({
      success: true,
      summary: {
        occupancyRecordsInserted: totalOccupancy,
        bookingsInserted: totalBookings,
        dateRange: { start: startDate, end: endDate }
      },
      progress
    });

  } catch (error) {
    console.error('Seed Data Error:', error);
    if (error.message.includes('GROQ_API_KEY')) {
      return res.status(503).json({ message: 'AI service not configured. Please set GROQ_API_KEY in backend .env file.' });
    }
    return res.status(500).json({ message: 'Seeding failed: ' + error.message });
  }
};

module.exports = { aiChat, seedData };
