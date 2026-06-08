const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/db');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'hospitalityai_secure_token_key_gold_navy_2026', {
    expiresIn: '30d'
  });
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const emailLower = email.toLowerCase().trim();

    const isHotelEmail = emailLower.endsWith('@hospitality.com') || emailLower.endsWith('@grandroyal.com');

    // 1. Resident Guest Logic (Any non-hotel email domain like Gmail, Yahoo, Outlook, etc.)
    if (!isHotelEmail) {
      let user = await db.collection('users').findOne({ email: emailLower });
      
      if (!user) {
        // Auto-create guest account for any new guest login attempts
        const hashedPassword = await bcrypt.hash(password, 10);
        user = await db.collection('users').create({
          name: emailLower.split('@')[0].replace(/[^a-zA-Z]/g, ' ').toUpperCase(),
          email: emailLower,
          password: hashedPassword,
          role: 'guest'
        });
        console.log(`🌱 Auto-created resident guest account: ${emailLower}`);
      }

      if (await bcrypt.compare(password, user.password)) {
        return res.json({
          id: user.id || user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          token: generateToken(user.id || user._id)
        });
      } else {
        return res.status(401).json({ message: 'Invalid password for this Resident Guest account' });
      }
    } 
    
    // 2. Manager / Department Staff Logic (hotel department emails)
    else {
      const user = await db.collection('users').findOne({ email: emailLower });
      if (user && (await bcrypt.compare(password, user.password))) {
        // Double check they have manager or admin role, since guest shouldn't be under these emails
        if (user.role !== 'manager' && user.role !== 'admin') {
          return res.status(403).json({ message: 'Invalid credentials or permissions for hotel department login.' });
        }
        
        return res.json({
          id: user.id || user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          token: generateToken(user.id || user._id)
        });
      } else {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
    }
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ message: 'Server error during login' });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await db.collection('users').findById(req.user.id);
    if (user) {
      return res.json({
        id: user.id || user._id,
        name: user.name,
        email: user.email,
        role: user.role
      });
    } else {
      return res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Profile Fetch Error:', error);
    return res.status(500).json({ message: 'Server error fetching profile' });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const user = await db.collection('users').findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email.toLowerCase().trim();
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await db.collection('users').findByIdAndUpdate(
      req.user.id,
      { $set: updateData }
    );

    return res.json({
      id: updatedUser.id || updatedUser._id,
      name: name || updatedUser.name,
      email: email || updatedUser.email,
      role: updatedUser.role,
      token: generateToken(updatedUser.id || updatedUser._id)
    });
  } catch (error) {
    console.error('Profile Update Error:', error);
    return res.status(500).json({ message: 'Server error updating profile' });
  }
};

// @desc    Forgot password request simulation
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ message: 'Please provide an email address' });
    }

    const user = await db.collection('users').findOne({ email: email.toLowerCase().trim() });
    
    // For security, don't confirm if user exists or not, just return a generic success message
    if (user) {
      console.log(`[FORGOT PASSWORD] Password reset requested for: ${email}`);
      console.log(`[FORGOT PASSWORD] Sent password reset link!`);
    }

    return res.json({ 
      message: 'If that email address exists in our database, we have sent a link to reset your password.' 
    });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    return res.status(500).json({ message: 'Server error processing password recovery' });
  }
};

module.exports = {
  loginUser,
  getUserProfile,
  updateUserProfile,
  forgotPassword
};
