import express from 'express';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const router = express.Router();

// Helper to generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// ====================================================================
// @desc    Register new user (Buyer / Farmer / Admin if manually set later)
// @route   POST /api/auth/register
// @access  Public
// ====================================================================
router.post('/register', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      userType,
      mobileNo,
      farmName,
      structuredAddress,
      bankDetails,
      securityQuestion,
      securityAnswer,
    } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = new User({
      name,
      email: email.toLowerCase(),
      password,
      userType, // Buyer / Farmer (Admin can be set manually or via admin API)
      mobileNo,
      farmName,
      structuredAddress,
      bankDetails: userType === 'Farmer' ? bankDetails : undefined,
      securityQuestion,
    });

    // Hash and store the security answer if provided
    if (securityAnswer) {
      const salt = await bcrypt.genSalt(10);
      user.securityAnswer = await bcrypt.hash(securityAnswer, salt);
    }

    const created = await user.save();

    return res.status(201).json({
      _id: created._id,
      name: created.name,
      email: created.email,
      userType: created.userType,
      isAdmin: created.isAdmin,
      isBlocked: created.isBlocked,
      token: generateToken(created._id),
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Server error during registration' });
  }
});

// ====================================================================
// @desc    Login user (Buyer / Farmer / Admin)
// @route   POST /api/auth/login
// @access  Public
// ====================================================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });

    // User not found
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // BLOCKED USER CHECK (new)
    if (user.isBlocked) {
      return res.status(403).json({
        message: 'Your account is blocked. Please contact support or admin.',
      });
    }

    // Password match
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Successful login
    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      userType: user.userType, // Buyer / Farmer / Admin
      isAdmin: user.isAdmin,   // IMPORTANT for admin dashboard
      isBlocked: user.isBlocked,
      token: generateToken(user._id),
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error during login' });
  }
});

// ====================================================================
// @desc    Forgot Password - return security question
// @route   POST /api/auth/forgot
// @access  Public
// ====================================================================
router.post('/forgot', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user || !user.securityQuestion) {
      return res.status(200).json({
        message:
          'If an account exists and has a security question, the question will be shown.',
      });
    }

    return res.status(200).json({ question: user.securityQuestion });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ====================================================================
// @desc    Verify security answer and issue temporary reset token
// @route   POST /api/auth/verify-security
// @access  Public
// ====================================================================
router.post('/verify-security', async (req, res) => {
  try {
    const { email, answer } = req.body;
    if (!email || !answer)
      return res.status(400).json({ message: 'Email and answer required' });

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user || !user.securityAnswer) {
      return res.status(400).json({
        message: 'Account does not have a security question configured.',
      });
    }

    const match = await bcrypt.compare(answer, user.securityAnswer);
    if (!match) {
      return res.status(401).json({ message: 'Incorrect security answer' });
    }

    const token = crypto.randomBytes(20).toString('hex');
    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 60 * 60 * 1000;
    await user.save();

    return res.status(200).json({ resetToken: token });
  } catch (err) {
    console.error('Verify security error:', err);
    return res.status(500).json({ message: 'Server error verifying security answer' });
  }
});

// ====================================================================
// @desc    Reset password using resetToken
// @route   POST /api/auth/reset-password
// @access  Public
// ====================================================================
router.post('/reset-password', async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword)
      return res.status(400).json({ message: 'Token and new password required' });

    const user = await User.findOne({
      resetToken,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    user.password = newPassword; // Will be hashed by pre-save hook
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;

    await user.save();

    return res.status(200).json({ message: 'Password reset successful. Please log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ message: 'Server error resetting password' });
  }
});

export default router;
