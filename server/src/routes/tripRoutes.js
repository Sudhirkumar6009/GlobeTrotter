const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const ctrl = require('../controllers/tripController');

// Destructure with fallback no-ops to avoid Express receiving undefined
const {
	createTrip = (req, res) => res.status(500).json({ error: 'createTrip handler missing' }),
	getTrips = (req, res) => res.status(500).json({ error: 'getTrips handler missing' }),
	getTrip = (req, res) => res.status(500).json({ error: 'getTrip handler missing' }),
	updateTrip = (req, res) => res.status(500).json({ error: 'updateTrip handler missing' }),
	deleteTrip = (req, res) => res.status(500).json({ error: 'deleteTrip handler missing' }),
	deleteTripImageByUrl = (req, res) => res.status(500).json({ error: 'deleteTripImageByUrl handler missing' }),
	getPublicTrips = (req, res) => res.status(500).json({ error: 'getPublicTrips handler missing' }),
	getTripsByBudget = (req, res) => res.status(500).json({ error: 'getTripsByBudget handler missing' }),
	getBudgetStats = (req, res) => res.status(500).json({ error: 'getBudgetStats handler missing' }),
	getTripWithStops = (req, res) => res.status(500).json({ error: 'getTripWithStops handler missing' }),
	getPublicTripById = (req, res) => res.status(500).json({ error: 'getPublicTripById handler missing' }),
	getPublicTripWithStops = (req, res) => res.status(500).json({ error: 'getPublicTripWithStops handler missing' }),
} = ctrl;

// Debug route registration
console.log('[tripRoutes] Registering trip routes');

// Public routes
router.get('/public', getPublicTrips); // Get public trips (no auth required)
router.get('/public/:tripId', getPublicTripById); // Get a single public trip
router.get('/public/:tripId/with-stops', getPublicTripWithStops); // Get a single public trip with stops

// Protected routes
router.post('/', auth(), createTrip);
router.get('/', auth(), getTrips);
router.get('/:tripId/with-stops', auth(), getTripWithStops); // Require auth for private trips with stops
router.get('/:tripId', auth(), getTrip); // Require auth for private trip by id
router.put('/:tripId', auth(), updateTrip);
router.delete('/:tripId', auth(), deleteTrip);
router.post('/image/delete', auth(), deleteTripImageByUrl);

module.exports = router;
