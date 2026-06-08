const bcrypt = require('bcryptjs');
const { db } = require('../config/db');

// List of predefined holidays for data generation
const HOLIDAYS = {
  '01-01': 20, // New Year's Day
  '02-14': 10, // Valentine's
  '07-04': 25, // Independence Day
  '10-31': 8,  // Halloween
  '11-24': 18, // Thanksgiving Peak
  '11-25': 20,
  '12-24': 30, // Christmas Eve
  '12-25': 25, // Christmas Day
  '12-31': 35  // New Year's Eve
};

const seed = async () => {
  try {
    console.log('🔄 Checking database seed status...');

    // 1. Seed Users
    const userCount = await db.collection('users').countDocuments();
    if (userCount === 0) {
      console.log('🌱 Seeding users...');
      const adminPass = await bcrypt.hash('admin123', 10);
      const managerPass = await bcrypt.hash('manager123', 10);
      const guestPass = await bcrypt.hash('guest123', 10);

      await db.collection('users').insertMany([
        {
          name: 'Chief Admin Officer',
          email: 'admin@hospitality.com',
          password: adminPass,
          role: 'admin'
        },
        {
          name: 'Operations Manager',
          email: 'manager@hospitality.com',
          password: managerPass,
          role: 'manager'
        },
        {
          name: 'Resident Guest User',
          email: 'guest@gmail.com',
          password: guestPass,
          role: 'guest'
        }
      ]);
      console.log('✅ Users seeded!');
    }

    // 2. Seed Hotels
    const hotelCount = await db.collection('hotels').countDocuments();
    let hotelId = '';
    if (hotelCount === 0) {
      console.log('🌱 Seeding resort metadata...');
      const hotel = await db.collection('hotels').create({
        name: 'The Grand Royal Resort',
        location: 'Miami, FL',
        totalRooms: 120
      });
      hotelId = hotel.id || hotel._id;
      console.log('✅ Hotels seeded!');
    } else {
      const hotels = await db.collection('hotels').find();
      hotelId = hotels[0].id || hotels[0]._id;
    }

    // 3. Seed Employees
    const employeeCount = await db.collection('employees').countDocuments();
    if (employeeCount === 0) {
      console.log('🌱 Seeding employee roster...');
      const initialEmployees = [
        // Front Desk
        { name: 'Sarah Connor', email: 'sarah.c@grandroyal.com', department: 'Front Desk', shift: 'Morning', salary: 3200, performance: 4.8, status: 'active' },
        { name: 'John Doe', email: 'john.doe@grandroyal.com', department: 'Front Desk', shift: 'Evening', salary: 3200, performance: 4.5, status: 'active' },
        { name: 'Alice Smith', email: 'alice.s@grandroyal.com', department: 'Front Desk', shift: 'Night', salary: 3400, performance: 4.2, status: 'active' },
        
        // Housekeeping
        { name: 'Maria Rodriguez', email: 'maria.r@grandroyal.com', department: 'Housekeeping', shift: 'Morning', salary: 2600, performance: 4.9, status: 'active' },
        { name: 'Elena Rostova', email: 'elena.r@grandroyal.com', department: 'Housekeeping', shift: 'Morning', salary: 2600, performance: 4.7, status: 'active' },
        { name: 'David Jones', email: 'david.j@grandroyal.com', department: 'Housekeeping', shift: 'Evening', salary: 2600, performance: 4.1, status: 'active' },
        { name: 'Carlos Gomez', email: 'carlos.g@grandroyal.com', department: 'Housekeeping', shift: 'Evening', salary: 2600, performance: 4.6, status: 'active' },
        { name: 'Sumi Chen', email: 'sumi.c@grandroyal.com', department: 'Housekeeping', shift: 'Morning', salary: 2700, performance: 4.7, status: 'active' },
        { name: 'Ana Silva', email: 'ana.s@grandroyal.com', department: 'Housekeeping', shift: 'Morning', salary: 2600, performance: 4.3, status: 'active' },
        
        // Restaurant Services
        { name: 'Pierre Dubois', email: 'pierre.d@grandroyal.com', department: 'Restaurant Services', shift: 'Morning', salary: 3500, performance: 4.9, status: 'active' },
        { name: 'Emily Watson', email: 'emily.w@grandroyal.com', department: 'Restaurant Services', shift: 'Evening', salary: 2800, performance: 4.4, status: 'active' },
        { name: 'Raj Patel', email: 'raj.p@grandroyal.com', department: 'Restaurant Services', shift: 'Evening', salary: 2800, performance: 4.6, status: 'active' },
        { name: 'Marco Rossi', email: 'marco.r@grandroyal.com', department: 'Restaurant Services', shift: 'Morning', salary: 3000, performance: 4.2, status: 'active' },
        
        // Security
        { name: 'Marcus Vance', email: 'marcus.v@grandroyal.com', department: 'Security', shift: 'Night', salary: 3300, performance: 4.7, status: 'active' },
        { name: 'Thomas Wright', email: 'thomas.w@grandroyal.com', department: 'Security', shift: 'Evening', salary: 3100, performance: 4.4, status: 'active' },
        { name: 'Leon Kennedy', email: 'leon.k@grandroyal.com', department: 'Security', shift: 'Morning', salary: 3100, performance: 4.8, status: 'active' },
        
        // Maintenance
        { name: 'Bob Builder', email: 'bob.b@grandroyal.com', department: 'Maintenance', shift: 'Morning', salary: 3600, performance: 4.5, status: 'active' },
        { name: 'Garrus Vakarian', email: 'garrus.v@grandroyal.com', department: 'Maintenance', shift: 'Evening', salary: 3800, performance: 4.7, status: 'active' }
      ];

      // Generate seed attendance (for past 30 days)
      const today = new Date();
      const attendanceList = [];
      for (let i = 30; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        
        initialEmployees.forEach(emp => {
          if (!emp.attendance) emp.attendance = [];
          // 92% present rate
          const rand = Math.random();
          let status = 'present';
          if (rand > 0.95) status = 'leave';
          else if (rand > 0.92) status = 'absent';
          
          emp.attendance.push({ date: dateStr, status });
        });
      }

      await db.collection('employees').insertMany(initialEmployees);
      console.log('✅ Employees seeded!');
    }

    // 4. Seed Occupancy History (if empty)
    const histCount = await db.collection('occupancyHistory').countDocuments();
    if (histCount === 0) {
      console.log('🌱 Seeding 1.5 years (~500 days) of historical occupancy records...');
      const totalRooms = 120;
      const historyRecords = [];
      const today = new Date();
      
      // We will generate records from 500 days ago until yesterday
      for (let i = 500; i >= 1; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        // Model Components:
        // A. Base + Long-term Trend (slight growth over time)
        const dayIdx = 500 - i;
        const trend = 45 + (dayIdx * 0.02); // slowly grows from 45% to 55%

        // B. Weekly Seasonality (Weekends Friday=5, Saturday=6 are busy)
        const weekday = date.getDay();
        let weeklyFactor = 0;
        if (weekday === 5) weeklyFactor = 12; // Friday
        else if (weekday === 6) weeklyFactor = 18; // Saturday
        else if (weekday === 0) weeklyFactor = 5;  // Sunday checkout transition
        else weeklyFactor = -8; // Weekday low

        // C. Monthly Seasonality (Summer and December peaks)
        const month = date.getMonth();
        let monthlyFactor = 0;
        if (month === 5 || month === 6 || month === 7) {
          monthlyFactor = 15; // Summer peak (June, July, August)
        } else if (month === 11) {
          monthlyFactor = 18; // Winter holiday peak (December)
        } else if (month === 0 || month === 1) {
          monthlyFactor = -10; // Winter low (Jan, Feb)
        } else if (month === 8) {
          monthlyFactor = -5; // Autumn transition (Sept)
        }

        // D. Holiday Spikes
        const monthDayStr = `${String(month + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        let holidayFactor = 0;
        if (HOLIDAYS[monthDayStr]) {
          holidayFactor = HOLIDAYS[monthDayStr];
        }

        // E. Random Noise
        const noise = (Math.random() - 0.5) * 8; // -4% to +4%

        let occupancy = trend + weeklyFactor + monthlyFactor + holidayFactor + noise;
        occupancy = Math.max(15, Math.min(100, Math.round(occupancy * 10) / 10));

        const roomsOccupied = Math.round((occupancy / 100) * totalRooms);
        const guestCount = Math.round(roomsOccupied * 1.7);
        // Base room price is ₹150, food/addons spend ~₹30 per guest
        const revenue = Math.round((roomsOccupied * 150) + (guestCount * 30));

        historyRecords.push({
          date: dateStr,
          occupancyPercentage: occupancy,
          guestCount,
          roomsOccupied,
          revenue
        });
      }

      await db.collection('occupancyHistory').insertMany(historyRecords);
      console.log(`✅ Seeded ${historyRecords.length} historical occupancy logs!`);
    }

    // 5. Seed Bookings (Active and upcoming bookings for the next 30 days)
    const bookingsCount = await db.collection('bookings').countDocuments();
    if (bookingsCount === 0) {
      console.log('🌱 Seeding booking records...');
      const today = new Date();
      const mockBookings = [];
      const roomTypes = ['Standard Room', 'Deluxe Room', 'Executive Suite', 'Presidential Suite'];
      const guests = ['John Rambo', 'Jane Austen', 'Michael Scott', 'Dwight Schrute', 'Pam Beesly', 'Jim Halpert', 'Walter White', 'Jesse Pinkman', 'Bruce Wayne', 'Clark Kent', 'Diana Prince', 'Peter Parker', 'Tony Stark', 'Steve Rogers', 'Natasha Romanoff', 'Wanda Maximoff'];

      // Generate bookings for past 5 days and next 20 days
      for (let i = -5; i < 20; i++) {
        const checkIn = new Date(today);
        checkIn.setDate(today.getDate() + i);
        
        // Let's create 2-5 bookings check-in each day
        const numBookings = Math.floor(Math.random() * 4) + 2;
        
        for (let b = 0; b < numBookings; b++) {
          const stayDays = Math.floor(Math.random() * 4) + 1;
          const checkOut = new Date(checkIn);
          checkOut.setDate(checkIn.getDate() + stayDays);
          
          const guest = guests[Math.floor(Math.random() * guests.length)];
          const room = roomTypes[Math.floor(Math.random() * roomTypes.length)];
          const guestsCount = Math.floor(Math.random() * 3) + 1;
          
          let rate = 120;
          if (room === 'Deluxe Room') rate = 180;
          if (room === 'Executive Suite') rate = 280;
          if (room === 'Presidential Suite') rate = 450;
          
          const revenue = rate * stayDays;
          
          let status = 'booked';
          if (i < 0) {
            status = 'checked-out';
          } else if (i === 0) {
            status = 'checked-in';
          }

          mockBookings.push({
            hotelId,
            guestName: `${guest}`,
            roomType: room,
            checkIn: checkIn.toISOString(),
            checkOut: checkOut.toISOString(),
            guestsCount,
            status,
            revenue
          });
        }
      }

      await db.collection('bookings').insertMany(mockBookings);
      console.log(`✅ Seeded ${mockBookings.length} bookings!`);
    }

    console.log('🎉 Database seeding completed successfully.');
  } catch (err) {
    console.error('❌ Database seeding error:', err);
  }
};

module.exports = { seed };
