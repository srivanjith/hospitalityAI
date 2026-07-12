const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { connectDB, disconnectDB, db } = require('../config/db');

// Roster of names for generating high-volume bookings
const FIRST_NAMES = ['Arjun','Priya','Rahul','Ananya','Vikram','Sneha','Kiran','Deepa','Suresh','Meera',
  'Ravi','Kavya','Aditya','Pooja','Nikhil','Divya','Amit','Swati','Rajesh','Neha',
  'Sanjay','Lakshmi','Vijay','Asha','Mohan','Rekha','Arun','Sunita','Ganesh','Bhavna',
  'James', 'Emma', 'Liam', 'Olivia', 'William', 'Sophia', 'Lucas', 'Mia', 'Henry', 'Charlotte'];
const LAST_NAMES = ['Sharma','Patel','Kumar','Singh','Gupta','Reddy','Nair','Iyer','Joshi','Mehta',
  'Carter', 'Watson', 'Neeson', 'Wilde', 'Defoe', 'Loren', 'Black', 'Wood', 'Cavill', 'Franklin'];

const ROOM_TYPES = ['Standard Room', 'Deluxe Room', 'Executive Suite', 'Presidential Suite'];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function seedFullBookings() {
  console.log('🔗 Connecting to MongoDB...');
  await connectDB();

  // Get hotel ID
  const hotels = await db.collection('hotels').find();
  const hotelId = hotels[0]?.id || hotels[0]?._id;
  const totalRooms = hotels[0]?.totalRooms || 500;

  console.log('🧹 Clearing existing bookings in the active window (past 5 days to next 10 days)...');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const windowStart = new Date(today);
  windowStart.setDate(today.getDate() - 5);
  const windowEnd = new Date(today);
  windowEnd.setDate(today.getDate() + 10);

  await db.collection('bookings').deleteMany({
    checkIn: { $gte: windowStart.toISOString(), $lte: windowEnd.toISOString() }
  });

  const bookingsToInsert = [];

  // To achieve ~300-380 concurrent bookings, we generate ~120 check-ins per day
  // with stay durations of 2-3 nights.
  let cursor = new Date(windowStart);
  while (cursor <= windowEnd) {
    const cursorStr = cursor.toISOString().split('T')[0];
    
    // Determine target check-ins for this date (between 100 and 140)
    const checkInsCount = randInt(110, 135);
    
    for (let i = 0; i < checkInsCount; i++) {
      const stayNights = randInt(2, 3);
      const checkInDate = new Date(cursor);
      
      const checkOutDate = new Date(cursor);
      checkOutDate.setDate(cursor.getDate() + stayNights);
      
      const guestName = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
      const roomType = pick(ROOM_TYPES);
      const guestsCount = randInt(1, 3);

      let rate = 120;
      if (roomType === 'Deluxe Room') rate = 180;
      if (roomType === 'Executive Suite') rate = 280;
      if (roomType === 'Presidential Suite') rate = 450;
      
      const revenue = rate * stayNights;

      // Status logic:
      // - Check-in in the past: checked-out or checked-in
      // - Check-in today: checked-in
      // - Check-in future: booked
      let status = 'booked';
      const checkInStr = checkInDate.toISOString().split('T')[0];
      const todayStr = today.toISOString().split('T')[0];
      
      if (checkInStr < todayStr) {
        status = Math.random() > 0.3 ? 'checked-out' : 'checked-in';
      } else if (checkInStr === todayStr) {
        status = 'checked-in';
      }

      bookingsToInsert.push({
        hotelId,
        guestName,
        roomType,
        checkIn: checkInDate.toISOString(),
        checkOut: checkOutDate.toISOString(),
        checkInTime: '14:00',
        checkOutTime: '12:00',
        guestsCount,
        status,
        revenue
      });
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  console.log(`🌱 Inserting ${bookingsToInsert.length} detailed bookings...`);
  
  // Insert in chunks of 500 to keep it lightweight
  for (let i = 0; i < bookingsToInsert.length; i += 500) {
    const chunk = bookingsToInsert.slice(i, i + 500);
    await db.collection('bookings').insertMany(chunk);
    console.log(`   ✅ Seeded chunk ${i / 500 + 1}`);
  }

  // Adjust occupancy history for these dates to stay perfectly synchronized
  console.log('🔄 Re-aligning occupancyHistory records...');
  
  // Clean occupancy history in this window first
  await db.collection('occupancyHistory').deleteMany({
    date: { $gte: windowStart.toISOString().split('T')[0], $lte: windowEnd.toISOString().split('T')[0] }
  });

  // Calculate day-by-day stats
  const activeBookingsByDate = {};
  for (const b of bookingsToInsert) {
    const startStr = b.checkIn.split('T')[0];
    const endStr = b.checkOut.split('T')[0];
    
    // dates range
    const d = new Date(startStr);
    const endD = new Date(endStr);
    while (d < endD) {
      const dStr = d.toISOString().split('T')[0];
      if (!activeBookingsByDate[dStr]) {
        activeBookingsByDate[dStr] = { rooms: 0, guests: 0, revenue: 0 };
      }
      activeBookingsByDate[dStr].rooms++;
      activeBookingsByDate[dStr].guests += b.guestsCount;
      activeBookingsByDate[dStr].revenue += Math.round(b.revenue / ((endD - new Date(startStr)) / 86400000 || 1));
      
      d.setDate(d.getDate() + 1);
    }
  }

  const occupancyDocs = [];
  for (const [dateStr, stats] of Object.entries(activeBookingsByDate)) {
    const pct = Math.round((stats.rooms / totalRooms) * 1000) / 10;
    occupancyDocs.push({
      date: dateStr,
      roomsOccupied: stats.rooms,
      occupancyPercentage: pct,
      guestCount: stats.guests,
      revenue: stats.revenue
    });
  }

  await db.collection('occupancyHistory').insertMany(occupancyDocs);
  console.log(`✅ Re-seeded ${occupancyDocs.length} occupancyHistory records!`);

  await disconnectDB();
  console.log('🔌 Closed connection successfully.');
  process.exit(0);
}

seedFullBookings().catch(async err => {
  console.error('❌ Seeding failed:', err);
  await disconnectDB();
  process.exit(1);
});
