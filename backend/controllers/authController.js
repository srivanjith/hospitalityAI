const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
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

const sendResetEmail = async (email, resetLink, name) => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || 587;
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (!host || !user || !pass) {
    console.warn(
      '⚠️ SMTP configuration not found in backend/.env. Real email delivery will be simulated.'
    );
    console.log(
      `\n==================================================\n` +
      `🔑 PASSWORD RESET SIMULATION FOR: ${email}\n` +
      `Reset Link: ${resetLink}\n` +
      `==================================================\n`
    );
    return false;
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: {
      user,
      pass
    }
  });

  const mailOptions = {
    from: `"HospitalityAI" <${user}>`,
    to: email,
    subject: 'Reset Your HospitalityAI Password',
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background-color: #0c101a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; color: #f1f5f9;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="font-family: 'Playfair Display', serif; color: #d4af37; margin: 0; font-size: 24px;">HospitalityAI</h2>
          <p style="color: #64748b; font-size: 11px; text-transform: uppercase; tracking-wider; margin-top: 4px;">Exclusive Resort Management</p>
        </div>
        <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">Dear ${name || 'Valued Partner'},</p>
        <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">We received a request to reset your account password. If you did not make this request, you can ignore this email safely.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetLink}" style="background: linear-gradient(135deg, #d4af37 0%, #aa7c11 100%); color: #ffffff; text-decoration: none; padding: 12px 28px; font-size: 12px; font-weight: bold; border-radius: 8px; box-shadow: 0 4px 12px rgba(212, 175, 55, 0.2); display: inline-block;">Change Password</a>
        </div>
        <p style="font-size: 12px; color: #64748b; line-height: 1.6;">The link above is valid for 15 minutes. For security, never share this link or copy it to untrusted windows.</p>
        <hr style="border: 0; border-top: 1px solid #1e293b; margin: 24px 0;" />
        <p style="font-size: 10px; color: #64748b; text-align: center; margin: 0;">© 2026 The Grand Royal Resort. Sathy, Erode, Tamil Nadu, India.</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
  console.log(`[SMTP] Password reset email sent successfully to ${email}`);
  return true;
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ message: 'Please provide an email address' });
    }

    const emailLower = email.toLowerCase().trim();
    console.log(`[FORGOT PASSWORD] Password reset requested for email: ${emailLower}`);

    const user = await db.collection('users').findOne({ email: emailLower });
    
    if (!user) {
      console.log(`[FORGOT PASSWORD] Reset requested for UNREGISTERED email: ${emailLower}`);
      return res.json({ 
        message: 'If that email address exists in our database, we have sent a link to reset your password.',
        emailExists: false
      });
    }

    // Generate short-lived token
    const token = jwt.sign(
      { id: user.id || user._id },
      process.env.JWT_SECRET || 'hospitalityai_secure_token_key_gold_navy_2026',
      { expiresIn: '15m' }
    );
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
    const resetLink = `${frontendUrl}/?token=${token}`;

    const sent = await sendResetEmail(emailLower, resetLink, user.name);

    if (!sent) {
      console.log(`[FORGOT PASSWORD] SMTP not configured. Returning reset token to frontend for EmailJS fallback.`);
      return res.json({
        message: 'If that email address exists in our database, we have sent a link to reset your password.',
        emailExists: true,
        resetLink,
        token,
        simulate: true
      });
    }

    return res.json({ 
      message: 'If that email address exists in our database, we have sent a link to reset your password.',
      emailExists: true,
      simulate: false
    });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    return res.status(500).json({ message: 'Server error processing password recovery' });
  }
};

const resetPassword = async (req, res) => {
  const { token, password } = req.body;

  try {
    if (!token || !password) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'hospitalityai_secure_token_key_gold_navy_2026'
      );
    } catch (err) {
      return res.status(400).json({ message: 'Password reset link has expired or is invalid. Please request a new one.' });
    }

    const userId = decoded.id;
    const user = await db.collection('users').findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User account not found' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.collection('users').findByIdAndUpdate(userId, {
      $set: { password: hashedPassword }
    });

    console.log(`[RESET PASSWORD] Password updated successfully in database for user ID: ${userId}`);

    return res.json({ message: 'Your password has been successfully updated! You can now log in.' });
  } catch (error) {
    console.error('Reset Password Error:', error);
    return res.status(500).json({ message: 'Server error updating password' });
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
  resetPassword,
  checkEmail
};
