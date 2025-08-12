const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { generateItineraryPlan } = require('../controllers/aiController');

// Protected AI planning (change auth() to auth(false) if you want guests allowed)
router.post('/plan', auth(), generateItineraryPlan);

module.exports = router;
