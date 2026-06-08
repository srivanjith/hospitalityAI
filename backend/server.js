const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB } = require('./config/db');
const { seed } = require('./data/seedData');

// Load env variables
dotenv.config();

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes declarations
const authRoutes = express.Router();
const bookingRoutes = express.Router();
const staffRoutes = express.Router();
const forecastRoutes = express.Router();
const reportRoutes = express.Router();

// Auth Controller imports
const {
  loginUser,
  getUserProfile,
  updateUserProfile,
  forgotPassword
} = require('./controllers/authController');

// Booking Controller imports
const {
  getBookings,
  addBooking,
  updateBookingStatus,
  getOccupancyAnalytics
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
  getStaffReports
} = require('./controllers/staffController');

// Forecast Controller imports
const {
  getForecast,
  optimizeShifts,
  getNotifications,
  markNotificationsRead
} = require('./controllers/forecastController');

// Report Controller imports
const {
  exportReport
} = require('./controllers/reportController');

// Auth Middlewares
const { protect } = require('./middleware/authMiddleware');

// Hook up Auth Routes
authRoutes.post('/login', loginUser);
authRoutes.post('/forgot-password', forgotPassword);
authRoutes.get('/profile', protect, getUserProfile);
authRoutes.put('/profile', protect, updateUserProfile);

// Hook up Booking & Occupancy Routes
bookingRoutes.get('/', protect, getBookings);
bookingRoutes.post('/', protect, addBooking);
bookingRoutes.put('/:id/status', protect, updateBookingStatus);
bookingRoutes.get('/analytics', protect, getOccupancyAnalytics);

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

// Hook up Reports Routes
reportRoutes.get('/export', protect, exportReport);

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/occupancy', bookingRoutes); // maps /api/occupancy/analytics correctly
app.use('/api/staff', staffRoutes);
app.use('/api/forecasts', forecastRoutes);
app.use('/api/reports', reportRoutes);

// Base route
app.get('/', (req, res) => {
  res.send('HospitalityAI Server API is running...');
});

// Start Server & DB connection
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // 1. Establish database connection (or fallback)
    await connectDB();
    
    // 2. Perform seed check and pre-population
    await seed();

    // 3. Listen to port
    app.listen(PORT, () => {
      console.log(`🚀 HospitalityAI Backend Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Server boot failed:', error);
  }
};

startServer();
