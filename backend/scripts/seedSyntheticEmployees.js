const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { connectDB, disconnectDB, db } = require('../config/db');
const groqService = require('../services/groqService');

async function seedEmployees() {
  console.log('🔗 Connecting to MongoDB...');
  await connectDB();

  console.log('🤖 Requesting Groq to generate 23 synthetic employees...');
  const prompt = `Generate a JSON array of 23 realistic hotel employee profiles.
Each employee object must have exactly these fields:
- name: string (realistic names, mix of Western and Indian names)
- email: string (lowercase, name-based email, e.g., name.initial@grandroyal.com)
- department: string (exactly: 1 in "Front Desk", 11 in "Housekeeping", 9 in "Restaurant Services", 1 in "Security", 1 in "Maintenance")
- shift: "Morning" | "Evening" | "Night" (distribute naturally)
- salary: number (between 2500 and 3800)
- performance: number (between 4.0 and 5.0, rounded to 1 decimal place)
- status: "active"

Return ONLY the raw JSON array, with no explanations, markdown code fences, or wrappers.`;

  let employees;
  try {
    employees = await groqService.generateJSON(prompt);
  } catch (err) {
    console.warn('⚠️ Groq generation failed or key is not set. Falling back to local procedural generator:', err.message);
    employees = generateFallbackEmployees();
  }

  if (!Array.isArray(employees) || employees.length === 0) {
    console.error('❌ Received invalid employee list.');
    await disconnectDB();
    process.exit(1);
  }

  console.log(`✅ Generated ${employees.length} employees. Creating 30-day historical attendance...`);

  // Generate seed attendance (for past 30 days)
  const today = new Date();
  employees.forEach(emp => {
    emp.attendance = [];
    for (let i = 30; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const rand = Math.random();
      let status = 'present';
      if (rand > 0.95) status = 'leave';
      else if (rand > 0.92) status = 'absent';
      
      emp.attendance.push({ date: dateStr, status });
    }
  });

  console.log('🌱 Inserting employees into database...');
  const results = await db.collection('employees').insertMany(employees);
  console.log(`✅ Successfully seeded ${results.length} synthetic employees!`);

  await disconnectDB();
  process.exit(0);
}

function generateFallbackEmployees() {
  const departments = [
    { name: 'Front Desk', count: 1 },
    { name: 'Housekeeping', count: 11 },
    { name: 'Restaurant Services', count: 9 },
    { name: 'Security', count: 1 },
    { name: 'Maintenance', count: 1 }
  ];
  
  const westernNames = ['James Carter', 'Emma Watson', 'Liam Neeson', 'Olivia Wilde', 'William Defoe', 'Sophia Loren', 'Lucas Black', 'Mia Wood', 'Henry Cavill', 'Charlotte Bronte', 'Benjamin Franklin', 'Amelia Earhart'];
  const indianNames = ['Rohan Das', 'Kiran Sharma', 'Aditya Iyer', 'Pooja Nair', 'Suresh Kumar', 'Sneha Pillai', 'Vikram Singh', 'Ananya Reddy', 'Karan Patel', 'Meera Rao', 'Sanjay Gupta', 'Lakshmi Shah'];
  
  const employees = [];
  
  departments.forEach(dept => {
    for (let i = 0; i < dept.count; i++) {
      const isIndian = Math.random() > 0.5;
      const namePool = isIndian ? indianNames : westernNames;
      const name = namePool[Math.floor(Math.random() * namePool.length)] + ` (Gen ${i + 1})`;
      
      const email = name.toLowerCase().replace(/[^a-z0-9]/g, '.') + '@grandroyal.com';
      const shift = ['Morning', 'Evening', 'Night'][Math.floor(Math.random() * 3)];
      const salary = Math.floor(Math.random() * 1300) + 2500;
      const performance = Math.round((Math.random() * 1.0 + 4.0) * 10) / 10;
      
      employees.push({
        name,
        email,
        department: dept.name,
        shift,
        salary,
        performance,
        status: 'active'
      });
    }
  });
  
  return employees;
}

seedEmployees().catch(async err => {
  console.error('❌ Seeder script failed:', err);
  await disconnectDB();
  process.exit(1);
});
