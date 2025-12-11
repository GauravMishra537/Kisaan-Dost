// backend/models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Product',
  },
  qty: {
    type: Number,
    required: true,
    default: 1,
  },
}, { _id: false });

const structuredAddressSchema = new mongoose.Schema({
  line1: String,
  line2: String,
  city: String,
  state: String,
  pincode: String,
  country: String,
}, { _id: false });

const bankDetailsSchema = new mongoose.Schema({
  accountName: String,
  accountNumber: String,
  ifsc: String,
  bankName: String,
  upi: String,
}, { _id: false });

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    password: { type: String, required: true },

    // original user type enum (keeps existing behavior)
    userType: {
      type: String,
      required: true,
      enum: ['Buyer', 'Farmer', 'Admin'],
      default: 'Buyer',
    },

    // NEW: Admin & blocked flags
    isAdmin: { type: Boolean, default: false },   // set true for admin users
    isBlocked: { type: Boolean, default: false }, // if true, login/actions should be blocked

    mobileNo: { type: String, required: false },
    farmName: { type: String, required: false },
    address: { type: String, required: false },

    // Optional structured address (keeps compatibility with string address)
    structuredAddress: { type: structuredAddressSchema, default: undefined },

    // Bank details object (useful for Farmers)
    bankDetails: { type: bankDetailsSchema, default: undefined },

    // Security question / answer (answer stored hashed)
    securityQuestion: { type: String, required: false },
    securityAnswer: { type: String, required: false },

    // Reset token (one-time) and expiry timestamp
    resetToken: { type: String, required: false },
    resetTokenExpiry: { type: Date, required: false },

    // Cart (existing structure preserved)
    cart: { type: [cartItemSchema], default: [] },

    // Optional additional metadata (kept flexible)
    meta: { type: Object, default: {} },

  },
  {
    timestamps: true,
  }
);

/**
 * Password hashing before save
 * - Only hashes if password modified
 */
userSchema.pre('save', async function (next) {
  try {
    if (!this.isModified('password')) {
      next();
      return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

/**
 * Set security answer (hashed)
 */
userSchema.methods.setSecurityAnswer = async function (plainAnswer) {
  if (!plainAnswer) return;
  const salt = await bcrypt.genSalt(10);
  this.securityAnswer = await bcrypt.hash(plainAnswer, salt);
};

/**
 * Compare entered password with stored hash
 */
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

/**
 * Compare entered security answer with stored hash
 */
userSchema.methods.matchSecurityAnswer = async function (enteredAnswer) {
  if (!this.securityAnswer) return false;
  return await bcrypt.compare(enteredAnswer, this.securityAnswer);
};

/**
 * Create a reset token and set expiry
 * - returns the plain token (to be emailed)
 * - stores token and expiry on doc (caller must save)
 */
userSchema.methods.createResetToken = function () {
  const token = crypto.randomBytes(20).toString('hex');
  // expiry: 1 hour from now
  this.resetToken = token;
  this.resetTokenExpiry = Date.now() + 60 * 60 * 1000;
  return token;
};

/**
 * Optional helper to clear reset token after use
 */
userSchema.methods.clearResetToken = function () {
  this.resetToken = undefined;
  this.resetTokenExpiry = undefined;
};

/**
 * toJSON override: remove sensitive fields when converting to JSON
 */
userSchema.methods.toJSON = function () {
  const obj = this.toObject({ virtuals: true });
  delete obj.password;
  delete obj.securityAnswer;
  delete obj.resetToken;
  delete obj.resetTokenExpiry;
  return obj;
};

// Use existing model if already compiled (safe for hot reload)
const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
