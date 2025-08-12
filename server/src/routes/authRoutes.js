const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { signup, login, me, verifyToken, resetPassword, updateProfile, deleteProfilePicture, deleteProfilePictureByUrl, deleteAccount } = require('../controllers/authController');

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', me);
router.post('/verify', verifyToken);
router.post('/reset-password', auth(), resetPassword);

// Profile management routes (multipart handled in controller)
router.put('/profile', auth(), updateProfile);
router.post('/profile/picture', auth(), updateProfile);

router.delete('/profile/picture', auth(), deleteProfilePicture);
router.post('/profile/picture/delete', auth(), deleteProfilePictureByUrl);

// Account deletion route
router.delete('/account', auth(), deleteAccount);

module.exports = router;