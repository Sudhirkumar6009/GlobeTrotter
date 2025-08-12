const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { User } = require('../../models');
const { uploadToImageKit, deleteImageByUrl } = require('../utils/ImagekitOperations');

const JWT_SECRET = process.env.JWT_SECRET || 'GreatSecretKeyForJWT';
const JWT_EXPIRES = '7d';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

function signToken(user) {
  return jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

exports.signup = async (req, res) => {
  try {
    console.log('Signup req.body:', req.body);
    if (!req.body) {
      return res.status(400).json({ error: 'No request body received. Make sure to send JSON and set Content-Type: application/json.' });
    }
    const { name, email, password, country, phone } = req.body;
    if (!name || !email || !password || !country || !phone) {
      return res.status(400).json({ error: 'Name, email, password, Country and Phone No are required' });
    }
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'Email already in use' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash, country, phone });

    const token = signToken(user);
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    console.log('Login req.body:', req.body);
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.me = async (req, res) => {
  try {
    let token = req.headers.authorization;
    if (token && token.startsWith('Bearer ')) {
      token = token.substring(7);
    } else if (req.body && req.body.token) {
      token = req.body.token;
    }
    if (!token) {
      return res.status(400).json({ error: 'Token missing' });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      return res.status(401).json({ error: 'Invalid token user' });
    }
    res.json({ user });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

exports.verifyToken = async (req, res) => {
  try {
    let token = req.headers.authorization;
    if (token && token.startsWith('Bearer ')) {
      token = token.substring(7);
    } else if (req.body && req.body.token) {
      token = req.body.token;
    }
    if (!token) {
      return res.status(400).json({ valid: false, error: 'Token missing' });
    }
    jwt.verify(token, JWT_SECRET);
    res.json({ valid: true });
  } catch (err) {
    res.status(401).json({ valid: false, error: 'Invalid or expired token' });
  }
};

// New: reset password (requires auth middleware supplying req.user)
exports.resetPassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'oldPassword and newPassword are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const match = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid old password' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// New: update profile with optional image upload
exports.updateProfile = (req, res) => {
  // If not multipart, handle as JSON update
  if (!req.is('multipart/form-data')) {
    return (async () => {
      try {
        const userId = req.user?._id || req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        const { name, phone, country, preferences } = req.body;
        const updateData = {};
        
        if (name) updateData.name = name;
        if (phone) updateData.phone = phone;
        if (country) updateData.country = country;
        if (preferences) updateData.preferences = preferences;

        const user = await User.findByIdAndUpdate(userId, updateData, { 
          new: true, 
          runValidators: true 
        }).select('-passwordHash');
        
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        res.json({ message: 'Profile updated successfully', user });
      } catch (err) {
        console.error('Update profile (non-multipart) error:', err.message);
        res.status(500).json({ error: 'Server error' });
      }
    })();
  }

  // Parse multipart (with potential profile picture)
  upload.fields([
    { name: 'profilePicture', maxCount: 1 },
    { name: 'image', maxCount: 1 }
  ])(req, res, async (err) => {
    if (err) {
      console.error('Multer parse error:', err);
      return res.status(400).json({ error: `Image parsing failed: ${err.message}` });
    }
    
    try {
      const userId = req.user?._id || req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { name, phone, country, preferences } = req.body;
      let updateData = {};
      
      if (name) updateData.name = name;
      if (phone) updateData.phone = phone;
      if (country) updateData.country = country;
      if (preferences) {
        try {
          updateData.preferences = typeof preferences === 'string' 
            ? JSON.parse(preferences) 
            : preferences;
        } catch (e) {
          console.warn('Invalid preferences JSON:', e.message);
        }
      }

      // Handle profile picture upload
      const file = 
        (req.files?.profilePicture && req.files.profilePicture[0]) ||
        (req.files?.image && req.files.image[0]) ||
        req.file || // in case upstream middleware provided single file
        null;

      if (file) {
        // Get current user to check for existing profile picture
        const currentUser = await User.findById(userId);
        
        // Delete old profile picture if exists
        if (currentUser?.profilePicture && 
            typeof currentUser.profilePicture === 'string' && 
            currentUser.profilePicture.startsWith('http')) {
          try {
            await deleteImageByUrl(currentUser.profilePicture);
          } catch (e) {
            console.warn('Old profile picture deletion failed:', e.message);
          }
        }

        // Upload new profile picture
        const safeOriginal = file.originalname.replace(/[^\w.\-]/g, '_');
        const fileName = `${Date.now()}_${safeOriginal}`;
        const folder = `/profiles/`;
        updateData.profilePicture = await uploadToImageKit(file.buffer, fileName, folder);
      }

      const user = await User.findByIdAndUpdate(userId, updateData, { 
        new: true, 
        runValidators: true 
      }).select('-passwordHash');
      
      if (!user) return res.status(404).json({ error: 'User not found' });
      
      res.json({ message: 'Profile updated successfully', user });
    } catch (e) {
      console.error('Update profile error:', e);
      res.status(500).json({ error: 'Server error' });
    }
  });
};

// New: delete profile picture
exports.deleteProfilePicture = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let imageDeleted = false;
    if (typeof user.profilePicture === 'string' && user.profilePicture.startsWith('http')) {
      try {
        await deleteImageByUrl(user.profilePicture);
        imageDeleted = true;
      } catch (e) {
        console.warn('Profile picture deletion failed:', e.message);
      }
    }

    // Remove profile picture from user document
    user.profilePicture = undefined;
    await user.save();

    res.json({ message: 'Profile picture deleted', imageDeleted });
  } catch (err) {
    console.error('Delete profile picture error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// New: delete profile picture by URL (expects { url } in body)
exports.deleteProfilePictureByUrl = async (req, res) => {
  try {
    const { url } = req.body; // keep "url" as the expected key
    if (!url) return res.status(400).json({ error: 'url is required' });
    
    const result = await deleteImageByUrl(url);
    res.json({ message: 'Profile picture deleted', ...result });
  } catch (err) {
    console.error('Delete profile picture by URL error:', err.message);
    res.status(500).json({ error: 'Profile picture delete by URL failed' });
  }
};

// New: delete user account with data cleanup
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user details before deletion
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Delete profile picture from ImageKit if exists
    let imageDeleted = false;
    if (typeof user.profilePicture === 'string' && user.profilePicture.startsWith('http')) {
      try {
        await deleteImageByUrl(user.profilePicture);
        imageDeleted = true;
        console.log('Profile picture deleted from ImageKit');
      } catch (e) {
        console.warn('Profile picture deletion failed:', e.message);
      }
    }

    // Import required models
    const { Trip, Stop, Activity, Budget } = require('../../models');

    // Update all related records to nullify user association instead of deleting
    // This preserves public trips and related data for community benefit
    
    // Update trips: set userId to null but keep the trips
    const tripUpdateResult = await Trip.updateMany(
      { userId: userId },
      { $unset: { userId: 1 } } // Remove userId field entirely
    );
    
    // Update stops: find all stops for user's trips and nullify associations
    const userTripIds = await Trip.find({ 
      $or: [
        { userId: userId },
        { userId: { $exists: false } }
      ]
    }).distinct('_id');
    
    const stopUpdateResult = await Stop.updateMany(
      { tripId: { $in: userTripIds } },
      { $set: { userId: null } } // Set to null to indicate orphaned record
    );

    // Update activities: find all activities for user's stops and nullify associations
    const userStopIds = await Stop.find({
      tripId: { $in: userTripIds }
    }).distinct('_id');
    
    const activityUpdateResult = await Activity.updateMany(
      { stopId: { $in: userStopIds } },
      { $set: { userId: null } } // Set to null to indicate orphaned record
    );

    // Update budgets: nullify user association
    const budgetUpdateResult = await Budget.updateMany(
      { tripId: { $in: userTripIds } },
      { $set: { userId: null } } // Set to null to indicate orphaned record
    );

    // Finally, delete the user account
    await User.findByIdAndDelete(userId);

    // Log the cleanup results
    console.log('Account deletion cleanup results:', {
      userId: userId.toString(),
      tripsUpdated: tripUpdateResult.modifiedCount,
      stopsUpdated: stopUpdateResult.modifiedCount,
      activitiesUpdated: activityUpdateResult.modifiedCount,
      budgetsUpdated: budgetUpdateResult.modifiedCount,
      profilePictureDeleted: imageDeleted
    });

    res.json({ 
      message: 'Account deleted successfully',
      details: {
        tripsPreserved: tripUpdateResult.modifiedCount,
        stopsUpdated: stopUpdateResult.modifiedCount,
        activitiesUpdated: activityUpdateResult.modifiedCount,
        budgetsUpdated: budgetUpdateResult.modifiedCount,
        profilePictureDeleted: imageDeleted
      }
    });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'Account deletion failed' });
  }
};
