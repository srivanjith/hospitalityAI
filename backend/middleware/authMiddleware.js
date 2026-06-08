const jwt = require('jsonwebtoken');
const { db } = require('../config/db');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'hospitalityai_secure_token_key_gold_navy_2026');

      const user = await db.collection('users').findById(decoded.id);
      if (!user) {
        return res.status(401).json({ message: 'User not found in system' });
      }

      req.user = {
        id: user.id || user._id,
        name: user.name,
        email: user.email,
        role: user.role
      };

      return next();
    } catch (error) {
      console.error('JWT Verification Error:', error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `User role '${req.user?.role || 'none'}' is not authorized to access this resource`
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
