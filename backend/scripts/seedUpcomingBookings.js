const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { connectDB, disconnectDB, db } = require('../config/db');

async function seedUpcomingBookings() {
  console.log('🔗 Connecting to MongoDB...');
  await connectDB();

  // Get hotel ID
  const hotels = await db.collection('hotels').find();
  const hotelId = hotels[0]?.id || hotels[0]?._id;

  console.log('🧹 Clearing any existing bookings for July 11-18, 2026...');
  // We delete bookings checking in or active in this range to start clean
  await db.collection('bookings').deleteMany({
    checkIn: { $gte: '2026-07-11T00:00:00.000Z', $lte: '2026-07-18T23:59:59.999Z' }
  });

  const bookingsList = [
    // July 11: 3 check-ins
    { guestName: 'Arjun Sharma', checkIn: '2026-07-11T14:00:00.000Z', checkOut: '2026-07-13T12:00:00.000Z', guestsCount: 2, roomType: 'Deluxe Room', status: 'booked', revenue: 360 },
    { guestName: 'Priya Patel', checkIn: '2026-07-11T14:00:00.000Z', checkOut: '2026-07-12T12:00:00.000Z', guestsCount: 1, roomType: 'Standard Room', status: 'booked', revenue: 120 },
    { guestName: 'Rahul Verma', checkIn: '2026-07-11T14:00:00.000Z', checkOut: '2026-07-12T12:00:00.000Z', guestsCount: 2, roomType: 'Executive Suite', status: 'booked', revenue: 280 },

    // July 12: 4 check-ins
    { guestName: 'Ananya Nair', checkIn: '2026-07-12T14:00:00.000Z', checkOut: '2026-07-13T12:00:00.000Z', guestsCount: 2, roomType: 'Deluxe Room', status: 'booked', revenue: 180 },
    { guestName: 'Vikram Reddy', checkIn: '2026-07-12T14:00:00.000Z', checkOut: '2026-07-15T12:00:00.000Z', guestsCount: 2, roomType: 'Suite', status: 'booked', revenue: 540 },
    { guestName: 'Sneha Rao', checkIn: '2026-07-12T14:00:00.000Z', checkOut: '2026-07-14T12:00:00.000Z', guestsCount: 1, roomType: 'Standard Room', status: 'booked', revenue: 240 },
    { guestName: 'Kiran Singh', checkIn: '2026-07-12T14:00:00.000Z', checkOut: '2026-07-13T12:00:00.000Z', guestsCount: 3, roomType: 'Presidential Suite', status: 'booked', revenue: 450 },

    // July 13: 2 check-ins
    { guestName: 'Deepa Gupta', checkIn: '2026-07-13T14:00:00.000Z', checkOut: '2026-07-14T12:00:00.000Z', guestsCount: 2, roomType: 'Deluxe Room', status: 'booked', revenue: 180 },
    { guestName: 'Suresh Kumar', checkIn: '2026-07-13T14:00:00.000Z', checkOut: '2026-07-15T12:00:00.000Z', guestsCount: 1, roomType: 'Standard Room', status: 'booked', revenue: 240 },

    // July 14: 2 check-ins (staying 1-2 nights; this ensures July 14 has exactly 2 rooms booked)
    { guestName: 'Meera Pillai', checkIn: '2026-07-14T14:00:00.000Z', checkOut: '2026-07-15T12:00:00.000Z', guestsCount: 2, roomType: 'Deluxe Room', status: 'booked', revenue: 180 },
    { guestName: 'Aditya Mishra', checkIn: '2026-07-14T14:00:00.000Z', checkOut: '2026-07-16T12:00:00.000Z', guestsCount: 1, roomType: 'Standard Room', status: 'booked', revenue: 240 },

    // July 15: 5 check-ins
    { guestName: 'Pooja Iyer', checkIn: '2026-07-15T14:00:00.000Z', checkOut: '2026-07-17T12:00:00.000Z', guestsCount: 2, roomType: 'Deluxe Room', status: 'booked', revenue: 360 },
    { guestName: 'Nikhil Bose', checkIn: '2026-07-15T14:00:00.000Z', checkOut: '2026-07-16T12:00:00.000Z', guestsCount: 2, roomType: 'Executive Suite', status: 'booked', revenue: 280 },
    { guestName: 'Divya Shah', checkIn: '2026-07-15T14:00:00.000Z', checkOut: '2026-07-18T12:00:00.000Z', guestsCount: 1, roomType: 'Standard Room', status: 'booked', revenue: 360 },
    { guestName: 'Amit Chatterjee', checkIn: '2026-07-15T14:00:00.000Z', checkOut: '2026-07-16T12:00:00.000Z', guestsCount: 3, roomType: 'Suite', status: 'booked', revenue: 280 },
    { guestName: 'Swati Das', checkIn: '2026-07-15T14:00:00.000Z', checkOut: '2026-07-16T12:00:00.000Z', guestsCount: 2, roomType: 'Deluxe Room', status: 'booked', revenue: 180 },

    // July 16: 3 check-ins
    { guestName: 'Rajesh Sen', checkIn: '2026-07-16T14:00:00.000Z', checkOut: '2026-07-17T12:00:00.000Z', guestsCount: 2, roomType: 'Deluxe Room', status: 'booked', revenue: 180 },
    { guestName: 'Neha Joshi', checkIn: '2026-07-16T14:00:00.000Z', checkOut: '2026-07-18T12:00:00.000Z', guestsCount: 1, roomType: 'Standard Room', status: 'booked', revenue: 240 },
    { guestName: 'Sanjay Dutt', checkIn: '2026-07-16T14:00:00.000Z', checkOut: '2026-07-17T12:00:00.000Z', guestsCount: 2, roomType: 'Executive Suite', status: 'booked', revenue: 280 },

    // July 17: 2 check-ins
    { guestName: 'Vijay Mallya', checkIn: '2026-07-17T14:00:00.000Z', checkOut: '2026-07-18T12:00:00.000Z', guestsCount: 2, roomType: 'Deluxe Room', status: 'booked', revenue: 180 },
    { guestName: 'Harish Salve', checkIn: '2026-07-17T14:00:00.000Z', checkOut: '2026-07-19T12:00:00.000Z', guestsCount: 1, roomType: 'Standard Room', status: 'booked', revenue: 240 }
  ];

  bookingsList.forEach(b => {
    b.hotelId = hotelId;
  });

  console.log('🌱 Seeding bookings...');
  const result = await db.collection('bookings').insertMany(bookingsList);
  console.log(`✅ Seeded ${result.length} upcoming bookings!`);

  // Adjust occupancy history for these bookings
  const getDatesRange = (startStr, endStr) => {
    const dates = [];
    const start = new Date(startStr);
    const end = new Date(endStr);
    start.setHours(0,0,0,0);
    end.setHours(0,0,0,0);
    const current = new Date(start);
    while (current < end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const totalRooms = 500;

  for (const b of bookingsList) {
    const dates = getDatesRange(b.checkIn, b.checkOut);
    for (const dateStr of dates) {
      let hist = await db.collection('occupancyHistory').findOne({ date: dateStr });
      if (hist) {
        const roomsOccupied = (hist.roomsOccupied || 0) + 1;
        const occupancyPercentage = Math.round((roomsOccupied / totalRooms) * 1000) / 10;
        const guestCount = (hist.guestCount || 0) + b.guestsCount;
        const revenue = (hist.revenue || 0) + Math.round(b.revenue / dates.length);
        await db.collection('occupancyHistory').findByIdAndUpdate(hist.id || hist._id, {
          $set: { roomsOccupied, occupancyPercentage, guestCount, revenue }
        });
      } else {
        const occupancyPercentage = Math.round((1 / totalRooms) * 1000) / 10;
        await db.collection('occupancyHistory').create({
          date: dateStr,
          roomsOccupied: 1,
          occupancyPercentage,
          guestCount: b.guestsCount,
          revenue: Math.round(b.revenue / dates.length)
        });
      }
    }
  }
  console.log('✅ Occupancy history adjusted for seeded bookings!');

  await disconnectDB();
  process.exit(0);
}

seedUpcomingBookings().catch(async err => {
  console.error('❌ Seeding failed:', err);
  await disconnectDB();
  process.exit(1);
});
