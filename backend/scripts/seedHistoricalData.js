/**
 * HospitalityAI — Historical Data Seeder
 * Seeds 1 year of realistic occupancy + booking data into MySQL / Fallback
 * Run: node scripts/seedHistoricalData.js
 */

const dotenv = require('dotenv');
dotenv.config({ path: require('path').join(__dirname, '..', '.env') });
const { connectDB, disconnectDB, db } = require('../config/db');

// ── Indian hotel seasonality model ────────────────────────────────────────────

// Month base occupancy (0=Jan, 11=Dec) — Indian hotel patterns
const MONTH_BASE = [62, 58, 65, 70, 68, 55, 48, 52, 60, 75, 80, 85];

// Day-of-week multiplier (0=Sun, 6=Sat)
const DOW_MULT = [1.08, 0.88, 0.85, 0.90, 0.95, 1.12, 1.18];

// Indian festivals & events (month-day → boost %)
const EVENTS = {
  '01-14': ['Makar Sankranti', 18], '01-26': ['Republic Day', 12],
  '02-14': ["Valentine's Day", 10], '03-08': ["Holi", 20],
  '03-25': ['Holi Weekend', 15], '04-14': ['Baisakhi', 10],
  '04-22': ['Eid al-Fitr', 18], '05-01': ['Labour Day', 8],
  '06-15': ['Summer Weekend', 6], '07-15': ['Monsoon Special', 5],
  '08-15': ['Independence Day', 22], '08-26': ['Janmashtami', 12],
  '09-10': ['Ganesh Chaturthi', 20], '10-02': ['Gandhi Yachting', 10],
  '10-20': ['Dussehra', 18],      '11-01': ['Diwali Eve', 30],
  '11-02': ['Diwali', 35],        '11-03': ['Diwali Day', 28],
  '11-15': ['Post-Diwali Travel', 12], '12-25': ['Christmas', 28],
  '12-26': ['Boxing Day', 22],    '12-31': ["New Year's Eve", 40],
};

// Room types with nightly rates (INR)
const ROOM_TYPES = [
  { type: 'Standard',  rate: [3500, 5000], prob: 0.35 },
  { type: 'Deluxe',    rate: [5000, 7500], prob: 0.30 },
  { type: 'Executive', rate: [6000, 9000], prob: 0.20 },
  { type: 'Suite',     rate: [9000, 15000], prob: 0.15 },
];

// Indian guest names pool
const FIRST_NAMES = ['Arjun','Priya','Rahul','Ananya','Vikram','Sneha','Kiran','Deepa','Suresh','Meera',
  'Ravi','Kavya','Aditya','Pooja','Nikhil','Divya','Amit','Swati','Rajesh','Neha',
  'Sanjay','Lakshmi','Vijay','Asha','Mohan','Rekha','Arun','Sunita','Ganesh','Bhavna',
  'Harish','Usha','Prasad','Nandini','Kartik','Yamini','Venkat','Shobha','Dinesh','Pallavi'];
const LAST_NAMES = ['Sharma','Patel','Kumar','Singh','Gupta','Reddy','Nair','Iyer','Joshi','Mehta',
  'Shah','Rao','Pillai','Choudhary','Mishra','Verma','Agarwal','Bose','Chatterjee','Das'];

// ── Helpers ───────────────────────────────────────────────────────────────────

