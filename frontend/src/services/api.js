const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (res) => {
  if (!res.ok) {
    let errMsg = 'Something went wrong';
    try {
      const data = await res.json();
      errMsg = data.message || errMsg;
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }
  return res.json();
};

const api = {
  // Auth endpoints
  async login(email, password) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return handleResponse(res);
  },

  async register(name, email, password, isGoogleLogin = false) {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, isGoogleLogin })
    });
    return handleResponse(res);
  },

  async googleLogin(name, email) {
    const res = await fetch(`${BASE_URL}/auth/google-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email })
    });
    return handleResponse(res);
  },

  async checkEmail(email) {
    const res = await fetch(`${BASE_URL}/auth/check-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return handleResponse(res);
  },

  async forgotPassword(email) {
    const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return handleResponse(res);
  },

  async resetPassword(token, password) {
    const res = await fetch(`${BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password })
    });
    return handleResponse(res);
  },

  async getProfile() {
    const res = await fetch(`${BASE_URL}/auth/profile`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async updateProfile(profileData) {
    const res = await fetch(`${BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(profileData)
    });
    return handleResponse(res);
  },

  // Bookings endpoints
  async getBookings() {
    const res = await fetch(`${BASE_URL}/bookings`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async addBooking(bookingData) {
    const res = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(bookingData)
    });
    return handleResponse(res);
  },

  async updateBookingStatus(id, status) {
    const res = await fetch(`${BASE_URL}/bookings/${id}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status })
    });
    return handleResponse(res);
  },

  async getOccupancyAnalytics(limit = 30) {
    const res = await fetch(`${BASE_URL}/occupancy/analytics?limit=${limit}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async getOccupancySuggestion() {
    const res = await fetch(`${BASE_URL}/occupancy/suggestion`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Staff endpoints
  async getEmployees() {
    const res = await fetch(`${BASE_URL}/staff`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async addEmployee(employeeData) {
    const res = await fetch(`${BASE_URL}/staff`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(employeeData)
    });
    return handleResponse(res);
  },

  async updateEmployee(id, employeeData) {
    const res = await fetch(`${BASE_URL}/staff/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(employeeData)
    });
    return handleResponse(res);
  },

  async deleteEmployee(id) {
    const res = await fetch(`${BASE_URL}/staff/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async recordAttendance(id, date, status) {
    const res = await fetch(`${BASE_URL}/staff/${id}/attendance`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ date, status })
    });
    return handleResponse(res);
  },

  async rateEmployee(id, performance) {
    const res = await fetch(`${BASE_URL}/staff/${id}/performance`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ performance })
    });
    return handleResponse(res);
  },

  // Staff Report endpoints
  async submitStaffReport(reportData) {
    const res = await fetch(`${BASE_URL}/staff/reports`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(reportData)
    });
    return handleResponse(res);
  },

  async getStaffReports() {
    const res = await fetch(`${BASE_URL}/staff/reports`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Feedback endpoints
  async submitFeedback(feedbackData) {
    const res = await fetch(`${BASE_URL}/feedback`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(feedbackData)
    });
    return handleResponse(res);
  },

  async getFeedbacks() {
    const res = await fetch(`${BASE_URL}/feedback`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Forecasting endpoints
  async getForecast(startDate, days = 7) {
    const res = await fetch(`${BASE_URL}/forecasts?startDate=${startDate}&days=${days}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async optimizeShifts(date) {
    const res = await fetch(`${BASE_URL}/forecasts/optimize`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ date })
    });
    return handleResponse(res);
  },

  // Notifications endpoints
  async getNotifications() {
    const res = await fetch(`${BASE_URL}/forecasts/notifications`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async markNotificationsRead() {
    const res = await fetch(`${BASE_URL}/forecasts/notifications/read`, {
      method: 'PUT',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Exports url helper
  getExportUrl(type, startDate, endDate) {
    const token = localStorage.getItem('token');
    return `${BASE_URL}/reports/export?type=${type}&startDate=${startDate}&endDate=${endDate}&token=${token}`;
  },

  // AI Assistant endpoints
  async aiChat(message, pageContext, conversationHistory = []) {
    const res = await fetch(`${BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ message, pageContext, conversationHistory })
    });
    return handleResponse(res);
  },

  async seedData(startDate, endDate) {
    const res = await fetch(`${BASE_URL}/ai/seed`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ startDate, endDate })
    });
    return handleResponse(res);
  }
};

export default api;
