// backend/routes/user.js
import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

function generateToken(id, expires = '30d') {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'changeme', { expiresIn: expires });
}

function maskAccount(bankDetails) {
  if (!bankDetails) return undefined;
  try {
    const acc = bankDetails.accountNumber ? String(bankDetails.accountNumber) : undefined;
    return { ...bankDetails, accountNumber: acc ? '****' + acc.slice(-4) : acc };
  } catch (err) {
    return bankDetails;
  }
}

/**
 * POST /register
 * Public: registers new user. Accepts optional structuredAddress, bankDetails, securityQuestion/Answer.
 */
router.post('/register', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      userType = 'Buyer',
      mobileNo,
      farmName,
      address,
      structuredAddress,
      bankDetails,
      securityQuestion,
      securityAnswer,
    } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    const existing = await User.findOne({ email: (email || '').toLowerCase() });
    if (existing) return res.status(400).json({ message: 'User already exists with this email' });

    const user = new User({
      name,
      email: (email || '').toLowerCase(),
      password,
      userType,
      mobileNo,
      farmName,
      address: address || undefined,
      structuredAddress: structuredAddress || undefined,
      bankDetails: userType === 'Farmer' ? bankDetails || undefined : undefined,
      securityQuestion: securityQuestion || undefined,
      securityAnswer: securityAnswer || undefined,
    });

    const created = await user.save();
    const token = generateToken(created._id);

    return res.status(201).json({
      token,
      user: {
        _id: created._id,
        name: created.name,
        email: created.email,
        userType: created.userType,
        mobileNo: created.mobileNo,
        farmName: created.farmName,
        address: created.address,
        structuredAddress: created.structuredAddress,
        bankDetails: maskAccount(created.bankDetails),
      },
    });
  } catch (err) {
    console.error('REGISTER ERROR:', err && err.stack ? err.stack : err);
    return res.status(500).json({ message: 'Server error registering user' });
  }
});

/**
 * POST /login
 * Public: login.
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    const ok = await user.matchPassword(password);
    if (!ok) return res.status(401).json({ message: 'Invalid email or password' });

    const token = generateToken(user._id);
    return res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        mobileNo: user.mobileNo,
        farmName: user.farmName,
        address: user.address,
        structuredAddress: user.structuredAddress,
        bankDetails: maskAccount(user.bankDetails),
      },
    });
  } catch (err) {
    console.error('LOGIN ERROR:', err && err.stack ? err.stack : err);
    return res.status(500).json({ message: 'Server error on login' });
  }
});

/**
 * POST /forgot
 * Body: { email } -> returns securityQuestion if user exists and set, otherwise generic message.
 */
router.post('/forgot', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: 'Email required' });

    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (!user || !user.securityQuestion) {
      // do not reveal account existence
      return res.json({ message: 'If an account exists for that email, a security question will be provided.' });
    }

    return res.json({ message: 'Security question fetched', question: user.securityQuestion });
  } catch (err) {
    console.error('FORGOT ERROR:', err && err.stack ? err.stack : err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * POST /verify-security
 * Body: { email, answer } -> returns { resetToken } if correct.
 */
router.post('/verify-security', async (req, res) => {
  try {
    const { email, answer } = req.body || {};
    if (!email || !answer) return res.status(400).json({ message: 'Email and answer required' });

    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (!user || !user.securityAnswer) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await user.matchSecurityAnswer(answer);
    if (!ok) return res.status(401).json({ message: 'Incorrect answer' });

    const resetToken = generateToken(user._id, '15m'); // short-lived reset token
    return res.json({ resetToken, message: 'Answer verified' });
  } catch (err) {
    console.error('VERIFY SECURITY ERROR:', err && err.stack ? err.stack : err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * POST /reset-password
 * Body: { resetToken, newPassword }
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body || {};
    if (!resetToken || !newPassword) return res.status(400).json({ message: 'Token and new password required' });

    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET || 'changeme');
    } catch (err) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    if (!decoded || !decoded.id) return res.status(400).json({ message: 'Invalid token' });

    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.password = newPassword; // will be hashed by pre-save hook
    await user.save();

    return res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('RESET PASSWORD ERROR:', err && err.stack ? err.stack : err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /profile - Protected
 */
router.get('/profile', protect, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(404).json({ message: 'User not found' });

    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      userType: user.userType,
      mobileNo: user.mobileNo,
      farmName: user.farmName,
      address: user.address,
      structuredAddress: user.structuredAddress,
      bankDetails: maskAccount(user.bankDetails),
      cart: user.cart,
      createdAt: user.createdAt,
    });
  } catch (err) {
    console.error('PROFILE GET ERROR:', err && err.stack ? err.stack : err);
    return res.status(500).json({ message: 'Server error getting profile' });
  }
});

/**
 * PUT /profile - Protected
 */
router.put('/profile', protect, async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.mobileNo = req.body.mobileNo || user.mobileNo;
    user.farmName = req.body.farmName || user.farmName;

    if (req.body.address) user.address = req.body.address;
    if (req.body.structuredAddress) user.structuredAddress = req.body.structuredAddress;
    if (req.body.bankDetails) user.bankDetails = req.body.bankDetails;

    if (req.body.securityQuestion) user.securityQuestion = req.body.securityQuestion;
    if (req.body.securityAnswer) user.securityAnswer = req.body.securityAnswer;

    if (req.body.password) user.password = req.body.password;

    const updated = await user.save();

    return res.json({
      _id: updated._id,
      name: updated.name,
      email: updated.email,
      userType: updated.userType,
      mobileNo: updated.mobileNo,
      farmName: updated.farmName,
      address: updated.address,
      structuredAddress: updated.structuredAddress,
      bankDetails: maskAccount(updated.bankDetails),
    });
  } catch (err) {
    console.error('PROFILE PUT ERROR:', err && err.stack ? err.stack : err);
    return res.status(500).json({ message: 'Server error updating profile' });
  }
});

/**
 * DELETE /profile - Protected
 */
router.delete('/profile', protect, async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await user.deleteOne();
    return res.json({ message: 'User account deactivated' });
  } catch (err) {
    console.error('PROFILE DELETE ERROR:', err && err.stack ? err.stack : err);
    return res.status(500).json({ message: 'Server error deleting profile' });
  }
});

export default router;