const rand = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(rand(min, max + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const addDays = (date, n) => { const d = new Date(date); d.setDate(d.getDate() + n); return d; };
const toDateStr = (d) => d.toISOString().split('T')[0];

const computeOccupancy = (dateStr) => {
  const d = new Date(dateStr);
  const month = d.getMonth();
  const dow = d.getDay();
  const monthDay = `${String(month + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  let occ = MONTH_BASE[month];
  occ *= DOW_MULT[dow];

  // Noise ±8%
  occ += rand(-8, 8);

  // Event boost
  if (EVENTS[monthDay]) occ += EVENTS[monthDay][1];

  return Math.max(20, Math.min(98, Math.round(occ * 10) / 10));
};

const pickRoomType = () => {
  const r = Math.random();
  let cum = 0;
  for (const rt of ROOM_TYPES) {
    cum += rt.prob;
    if (r < cum) return rt;
  }
  return ROOM_TYPES[0];
};

// ── Main seeder ───────────────────────────────────────────────────────────────

const TOTAL_ROOMS = 120;

async function main() {
  console.log('🔗 Connecting to Database...');
  await connectDB();
  console.log('✅ Connected!');

  // Ensure hotel exists
  let hotel = await db.collection('hotels').findOne();
  if (!hotel) {
    hotel = await db.collection('hotels').create({ name: 'The Grand Palace Hotel', location: 'Mumbai, Maharashtra', totalRooms: TOTAL_ROOMS });
    console.log('🏨 Created hotel record');
  }
  const hotelId = hotel.id || hotel._id;

  // Date range: 1 year ago → yesterday
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1); // yesterday
  const startDate = new Date(endDate);
  startDate.setFullYear(startDate.getFullYear() - 1);
  startDate.setDate(startDate.getDate() + 1);

  console.log(`📅 Seeding from ${toDateStr(startDate)} to ${toDateStr(endDate)} (${Math.round((endDate - startDate) / 86400000)} days)\n`);

  // ── Step 1: Occupancy History ──────────────────────────────────────────────
  console.log('📊 Generating occupancy history...');

  const existingDates = new Set(
    (await db.collection('occupancyHistory').find()).map(r => r.date)
  );

  const occupancyDocs = [];
  let cursor = new Date(startDate);

  while (cursor <= endDate) {
    const dateStr = toDateStr(cursor);
    if (!existingDates.has(dateStr)) {
      const occ = computeOccupancy(dateStr);
      const roomsOccupied = Math.round((occ / 100) * TOTAL_ROOMS);
      const guestCount = Math.round(roomsOccupied * rand(1.5, 1.9));
      // Revenue: average rate * rooms occupied (with occupancy-based pricing)
      const avgRate = occ > 80 ? rand(6000, 8500) : occ > 60 ? rand(4500, 6500) : rand(3000, 5000);
      const revenue = Math.round(roomsOccupied * avgRate);

      occupancyDocs.push({ date: dateStr, occupancyPercentage: occ, guestCount, roomsOccupied, revenue });
    }
    cursor = addDays(cursor, 1);
  }

  if (occupancyDocs.length > 0) {
    await db.collection('occupancyHistory').insertMany(occupancyDocs);
    console.log(`   ✅ Inserted ${occupancyDocs.length} occupancy records`);
  } else {
    console.log('   ℹ️  All occupancy dates already exist — skipped');
  }

  // ── Step 2: Bookings ───────────────────────────────────────────────────────
  console.log('\n🏨 Generating booking records...');

  // Generate ~4 bookings per week on average = ~200 for the year
  const existingBookingCount = await db.collection('bookings').countDocuments({
    checkIn: { $gte: toDateStr(startDate), $lte: toDateStr(endDate) }
  });

  if (existingBookingCount > 50) {
    console.log(`   ℹ️  ${existingBookingCount} bookings already exist in this range — skipped`);
  } else {
    const bookingDocs = [];
    let bookDate = new Date(startDate);

    while (bookDate <= endDate) {
      // On average 3-5 check-ins per day (weighted by occupancy)
      const occ = computeOccupancy(toDateStr(bookDate));
      const checkInsToday = occ > 75 ? randInt(4, 7) : occ > 50 ? randInt(2, 5) : randInt(1, 3);

      for (let i = 0; i < checkInsToday; i++) {
        const nights = occ > 70 ? randInt(2, 5) : randInt(1, 3);
        const checkOut = addDays(bookDate, nights);
        if (checkOut > endDate) break;

        const rt = pickRoomType();
        const rate = randInt(rt.rate[0], rt.rate[1]);
        const revenue = rate * nights;
        const guestsCount = rt.type === 'Suite' ? randInt(2, 4) : randInt(1, 3);

        bookingDocs.push({
          hotelId,
          guestName: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
          roomType: rt.type,
          checkIn: toDateStr(bookDate),
          checkOut: toDateStr(checkOut),
          guestsCount,
          status: 'checked-out',
          revenue
        });
      }

      bookDate = addDays(bookDate, 1);
    }

    if (bookingDocs.length > 0) {
      // Insert in chunks of 500
      for (let i = 0; i < bookingDocs.length; i += 500) {
        await db.collection('bookings').insertMany(bookingDocs.slice(i, i + 500));
      }
      console.log(`   ✅ Inserted ${bookingDocs.length} booking records`);
    }
  }

  console.log('\n🎉 Historical data seeding complete!');
  console.log(`   📈 The ML forecasting engine now has 1 year of training data.`);
  await disconnectDB();
  process.exit(0);
}

main().catch(async err => {
  console.error('❌ Seeder failed:', err.message);
  await disconnectDB();
  process.exit(1);
});
