// middleware/ensureAdmin.js
export default function ensureAdmin(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
    // Accept both boolean isAdmin or userType === 'Admin' depending on your user docs
    const isAdmin = !!req.user.isAdmin || req.user.userType === 'Admin' || req.user.role === 'admin';
    if (!isAdmin) return res.status(403).json({ message: 'Admin access required' });
    next();
  } catch (err) {
    console.error('ensureAdmin error', err);
    res.status(500).json({ message: 'Server error' });
  }
}
