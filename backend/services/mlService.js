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
  // Baseline staffing by occupancy percentage
  const baseFrontDesk = occupancyPercent < 30 ? 1 : occupancyPercent < 60 ? 2 : occupancyPercent < 85 ? 3 : 4;
  const baseHousekeeping = occupancyPercent < 30 ? 2 : occupancyPercent < 60 ? 5 : occupancyPercent < 85 ? 9 : 14;
  const baseRestaurant = occupancyPercent < 30 ? 2 : occupancyPercent < 60 ? 4 : occupancyPercent < 85 ? 8 : 12;
  const baseSecurity = occupancyPercent < 60 ? 2 : 3;
  const baseMaintenance = occupancyPercent < 50 ? 1 : 2;

  // Scale staffing dynamically if guestCount is high (e.g., surges or large guest list sizes)
  const gCount = Number(guestCount) || 0;
  const frontDesk = Math.max(baseFrontDesk, Math.ceil(gCount / 150));
  const housekeeping = Math.max(baseHousekeeping, Math.ceil(gCount / 35));
  const restaurant = Math.max(baseRestaurant, Math.ceil(gCount / 45));
  const security = Math.max(baseSecurity, Math.ceil(gCount / 200));
  const maintenance = Math.max(baseMaintenance, Math.ceil(gCount / 300));

  return {
    'Front Desk': frontDesk,
    'Housekeeping': housekeeping,
    'Restaurant Services': restaurant,
    'Security': security,
    'Maintenance': maintenance
  };
};
// Matrix transposition utility
const transpose = (matrix) => {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const result = [];
  for (let j = 0; j < cols; j++) {
    result[j] = [];
    for (let i = 0; i < rows; i++) {
      result[j][i] = matrix[i][j];
    }
  }
  return result;
};

// Matrix multiplication utility: A (m x n) * B (n x p) -> (m x p)
const multiply = (A, B) => {
  const m = A.length;
  const n = A[0].length;
  const p = B[0].length;
  const result = [];
  for (let i = 0; i < m; i++) {
    result[i] = [];
    for (let j = 0; j < p; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += A[i][k] * B[k][j];
      }
      result[i][j] = sum;
    }
  }
  return result;
};

// Matrix-Vector multiplication utility: A (m x n) * v (n) -> (m)
const multiplyMV = (A, v) => {
  const m = A.length;
  const n = A[0].length;
  const result = [];
  for (let i = 0; i < m; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) {
      sum += A[i][j] * v[j];
    }
    result[i] = sum;
  }
  return result;
};

// Gauss-Jordan elimination to solve A * x = b. Returns x or null if singular.
const solveLinearSystem = (A, b) => {
  const n = A.length;
  const M = [];
  for (let i = 0; i < n; i++) {
    M[i] = [...A[i], b[i]];
  }

  for (let i = 0; i < n; i++) {
    // Find pivot row
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) {
        maxRow = k;
      }
    }

    // Swap pivot row
    const temp = M[i];
    M[i] = M[maxRow];
    M[maxRow] = temp;

    const pivot = M[i][i];
    if (Math.abs(pivot) < 1e-12) {
      return null;
    }

    // Normalize pivot row
    for (let j = i; j <= n; j++) {
      M[i][j] /= pivot;
    }

    // Eliminate other rows
    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = M[k][i];
        for (let j = i; j <= n; j++) {
          M[k][j] -= factor * M[i][j];
        }
      }
    }
  }

  const x = [];
  for (let i = 0; i < n; i++) {
    x[i] = M[i][n];
  }
  return x;
};

// Helper to extract dummy features for Multiple Linear Regression (MLR)
const extractMlrFeatures = (dateStr, index, totalCount) => {
  const dateObj = new Date(dateStr);
  const day = dateObj.getDay(); // 0 is Sunday, 6 is Saturday
  const month = dateObj.getMonth(); // 0 is Jan, 11 is Dec
  
  // 1. Intercept term
  const features = [1];
  
  // 2. Normalized Trend
  features.push(index / (totalCount || 1));
  
  // 3. Day of week dummy variables (1 to 6; Sunday = 0 is reference baseline)
  for (let d = 1; d <= 6; d++) {
    features.push(day === d ? 1 : 0);
  }
  
  // 4. Month of year dummy variables (0 to 10; December = 11 is reference baseline)
  for (let m = 0; m <= 10; m++) {
    features.push(month === m ? 1 : 0);
  }
  
  return features;
};

