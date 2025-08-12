const jwt = require('jsonwebtoken');
const { User } = require('../../models');

module.exports = function auth(required = true) {
  return async function (req, res, next) {
    try {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

      if (!token) {
        if (!required) return next();
        return res.status(401).json({ error: 'Authentication token missing' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'GreatSecretKeyForJWT');
      const user = await User.findById(decoded.id).select('-passwordHash');
      if (!user) return res.status(401).json({ error: 'Invalid token user' });

      req.user = user; // attach user
      next();
    } catch (err) {
      console.error('Auth error:', err.message);
      return res.status(401).json({ error: 'Unauthorized' });
    }
  };
};
