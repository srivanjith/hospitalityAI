const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB, db } = require('./config/db');
const { seed } = require('./data/seedData');

// Load env variables
dotenv.config();

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database connection & seed middleware for Serverless environment
let isInitialized = false;
app.use(async (req, res, next) => {
  if (!isInitialized) {
    try {
      await connectDB();
      await seed();
      isInitialized = true;
    } catch (err) {
      console.error('Lazy database initialization failed:', err);
    }
  }
  next();
});

// Routes declarations
const authRoutes = express.Router();
const bookingRoutes = express.Router();
const staffRoutes = express.Router();
const forecastRoutes = express.Router();
const reportRoutes = express.Router();
const aiRoutes = express.Router();
const feedbackRoutes = express.Router();

// Auth Controller imports
const {
  loginUser,
  registerUser,
  googleLogin,
  getUserProfile,
  updateUserProfile,
  forgotPassword,
  resetPassword,
  checkEmail
} = require('./controllers/authController');

// Booking Controller imports
const {
  getBookings,
  addBooking,
  updateBookingStatus,
  getOccupancyAnalytics,
  getOccupancySuggestion
} = require('./controllers/bookingController');

// Staff Controller imports
const {
  getEmployees,
  addEmployee,
  updateEmployee,
  recordAttendance,
  updatePerformanceRating,
  deleteEmployee,
  submitStaffReport,
  getStaffReports,
  submitFeedback,
  getFeedbacks
} = require('./controllers/staffController');

// Forecast Controller imports
const {
  getForecast,
  optimizeShifts,
  getNotifications,
  markNotificationsRead,
  deleteNotification,
  deleteAllNotifications
} = require('./controllers/forecastController');

// Report Controller imports
const {
  exportReport
} = require('./controllers/reportController');

// AI Controller imports
const {
  aiChat,
  seedData
} = require('./controllers/aiController');


// Auth Middlewares
const { protect } = require('./middleware/authMiddleware');

// Hook up Auth Routes
authRoutes.post('/login', loginUser);
authRoutes.post('/register', registerUser);
authRoutes.post('/google-login', googleLogin);
authRoutes.post('/forgot-password', forgotPassword);
authRoutes.post('/reset-password', resetPassword);
authRoutes.post('/check-email', checkEmail);
authRoutes.get('/profile', protect, getUserProfile);
authRoutes.put('/profile', protect, updateUserProfile);

// Hook up Booking & Occupancy Routes
bookingRoutes.get('/', protect, getBookings);
bookingRoutes.post('/', protect, addBooking);
bookingRoutes.put('/:id/status', protect, updateBookingStatus);
bookingRoutes.get('/analytics', protect, getOccupancyAnalytics);
bookingRoutes.get('/suggestion', protect, getOccupancySuggestion);

// Hook up Staff Routes
staffRoutes.get('/', protect, getEmployees);
staffRoutes.post('/', protect, addEmployee);
staffRoutes.put('/:id', protect, updateEmployee);
staffRoutes.post('/:id/attendance', protect, recordAttendance);
staffRoutes.post('/:id/performance', protect, updatePerformanceRating);
staffRoutes.delete('/:id', protect, deleteEmployee);
// Staff Report Routes (must be registered BEFORE /:id to avoid conflict)
staffRoutes.post('/reports', protect, submitStaffReport);
staffRoutes.get('/reports', protect, getStaffReports);

// Hook up Forecast & Alert Routes
forecastRoutes.get('/', protect, getForecast);
forecastRoutes.post('/optimize', protect, optimizeShifts);
forecastRoutes.get('/notifications', protect, getNotifications);
forecastRoutes.put('/notifications/read', protect, markNotificationsRead);
forecastRoutes.delete('/notifications', protect, deleteAllNotifications);
forecastRoutes.delete('/notifications/:id', protect, deleteNotification);

// Hook up Reports Routes
reportRoutes.get('/export', protect, exportReport);

// Hook up AI Routes
aiRoutes.post('/chat', protect, aiChat);
aiRoutes.post('/seed', protect, seedData);

// Hook up Feedback Routes
feedbackRoutes.post('/', protect, submitFeedback);
feedbackRoutes.get('/', protect, getFeedbacks);

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/occupancy', bookingRoutes); // maps /api/occupancy/analytics correctly
app.use('/api/staff', staffRoutes);
app.use('/api/forecasts', forecastRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/feedback', feedbackRoutes);

app.get('/api/db-status', (req, res) => {
  res.json({
    useMongoDB: !db.isFallback(),
    mongoUriConfigured: !!process.env.MONGO_URI,
    env: process.env.NODE_ENV,
    time: new Date().toISOString()
  });
});

// Base route
app.get('/', (req, res) => {
  res.send('HospitalityAI Server API is running...');
});

// Start Server (only if running locally / not in a Vercel environment)
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const PORT = process.env.PORT || 5005;
  const startServer = async () => {
    try {
      // 1. Establish database connection (or fallback)
      await connectDB();
      
      // 2. Perform seed check and pre-population
      await seed();

      // 3. Listen to port
      const server = app.listen(PORT, () => {
        console.log(`🚀 HospitalityAI Backend Server running on port ${PORT}`);
      });

      // Graceful EADDRINUSE handler — exits cleanly so nodemon can retry
      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.error(`⚠️  Port ${PORT} is in use. Kill the old process and nodemon will restart.`);
          process.exit(1);
        } else {
          throw err;
        }
      });
    } catch (error) {
      console.error('Server boot failed:', error);
      process.exit(1);
    }
  };
  startServer();
}

module.exports = app;