const fitMultipleLinearRegression = (history) => {
  const sorted = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
  const N = sorted.length;
  
  if (N < 7) {
    return {
      type: 'mlr',
      coefficients: Array(19).fill(0),
      totalRecords: N,
      lastDateIndex: N - 1,
      lastDateStr: sorted[N - 1]?.date || new Date().toISOString().split('T')[0]
    };
  }

  const X = [];
  const Y = [];
  for (let i = 0; i < N; i++) {
    const record = sorted[i];
    X.push(extractMlrFeatures(record.date, i, N));
    Y.push(record.occupancyPercentage);
  }

  const XT = transpose(X);
  const XTX = multiply(XT, X);
  
  // Ridge Regularization parameter (lambda = 0.01) to ensure invertibility
  const lambda = 0.01;
  const P = XTX.length;
  for (let i = 0; i < P; i++) {
    XTX[i][i] += lambda;
  }
  
  const XTY = multiplyMV(XT, Y);
  const coefficients = solveLinearSystem(XTX, XTY) || Array(19).fill(0);

  return {
    type: 'mlr',
    coefficients,
    totalRecords: N,
    lastDateIndex: N - 1,
    lastDateStr: sorted[N - 1].date
  };
};

const predictMultipleLinearRegression = (dateStr, model) => {
  const targetDate = new Date(dateStr);
  const baseDate = new Date(model.lastDateStr);
  
  const diffTime = targetDate - baseDate;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const targetX = model.lastDateIndex + diffDays;
  
  const features = extractMlrFeatures(dateStr, targetX, model.totalRecords);
  
  let occupancy = 0;
  for (let i = 0; i < features.length; i++) {
    occupancy += features[i] * model.coefficients[i];
  }
  
  return occupancy;
};

// Holt-Winters Triple Exponential Smoothing (Additive Model)
const fitHoltWinters = (history) => {
  const sorted = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
  const N = sorted.length;
  const L = 7; // Weekly seasonality
  
  if (N < 14) {
    return {
      type: 'holtwinters',
      lastLevel: 50,
      lastTrend: 0.05,
      seasonalFactors: Array(7).fill(0),
      totalRecords: N,
      lastDateIndex: N - 1,
      lastDateStr: sorted[N - 1]?.date || new Date().toISOString().split('T')[0]
    };
  }

  const Y = sorted.map(r => r.occupancyPercentage);

  // Initialize level as average of first week
  let firstWeekSum = 0;
  for (let i = 0; i < L; i++) {
    firstWeekSum += Y[i];
  }
  const initialLevel = firstWeekSum / L;

  // Initialize trend as average difference between first two weeks
  let initialTrend = 0;
  for (let i = 0; i < L; i++) {
    initialTrend += (Y[i + L] - Y[i]) / L;
  }
  initialTrend /= L;

  // Initialize seasonal factors for days of the week (0-6)
  const seasonalFactors = Array(7).fill(0);
  for (let i = 0; i < L; i++) {
    const day = new Date(sorted[i].date).getDay();
    seasonalFactors[day] = Y[i] - initialLevel;
  }

  // Smoothing constants
  const alpha = 0.2;  // Level smoothing
  const beta = 0.1;   // Trend smoothing
  const gamma = 0.3;  // Seasonal smoothing

  let level = initialLevel;
  let trend = initialTrend;

  // Update level, trend, and seasonal factors iteratively
  for (let t = L; t < N; t++) {
    const record = sorted[t];
    const val = record.occupancyPercentage;
    const day = new Date(record.date).getDay();
    
    const prevLevel = level;
    const prevTrend = trend;
    const seasonalFactor = seasonalFactors[day];

    // Additive Holt-Winters formulas
    level = alpha * (val - seasonalFactor) + (1 - alpha) * (prevLevel + prevTrend);
    trend = beta * (level - prevLevel) + (1 - beta) * prevTrend;
    seasonalFactors[day] = gamma * (val - level) + (1 - gamma) * seasonalFactor;
  }

  return {
    type: 'holtwinters',
    lastLevel: level,
    lastTrend: trend,
    seasonalFactors: [...seasonalFactors],
    totalRecords: N,
    lastDateIndex: N - 1,
    lastDateStr: sorted[N - 1].date
  };
};

