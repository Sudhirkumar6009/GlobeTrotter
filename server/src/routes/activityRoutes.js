const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { createActivity, getActivitiesForStop, updateActivity, deleteActivity } = require('../controllers/activityController');

router.use(auth());

router.post('/', createActivity);
router.get('/stop/:stopId', getActivitiesForStop);
router.put('/:activityId', updateActivity);
router.delete('/:activityId', deleteActivity);

module.exports = router;
