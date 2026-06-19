const { db } = require('../config/db');

// @desc    Get all employees
// @route   GET /api/staff
// @access  Private
const getEmployees = async (req, res) => {
  try {
    const employees = await db.collection('employees').find();
    return res.json(employees);
  } catch (error) {
    console.error('Fetch Employees Error:', error);
    return res.status(500).json({ message: 'Server error fetching employee directory' });
  }
};

// @desc    Add a new employee
// @route   POST /api/staff
// @access  Private
const addEmployee = async (req, res) => {
  const { name, email, department, shift, salary } = req.body;

  try {
    if (!name || !email || !department || !shift || !salary) {
      return res.status(400).json({ message: 'Please provide all employee details' });
    }

    const newEmployee = await db.collection('employees').create({
      name,
      email: email.toLowerCase().trim(),
      department,
      shift,
      salary: Number(salary),
      attendance: [],
      performance: 5.0, // Start with a perfect rating
      status: 'active'
    });

    return res.status(201).json(newEmployee);
  } catch (error) {
    console.error('Add Employee Error:', error);
    return res.status(500).json({ message: 'Server error adding employee' });
  }
};

// @desc    Update employee details (Shift/Department/Salary)
// @route   PUT /api/staff/:id
// @access  Private
const updateEmployee = async (req, res) => {
  const { department, shift, salary, status } = req.body;
  const empId = req.params.id;

  try {
    const employee = await db.collection('employees').findById(empId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const updateData = {};
    if (department) updateData.department = department;
    if (shift) updateData.shift = shift;
    if (salary) updateData.salary = Number(salary);
    if (status) updateData.status = status;

    const updated = await db.collection('employees').findByIdAndUpdate(
      empId,
      { $set: updateData }
    );

    return res.json({ ...employee, ...updateData });
  } catch (error) {
    console.error('Update Employee Error:', error);
    return res.status(500).json({ message: 'Server error updating employee details' });
  }
};

// @desc    Track attendance
// @route   POST /api/staff/:id/attendance
// @access  Private
const recordAttendance = async (req, res) => {
  const { date, status } = req.body; // status: 'present' | 'absent' | 'leave'
  const empId = req.params.id;

  try {
    if (!date || !status) {
      return res.status(400).json({ message: 'Please provide date and attendance status' });
    }

    const employee = await db.collection('employees').findById(empId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Filter out existing record for this date (if any) and push new
    const updatedAttendance = (employee.attendance || []).filter(a => a.date !== date);
    updatedAttendance.push({ date, status });

    await db.collection('employees').findByIdAndUpdate(empId, {
      $set: { attendance: updatedAttendance }
    });

    return res.json({ message: 'Attendance status recorded successfully', attendance: updatedAttendance });
  } catch (error) {
    console.error('Attendance Record Error:', error);
    return res.status(500).json({ message: 'Server error recording attendance' });
  }
};

// @desc    Log performance rating
// @route   POST /api/staff/:id/performance
// @access  Private
const updatePerformanceRating = async (req, res) => {
  const { performance } = req.body; // 1.0 to 5.0
  const empId = req.params.id;

  try {
    if (performance === undefined || performance < 1 || performance > 5) {
      return res.status(400).json({ message: 'Performance rating must be between 1.0 and 5.0' });
    }

    const employee = await db.collection('employees').findById(empId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    await db.collection('employees').findByIdAndUpdate(empId, {
      $set: { performance: Number(performance) }
    });

    return res.json({ message: 'Performance rating updated successfully', performance: Number(performance) });
  } catch (error) {
    console.error('Performance Update Error:', error);
    return res.status(500).json({ message: 'Server error updating performance rating' });
  }
};

// @desc    Remove an employee
// @route   DELETE /api/staff/:id
// @access  Private
const deleteEmployee = async (req, res) => {
  const empId = req.params.id;

  try {
    const result = await db.collection('employees').deleteOne({ _id: empId });
    if (result.deletedCount === 0) {
      // Try string ID matching
      await db.collection('employees').deleteOne({ id: empId });
    }
    return res.json({ message: 'Employee removed from registry' });
  } catch (error) {
    console.error('Delete Employee Error:', error);
    return res.status(500).json({ message: 'Server error removing employee' });
  }
};

// @desc    Submit a staff report
// @route   POST /api/staff/reports
// @access  Private
const submitStaffReport = async (req, res) => {
  const { guestName, roomNo, staffName, service } = req.body;

  try {
    if (!guestName || !roomNo || !staffName || !service) {
      return res.status(400).json({ message: 'Please provide all report details' });
    }

    const report = await db.collection('staffReports').create({
      guestName,
      roomNo,
      staffName,
      service,
      createdAt: new Date().toISOString()
    });

    return res.status(201).json(report);
  } catch (error) {
    console.error('Submit Report Error:', error);
    return res.status(500).json({ message: 'Server error saving staff report' });
  }
};

// @desc    Get all staff reports
// @route   GET /api/staff/reports
// @access  Private
const getStaffReports = async (req, res) => {
  try {
    const reports = await db.collection('staffReports').find();
    const sorted = (reports || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json(sorted);
  } catch (error) {
    console.error('Fetch Reports Error:', error);
    return res.status(500).json({ message: 'Server error fetching staff reports' });
  }
};


const submitFeedback = async (req, res) => {
  const { guestName, roomNo, category, rating, comments } = req.body;

  try {
    if (!guestName || !roomNo || !category || rating === undefined || !comments) {
      return res.status(400).json({ message: 'Please provide all feedback details' });
    }

    const feedback = await db.collection('feedbacks').create({
      guestName,
      roomNo,
      category,
      rating: Number(rating),
      comments,
      createdAt: new Date().toISOString()
    });

    return res.status(201).json(feedback);
  } catch (error) {
    console.error('Submit Feedback Error:', error);
    return res.status(500).json({ message: 'Server error saving guest feedback' });
  }
};

// @desc    Get all guest feedback
// @route   GET /api/feedback
// @access  Private
const getFeedbacks = async (req, res) => {
  try {
    const feedbacks = await db.collection('feedbacks').find();
    const sorted = (feedbacks || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json(sorted);
  } catch (error) {
    console.error('Fetch Feedbacks Error:', error);
    return res.status(500).json({ message: 'Server error fetching guest feedback' });
  }
};

module.exports = {
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
};
