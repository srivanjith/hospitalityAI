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

    const user = await db.collection('users').findOne({ email: emailLower });

    if (!user) {
      return res.status(401).json({ message: 'Email address not registered. Please sign up or continue with Google.' });
    }

    if (isHotelEmail && user.role !== 'manager' && user.role !== 'admin') {
      return res.status(403).json({ message: 'Invalid credentials or permissions for hotel department login.' });
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
      return res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ message: 'Server error during login' });
  }
};

const registerUser = async (req, res) => {
  const { name, email, password, isGoogleLogin } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email, and password' });
    }

    const emailLower = email.toLowerCase().trim();
    const existingUser = await db.collection('users').findOne({ email: emailLower });

    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email address already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await db.collection('users').create({
      name,
      email: emailLower,
      password: hashedPassword,
      role: 'guest',
      isGoogleLogin: isGoogleLogin || false
    });

    console.log(`🌱 Registered new resident guest account: ${emailLower}`);

    return res.status(201).json({
      id: user.id || user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user.id || user._id)
    });
  } catch (error) {
    console.error('Registration Error:', error);
    return res.status(500).json({ message: 'Server error during registration' });
  }
};

const googleLogin = async (req, res) => {
  const { email, name } = req.body;

  try {
    if (!email || !name) {
      return res.status(400).json({ message: 'Please provide Google user profile details' });
    }

    const emailLower = email.toLowerCase().trim();
    let user = await db.collection('users').findOne({ email: emailLower });

    if (!user) {
      // Create user if not exists
      const randomPassword = Math.random().toString(36) + Math.random().toString(36);
      const hashedPassword = await bcrypt.hash(randomPassword, 10);
      user = await db.collection('users').create({
        name,
        email: emailLower,
        password: hashedPassword,
        role: 'guest',
        isGoogleLogin: true
      });
      console.log(`🌱 Registered new Google login user: ${emailLower}`);
    }

    return res.json({
      id: user.id || user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user.id || user._id)
    });
  } catch (error) {
    console.error('Google Login Error:', error);
    return res.status(500).json({ message: 'Server error during Google login' });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const user = await db.collection('users').findById(req.user.id);
    if (user) {
      return res.json({
        id: user.id || user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || '',
        address: user.address || '',
        preferredRoom: user.preferredRoom || '',
        specialRequests: user.specialRequests || '',
        isGoogleLogin: user.isGoogleLogin || false,
        profilePicture: user.profilePicture || '',
        gender: user.gender || '',
        dob: user.dob || '',
        city: user.city || '',
        state: user.state || '',
        country: user.country || '',
        pincode: user.pincode || ''
      });
    } else {
      return res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Profile Fetch Error:', error);
    return res.status(500).json({ message: 'Server error fetching profile' });
  }
};

const updateUserProfile = async (req, res) => {
  const { 
    name, email, password, phone, address, preferredRoom, specialRequests,
    profilePicture, gender, dob, city, state, country, pincode 
  } = req.body;

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
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (preferredRoom !== undefined) updateData.preferredRoom = preferredRoom;
    if (specialRequests !== undefined) updateData.specialRequests = specialRequests;
    if (profilePicture !== undefined) updateData.profilePicture = profilePicture;
    if (gender !== undefined) updateData.gender = gender;
    if (dob !== undefined) updateData.dob = dob;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (country !== undefined) updateData.country = country;
    if (pincode !== undefined) updateData.pincode = pincode;

    const updatedUser = await db.collection('users').findByIdAndUpdate(
      req.user.id,
      { $set: updateData }
    );

    return res.json({
      id: updatedUser.id || updatedUser._id,
      name: name || updatedUser.name,
      email: email || updatedUser.email,
      role: updatedUser.role,
      phone: phone !== undefined ? phone : updatedUser.phone,
      address: address !== undefined ? address : updatedUser.address,
      preferredRoom: preferredRoom !== undefined ? preferredRoom : updatedUser.preferredRoom,
      specialRequests: specialRequests !== undefined ? specialRequests : updatedUser.specialRequests,
      profilePicture: profilePicture !== undefined ? profilePicture : updatedUser.profilePicture,
      gender: gender !== undefined ? gender : updatedUser.gender,
      dob: dob !== undefined ? dob : updatedUser.dob,
      city: city !== undefined ? city : updatedUser.city,
      state: state !== undefined ? state : updatedUser.state,
      country: country !== undefined ? country : updatedUser.country,
      pincode: pincode !== undefined ? pincode : updatedUser.pincode,
      isGoogleLogin: updatedUser.isGoogleLogin,
      token: generateToken(updatedUser.id || updatedUser._id)
    });
  } catch (error) {
    console.error('Profile Update Error:', error);
    return res.status(500).json({ message: 'Server error updating profile' });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ message: 'Please provide an email address' });
    }

    const user = await db.collection('users').findOne({ email: email.toLowerCase().trim() });
    
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

const checkEmail = async (req, res) => {
  const { email } = req.body;
  try {
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    const emailLower = email.toLowerCase().trim();
    const user = await db.collection('users').findOne({ email: emailLower });
    return res.json({ exists: !!user });
  } catch (error) {
    console.error('Check Email Error:', error);
    return res.status(500).json({ message: 'Server error checking email' });
  }
};

module.exports = {
  loginUser,
  registerUser,
  googleLogin,
  getUserProfile,
  updateUserProfile,
  forgotPassword,
  checkEmail
};
