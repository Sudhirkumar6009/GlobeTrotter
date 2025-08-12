const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { createOrUpdateBudget, getBudgetForTrip } = require('../controllers/budgetController');

router.use(auth());

router.post('/', createOrUpdateBudget);
router.get('/trip/:tripId', getBudgetForTrip);

module.exports = router;
