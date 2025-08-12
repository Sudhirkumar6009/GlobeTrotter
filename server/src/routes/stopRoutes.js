const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { createStop, getStopsForTrip, updateStop, deleteStop, getStopsByCategory, getStopCategories } = require('../controllers/stopController');

// Apply authentication middleware to all routes
router.use(auth());

// Validation middleware for stop creation
const validateStopData = (req, res, next) => {
  const { tripId, city, startDate, endDate } = req.body;
  
  const errors = [];
  if (!tripId) errors.push('Trip ID is required');
  if (!city || city.trim().length === 0) errors.push('City name is required');
  if (!startDate) errors.push('Start date is required');
  if (!endDate) errors.push('End date is required');
  
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(', ') });
  }
  
  next();
};

// Category-related routes
router.get('/categories', getStopCategories); // Get all available categories
router.get('/category/:category', getStopsByCategory); // Get stops by category

// Standard CRUD routes with validation
router.post('/', validateStopData, createStop);
router.get('/trip/:tripId', getStopsForTrip);
router.put('/:stopId', updateStop);
router.delete('/:stopId', deleteStop);

// Error handling middleware
router.use((err, req, res, next) => {
  console.error('Stop route error:', err);
  res.status(500).json({ error: 'Internal server error in stops API' });
});

module.exports = router;
