const { db } = require('../config/db');

const HOLIDAYS_EVENTS = {

  '01-01': { name: "New Year's Day", impact: 20 },
  '02-14': { name: "Valentine's Day", impact: 15 },
  '07-04': { name: "Independence Day", impact: 25 },
  '10-31': { name: "Halloween", impact: 10 },
  '11-25': { name: "Thanksgiving Peak", impact: 20 },
  '12-24': { name: "Christmas Eve", impact: 30 },
  '12-25': { name: "Christmas Day", impact: 25 },
  '12-31': { name: "New Year's Eve", impact: 35 },
  

  '05-15': { name: "Spring Food & Wine Festival", impact: 15 },
  '05-16': { name: "Spring Food & Wine Festival", impact: 15 },
  '08-10': { name: "Summer Music Fest", impact: 30 },
  '08-11': { name: "Summer Music Fest", impact: 30 },
  '08-12': { name: "Summer Music Fest", impact: 25 }
};

const calculateStaffForOccupancy = (occupancyPercent, guestCount) => {
  const frontDesk = occupancyPercent < 30 ? 1 : occupancyPercent < 60 ? 2 : occupancyPercent < 85 ? 3 : 4;
  const housekeeping = occupancyPercent < 30 ? 2 : occupancyPercent < 60 ? 5 : occupancyPercent < 85 ? 9 : 14;
  const restaurant = occupancyPercent < 30 ? 2 : occupancyPercent < 60 ? 4 : occupancyPercent < 85 ? 8 : 12;
  const security = occupancyPercent < 60 ? 2 : 3;
  const maintenance = occupancyPercent < 50 ? 1 : 2;

  return {
    'Front Desk': frontDesk,
    'Housekeeping': housekeeping,
    'Restaurant Services': restaurant,
    'Security': security,
    'Maintenance': maintenance
  };
};
const fitForecastingModel = (history) => {
  if (history.length < 14) {
    // Return dummy model parameters if insufficient data
    return {
      slope: 0.01,
      intercept: 50,
      weeklySeasonality: Array(7).fill(0),
      monthlySeasonality: Array(12).fill(0)
    };
  }

  // Sort history by date
  const sorted = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // 1. Linear Regression for Trend: y = mx + c
  // We map index 0 to history.length - 1
  const N = sorted.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < N; i++) {
    const x = i;
    const y = sorted[i].occupancyPercentage;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const slope = (N * sumXY - sumX * sumY) / (N * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / N;

  // 2. Seasonality (Multiplicative or Additive deviations from trend)
  const weekdayDeviations = Array(7).fill(0).map(() => []);
  const monthlyDeviations = Array(12).fill(0).map(() => []);

  for (let i = 0; i < N; i++) {
    const x = i;
    const record = sorted[i];
    const dateObj = new Date(record.date);
    const day = dateObj.getDay(); // 0 is Sunday, 6 is Saturday
    const month = dateObj.getMonth(); // 0 is Jan, 11 is Dec

    // Trend predicted value
    const trendVal = slope * x + intercept;
    const deviation = record.occupancyPercentage - trendVal;

    weekdayDeviations[day].push(deviation);
    monthlyDeviations[month].push(deviation);
  }

  const weeklySeasonality = weekdayDeviations.map(arr => 
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
  );
  
  const monthlySeasonality = monthlyDeviations.map(arr => 
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
  );

  return {
    slope,
    intercept,
    weeklySeasonality,
    monthlySeasonality,
    totalRecords: N,
    lastDateIndex: N - 1,
    lastDateStr: sorted[N - 1].date
  };
};

/**
 * Forecasts occupancy for a specific date given the model parameters and active database date context
 */
const predictForDate = (dateStr, model, totalRooms = 100) => {
  const targetDate = new Date(dateStr);
  const baseDate = new Date(model.lastDateStr);
  
  // Calculate relative index for regression trend
  const diffTime = targetDate - baseDate;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const targetX = model.lastDateIndex + diffDays;

  // Trend Component
  let occupancy = model.slope * targetX + model.intercept;

  // Weekly Seasonality Component
  const day = targetDate.getDay();
  occupancy += model.weeklySeasonality[day];

  // Monthly Seasonality Component
  const month = targetDate.getMonth();
  occupancy += model.monthlySeasonality[month];

  // Holiday and Events Impact Component
  const monthDayStr = `${String(month + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
  let holidayName = null;
  if (HOLIDAYS_EVENTS[monthDayStr]) {
    occupancy += HOLIDAYS_EVENTS[monthDayStr].impact;
    holidayName = HOLIDAYS_EVENTS[monthDayStr].name;
  }

  // Constrain predicted occupancy between 10% and 100%
  occupancy = Math.max(12, Math.min(100, occupancy));
  
  // Predict guest count assuming average of 1.7 guests per occupied room
  const roomsOccupied = Math.round((occupancy / 100) * totalRooms);
  const guestCount = Math.round(roomsOccupied * 1.7);

  // Generate AI Recommendations
  const insights = [];
  const recStaff = calculateStaffForOccupancy(occupancy, guestCount);
  
  if (holidayName) {
    insights.push(`Holiday surge for ${holidayName} (+${HOLIDAYS_EVENTS[monthDayStr].impact}% demand expected). Ensure all shifts are fully staffed.`);
  }

  if (occupancy >= 85) {
    insights.push("Critically high occupancy (>85%) predicted. Housekeeping requires double allocation. Consider scheduling a backup receptionist.");
  } else if (occupancy >= 60) {
    insights.push("Moderate-to-high occupancy expected. Standard staffing levels recommended across all shifts.");
  } else if (occupancy < 35) {
    insights.push("Low demand window. Staffing counts minimized. Save labor costs by offering voluntary time off or scheduling maintenance work.");
  }

  // Check day-of-week custom recommendations
  if (day === 5 || day === 6) {
    insights.push("Weekend peak check-in patterns. Front desk staffing levels increased to prevent bottlenecks.");
  }

  return {
    date: dateStr,
    predictedOccupancy: Math.round(occupancy * 10) / 10,
    predictedGuests: guestCount,
    roomsOccupied,
    recommendedStaff: recStaff,
    insights
  };
};

/**
 * Service function to get forecasts for a future range of days
 */
const getForecastRange = async (startDateStr, numDays = 7, totalRooms = 100) => {
  const history = await db.collection('occupancyHistory').find();
  const model = fitForecastingModel(history);
  
  const forecasts = [];
  const start = new Date(startDateStr);

  for (let i = 0; i < numDays; i++) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    const dateStr = current.toISOString().split('T')[0];
    
    // Check if we already have a saved manual adjustment/recommendation in DB
    let savedRec = await db.collection('recommendations').findOne({ date: dateStr });
    
    // Generate ML predictions
    const prediction = predictForDate(dateStr, model, totalRooms);
    
    if (savedRec) {
      // If employee shift schedule exists, summarize current actual scheduled counts
      forecasts.push({
        ...prediction,
        recommendedStaff: savedRec.recommendedStaff,
        actualStaffScheduled: savedRec.actualStaffScheduled || prediction.recommendedStaff,
        optimized: savedRec.optimized || false,
        insights: savedRec.insights.length ? savedRec.insights : prediction.insights
      });
    } else {
      // Default scheduled staff is equal to recommended staff initially
      forecasts.push({
        ...prediction,
        actualStaffScheduled: prediction.recommendedStaff,
        optimized: false
      });
    }
  }

  return forecasts;
};

module.exports = {
  fitForecastingModel,
  predictForDate,
  getForecastRange,
  calculateStaffForOccupancy
};
