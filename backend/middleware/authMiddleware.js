import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// This middleware protects routes
const protect = async (req, res, next) => {
  let token;

  // Check for the token in the "Authorization" header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header (e.g., "Bearer 12345...")
      token = req.headers.authorization.split(' ')[1];

      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get the user from the token and attach it to the request object
      req.user = await User.findById(decoded.id).select('-password');

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// This middleware checks if the user is a Farmer
const isFarmer = (req, res, next) => {
  if (req.user && req.user.userType === 'Farmer') {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized as a farmer' });
  }
};

export { protect, isFarmer };