const predictHoltWinters = (dateStr, model) => {
  const targetDate = new Date(dateStr);
  const baseDate = new Date(model.lastDateStr);
  
  const diffTime = targetDate - baseDate;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const day = targetDate.getDay();
  // Extrapolate using Level + Days * Trend + Seasonality factor for day of week
  const predicted = model.lastLevel + diffDays * model.lastTrend + model.seasonalFactors[day];
  return predicted;
};

// Dispatches fitting based on selected algorithm
const fitModelByType = (history, modelType) => {
  if (modelType === 'holtwinters' || modelType === 'holt_winters') {
    return fitHoltWinters(history);
  } else if (modelType === 'mlr' || modelType === 'multiple_linear') {
    return fitMultipleLinearRegression(history);
  } else {
    return fitForecastingModel(history);
  }
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
  let occupancy;
  if (model.type === 'mlr') {
    occupancy = predictMultipleLinearRegression(dateStr, model);
  } else if (model.type === 'holtwinters') {
    occupancy = predictHoltWinters(dateStr, model);
  } else {
    occupancy = model.slope * targetX + model.intercept;

    // Weekly Seasonality Component
    const day = targetDate.getDay();
    occupancy += model.weeklySeasonality[day];

    // Monthly Seasonality Component
    const month = targetDate.getMonth();
    occupancy += model.monthlySeasonality[month];
  }

  // Holiday and Events Impact Component
  const month = targetDate.getMonth();
  const day = targetDate.getDay();
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

// Save model parameters to the database
const saveModelToDB = async (modelType, modelParams) => {
  try {
    await db.collection('mlModels').updateOne(
      { modelType },
      { $set: { modelType, parameters: modelParams, updatedAt: new Date() } },
      { upsert: true }
    );
    console.log(`💾 Saved ${modelType} model parameters to MongoDB mlModels collection.`);
  } catch (err) {
    console.error(`❌ Failed to save ${modelType} model parameters:`, err.message);
  }
};

// Fetch model parameters from the database
const fetchModelFromDB = async (modelType) => {
  try {
    const doc = await db.collection('mlModels').findOne({ modelType });
    if (doc && doc.parameters) {
      console.log(`🔌 Fetched ${modelType} model parameters from MongoDB mlModels collection.`);
      return doc.parameters;
    }
  } catch (err) {
    console.error(`❌ Failed to fetch ${modelType} model parameters:`, err.message);
  }
  return null;
};

// Helper helper to get or train model
const getOrTrainModel = async (trainingHistory, modelType) => {
  const model = fitModelByType(trainingHistory, modelType);
  await saveModelToDB(modelType, model);
  const dbModel = await fetchModelFromDB(modelType);
  return dbModel || model;
};

/**
 * Service function to get forecasts for a future range of days
 */
const getForecastRange = async (startDateStr, numDays = 7, totalRooms = 100, modelType = 'mlr') => {
  const history = await db.collection('occupancyHistory').find();
  // Filter history to only include dates strictly before the forecast start date
  const trainingHistory = history.filter(h => h.date < startDateStr);
  
  // Fit model, save weights to DB, and load weights from DB
  const model = await getOrTrainModel(trainingHistory, modelType);
  
  const forecasts = [];
  const start = new Date(startDateStr);

  for (let i = 0; i < numDays; i++) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    const dateStr = current.toISOString().split('T')[0];
    
    // Check if we already have a saved manual adjustment/recommendation in DB
    let savedRec = await db.collection('recommendations').findOne({ date: dateStr });
    
    // Generate ML predictions using the database-fetched parameters
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
  fitModelByType,
  fitMultipleLinearRegression,
  fitHoltWinters,
  predictForDate,
  getForecastRange,
  calculateStaffForOccupancy,
  HOLIDAYS_EVENTS,
  getOrTrainModel
};
