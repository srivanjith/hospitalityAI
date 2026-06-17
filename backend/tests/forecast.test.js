const { fitForecastingModel, predictForDate, calculateStaffForOccupancy } = require('../services/mlService');

const mockHistory = [
  { date: '2026-05-01', occupancyPercentage: 40, guestCount: 68, roomsOccupied: 40 }, // Friday
  { date: '2026-05-02', occupancyPercentage: 55, guestCount: 93, roomsOccupied: 55 }, // Saturday
  { date: '2026-05-03', occupancyPercentage: 35, guestCount: 60, roomsOccupied: 35 }, // Sunday
  { date: '2026-05-04', occupancyPercentage: 20, guestCount: 34, roomsOccupied: 20 }, // Monday
  { date: '2026-05-05', occupancyPercentage: 22, guestCount: 37, roomsOccupied: 22 }, // Tuesday
  { date: '2026-05-06', occupancyPercentage: 25, guestCount: 42, roomsOccupied: 25 }, // Wednesday
  { date: '2026-05-07', occupancyPercentage: 28, guestCount: 48, roomsOccupied: 28 }, // Thursday
  
  { date: '2026-05-08', occupancyPercentage: 42, guestCount: 71, roomsOccupied: 42 }, // Friday
  { date: '2026-05-09', occupancyPercentage: 58, guestCount: 99, roomsOccupied: 58 }, // Saturday
  { date: '2026-05-10', occupancyPercentage: 36, guestCount: 61, roomsOccupied: 36 }, // Sunday
  { date: '2026-05-11', occupancyPercentage: 21, guestCount: 36, roomsOccupied: 21 }, // Monday
  { date: '2026-05-12', occupancyPercentage: 23, guestCount: 39, roomsOccupied: 23 }, // Tuesday
  { date: '2026-05-13', occupancyPercentage: 26, guestCount: 44, roomsOccupied: 26 }, // Wednesday
  { date: '2026-05-14', occupancyPercentage: 30, guestCount: 51, roomsOccupied: 30 }  // Thursday
];

const runTests = () => {
  console.log('🧪 Starting ML Forecasting Algorithm Verification Tests...\n');

  console.log('Test 1: Model fitting (linear regression + weekly seasonality)...');
  const model = fitForecastingModel(mockHistory);
  console.log(`- Regression slope: ${model.slope.toFixed(4)}`);
  console.log(`- Regression intercept: ${model.intercept.toFixed(4)}`);
  console.log(`- Weekly seasonality factors (Sun-Sat): ${model.weeklySeasonality.map(v => v.toFixed(1) + '%').join(', ')}`);
  
  if (model.slope === undefined || model.intercept === undefined) {
    console.error('❌ Failed: Slope or intercept are undefined.');
    process.exit(1);
  }
  console.log('✅ Test 1 Passed!\n');

  console.log('Test 2: Predict occupancy for a weekend (Saturday) and weekday (Monday)...');
  
  const satPrediction = predictForDate('2026-05-16', model); 
  console.log(`- Saturday forecast occupancy: ${satPrediction.predictedOccupancy}% (Guests: ${satPrediction.predictedGuests})`);
  
  const monPrediction = predictForDate('2026-05-18', model); 
  console.log(`- Monday forecast occupancy: ${monPrediction.predictedOccupancy}% (Guests: ${monPrediction.predictedGuests})`);
  
  if (satPrediction.predictedOccupancy <= monPrediction.predictedOccupancy) {
    console.error('❌ Failed: Saturday occupancy should be higher than Monday due to weekly seasonality.');
    process.exit(1);
  }
  console.log('✅ Test 2 Passed!\n');

  // Test 3: Staffing Recommendation Logic
  console.log('Test 3: Verify staffing calculation rules...');
  
  // Minimum Staff (e.g. 25% occupancy)
  const minStaff = calculateStaffForOccupancy(25, 42);
  console.log(`- Staffing at 25% occupancy (Min):`, minStaff);
  if (minStaff['Front Desk'] !== 1 || minStaff['Housekeeping'] !== 2) {
    console.error('❌ Failed: Min staff allocation count is incorrect.');
    process.exit(1);
  }

  // Moderate Staff (e.g. 50% occupancy)
  const modStaff = calculateStaffForOccupancy(50, 85);
  console.log(`- Staffing at 50% occupancy (Mod):`, modStaff);
  if (modStaff['Front Desk'] !== 2 || modStaff['Housekeeping'] !== 5) {
    console.error('❌ Failed: Moderate staff allocation count is incorrect.');
    process.exit(1);
  }

  // Full Staff (e.g. 90% occupancy)
  const fullStaff = calculateStaffForOccupancy(90, 153);
  console.log(`- Staffing at 90% occupancy (Full):`, fullStaff);
  if (fullStaff['Front Desk'] !== 4 || fullStaff['Housekeeping'] !== 14) {
    console.error('❌ Failed: Full staff allocation count is incorrect.');
    process.exit(1);
  }
  console.log('✅ Test 3 Passed!\n');

  // Test 4: Holiday Adjustments
  console.log('Test 4: Verify Christmas Eve holiday surge (+30%)...');
  const christmasEvePrediction = predictForDate('2026-12-24', model);
  console.log(`- Christmas Eve prediction: ${christmasEvePrediction.predictedOccupancy}%`);
  console.log(`- Insights generated:`, christmasEvePrediction.insights);
  
  const hasHolidayAlert = christmasEvePrediction.insights.some(i => i.includes('Christmas Eve') || i.includes('Holiday surge'));
  if (!hasHolidayAlert) {
    console.error('❌ Failed: Holiday insights warning is missing.');
    process.exit(1);
  }
  console.log('✅ Test 4 Passed!\n');

  console.log('🎉 ALL ML ALGORITHM VERIFICATION TESTS COMPLETED SUCCESSFULLY!');
};

runTests();
