const { Trip } = require('../../models');
const multer = require('multer');
const mongoose = require('mongoose'); // Import mongoose for ObjectId validation
const { uploadToImageKit, deleteImageByUrl } = require('../utils/ImagekitOperations');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

function computeTemporalStatus(startDate, endDate) {
  try {
    const now = new Date();
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (now < s) return 'planning';
    if (now > e) return 'completed';
    return 'active';
  } catch (_) {
    return 'planning';
  }
}

exports.createTrip = (req, res) => {
  // If not multipart, skip multer and just create (coverPhoto can be a URL/string)
  if (!req.is('multipart/form-data')) {
    return (async () => {
      try {
        if (!req.user || !req.user._id) return res.status(401).json({ error: 'Unauthorized' });
  const { name, startDate, endDate, startTime, endTime, description, coverPhoto, visibility, budget, plannedBudget, participants, suggestions } = req.body;
  let suggestionsVal = undefined;
  if (Array.isArray(suggestions)) suggestionsVal = suggestions;
  else if (typeof suggestions === 'string') { try { suggestionsVal = JSON.parse(suggestions); } catch (_) { suggestionsVal = undefined; } }
        let { sections } = req.body;
        if (typeof sections === 'string') {
          try { sections = JSON.parse(sections); } catch (_) { sections = undefined; }
        }
        
        // Validate time format if provided
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (startTime && !timeRegex.test(startTime)) {
          return res.status(400).json({ error: 'Start time must be in HH:MM format (24-hour)' });
        }
        if (endTime && !timeRegex.test(endTime)) {
          return res.status(400).json({ error: 'End time must be in HH:MM format (24-hour)' });
        }

        // Validate sections if provided
        if (Array.isArray(sections)) {
          for (const s of sections) {
            if (s.startTime && !timeRegex.test(s.startTime)) {
              return res.status(400).json({ error: `Section ${s.title || s.id}: startTime must be HH:MM` });
            }
            if (s.endTime && !timeRegex.test(s.endTime)) {
              return res.status(400).json({ error: `Section ${s.title || s.id}: endTime must be HH:MM` });
            }
          }
        }

        // Validate visibility if provided
        if (visibility && !['public', 'private'].includes(visibility)) {
          return res.status(400).json({ error: 'Visibility must be either "public" or "private"' });
        }

        // Validate budget if provided
        if (budget !== undefined && budget !== null && budget !== '') {
          const budgetNum = parseFloat(budget);
          if (isNaN(budgetNum) || budgetNum < 0) {
            return res.status(400).json({ error: 'Budget must be a positive number' });
          }
        }
        
        const trip = await Trip.create({
          userId: req.user._id,
          name,
          startDate,
          endDate,
          startTime,
          endTime,
          description,
          coverPhoto,
          visibility: visibility || 'private',
          budget: budget ? parseFloat(budget) : undefined,
          plannedBudget: plannedBudget ? parseFloat(plannedBudget) : undefined,
          participants: participants ? parseInt(participants) : undefined,
          suggestions: suggestionsVal,
          sections: Array.isArray(sections) ? sections.map(s => ({
            id: s.id,
            title: s.title,
            description: s.description,
            dateRange: s.dateRange,
            budget: s.budget || 0,
            allDay: !!s.allDay,
            startTime: s.startTime || undefined,
            endTime: s.endTime || undefined,
          })) : undefined
        });
        res.status(201).json(trip);
      } catch (err) {
        console.error('Create trip (non-multipart) error:', err.message);
        res.status(500).json({ error: 'Server error' });
      }
    })();
  }

  // Parse multipart (accept either "image" or "coverPhoto" file fields)
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'coverPhoto', maxCount: 1 }
  ])(req, res, async (err) => {
    if (err) {
      console.error('Multer parse error:', err);
      return res.status(400).json({ error: `Image parsing failed: ${err.message}` });
    }
    try {
      if (!req.user || !req.user._id) return res.status(401).json({ error: 'Unauthorized' });

  const { name, startDate, endDate, startTime, endTime, description, visibility, budget, plannedBudget, participants, suggestions } = req.body;
      let { sections } = req.body;
      if (typeof sections === 'string') {
        try { sections = JSON.parse(sections); } catch (_) { sections = undefined; }
      }
      let { coverPhoto } = req.body;

      // Validate time format if provided
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (startTime && !timeRegex.test(startTime)) {
        return res.status(400).json({ error: 'Start time must be in HH:MM format (24-hour)' });
      }
      if (endTime && !timeRegex.test(endTime)) {
        return res.status(400).json({ error: 'End time must be in HH:MM format (24-hour)' });
      }

      // Validate sections if provided
      if (Array.isArray(sections)) {
        for (const s of sections) {
          if (s.startTime && !timeRegex.test(s.startTime)) {
            return res.status(400).json({ error: `Section ${s.title || s.id}: startTime must be HH:MM` });
          }
          if (s.endTime && !timeRegex.test(s.endTime)) {
            return res.status(400).json({ error: `Section ${s.title || s.id}: endTime must be HH:MM` });
          }
        }
      }

      // Validate visibility if provided
      if (visibility && !['public', 'private'].includes(visibility)) {
        return res.status(400).json({ error: 'Visibility must be either "public" or "private"' });
      }

      // Pick first available uploaded file
      const file =
        (req.files?.image && req.files.image[0]) ||
        (req.files?.coverPhoto && req.files.coverPhoto[0]) ||
        null;

      if (file) {
        const safeOriginal = file.originalname.replace(/[^\w.\-]/g, '_');
        const fileName = `${Date.now()}_${safeOriginal}`;
        const folder = `/trips/`;
        coverPhoto = await uploadToImageKit(file.buffer, fileName, folder);
      }

      const status = computeTemporalStatus(startDate, endDate);
      const trip = await Trip.create({
        userId: req.user._id,
        name,
        startDate,
        endDate,
        startTime,
        endTime,
        description,
        coverPhoto,
        visibility: visibility || 'private',
        budget: budget ? parseFloat(budget) : undefined,
        plannedBudget: plannedBudget ? parseFloat(plannedBudget) : undefined,
        participants: participants ? parseInt(participants) : undefined,
        suggestions: Array.isArray(suggestions) ? suggestions : (typeof suggestions === 'string' ? JSON.parse(suggestions) : undefined),
        sections: Array.isArray(sections) ? sections.map(s => ({
          id: s.id,
          title: s.title,
          description: s.description,
          dateRange: s.dateRange,
          budget: s.budget || 0,
          allDay: !!s.allDay,
          startTime: s.startTime || undefined,
          endTime: s.endTime || undefined,
        })) : undefined
      });

      res.status(201).json(trip);
    } catch (e) {
      console.error('Create trip error:', e);
      res.status(500).json({ error: 'Server error' });
    }
  });
};

exports.getTrips = async (req, res) => {
  try {
    // Only return trips where user is the owner
    const trips = await Trip.find({ userId: req.user._id }).sort({ startDate: 1 });
    res.json(trips);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getTrip = async (req, res) => {
  try {
    const ownerId = req.user?._id;
    const orConds = [{ visibility: 'public' }];
    if (ownerId) orConds.unshift({ userId: ownerId });

    const trip = await Trip.findOne({ 
      _id: req.params.tripId,
      $or: orConds
    });
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    res.json(trip);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Placeholder Trip model access; replace with your actual model import:
// const Trip = require('../models/Trip');
let inMemoryTrips = []; // fallback if no DB layer wired

exports.updateTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};

    if (!id) return res.status(400).json({ error: "Trip id required" });

    // DB path (uncomment when model exists)
    // let trip = await Trip.findById(id);
    // if (!trip) return res.status(404).json({ error: "Trip not found" });
    // Object.assign(trip, payload, { updatedAt: new Date() });
    // await trip.save();
    // return res.json({ success: true, trip });

    // In-memory fallback
    const idx = inMemoryTrips.findIndex(t => String(t.id) === String(id));
    if (idx === -1) {
      // create if not found (idempotent upsert behavior)
      inMemoryTrips.push({ ...payload, id, createdAt: new Date(), updatedAt: new Date() });
      return res.json({ success: true, trip: inMemoryTrips[inMemoryTrips.length - 1], created: true });
    }
    inMemoryTrips[idx] = { ...inMemoryTrips[idx], ...payload, id, updatedAt: new Date() };
    return res.json({ success: true, trip: inMemoryTrips[idx] });
  } catch (e) {
    console.error("Trip update failed:", e);
    res.status(500).json({ error: "Trip update failed: " + e.message });
  }
};

exports.deleteTrip = async (req, res) => {
  const { tripId } = req.params;

  // Validate tripId
  if (!mongoose.isValidObjectId(tripId)) {
    return res.status(400).json({ error: 'Invalid tripId' });
  }

  try {
    const trip = await Trip.findOneAndDelete({ _id: tripId, userId: req.user._id });
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    let imageDeleted = false;
    if (typeof trip.coverPhoto === 'string' && trip.coverPhoto.startsWith('http')) {
      try {
        await deleteImageByUrl(trip.coverPhoto);
        imageDeleted = true;
      } catch (e) {
        console.warn('Cover photo deletion failed:', e.message);
      }
    }

    res.json({ message: 'Trip deleted', imageDeleted });
  } catch (err) {
    console.error('Delete trip error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};


/**
 * Delete an image using only its URL (expects { url } in body).
 */
exports.deleteTripImageByUrl = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'url is required' });
    const result = await deleteImageByUrl(url);
    res.json({ message: 'Image deleted', ...result });
  } catch (err) {
    console.error('Delete image by URL error:', err.message);
    res.status(500).json({ error: 'Image delete by URL failed' });
  }
};

// New endpoint to get public trips
exports.getPublicTrips = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const filter = { visibility: 'public' };
    if (status && ['planning', 'active', 'completed', 'cancelled'].includes(status)) {
      filter.status = status;
    }

    const trips = await Trip.find(filter)
      .populate('userId', 'name', null, { strictPopulate: false }) // Allow null userId
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Trip.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      trips: trips.map(trip => ({
        ...trip.toObject(),
        // Mark trips without userId as anonymous
        isAnonymous: !trip.userId,
        userName: trip.userId ? trip.userId.name : 'Anonymous User'
      })),
      pagination: {
        currentPage: pageNum,
        totalPages,
        total,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    });
  } catch (err) {
    console.error('Get public trips error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// Fix budget statistics to use plannedBudget field
exports.getBudgetStats = async (req, res) => {
  try {
    const stats = await Trip.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user._id), plannedBudget: { $exists: true, $ne: null, $gt: 0 } } },
      {
        $group: {
          _id: null,
          totalTrips: { $sum: 1 },
          totalBudget: { $sum: '$plannedBudget' },
          avgBudget: { $avg: '$plannedBudget' },
          minBudget: { $min: '$plannedBudget' },
          maxBudget: { $max: '$plannedBudget' }
        }
      }
    ]);

    const result = stats.length > 0 ? stats[0] : {
      totalTrips: 0,
      totalBudget: 0,
      avgBudget: 0,
      minBudget: 0,
      maxBudget: 0
    };

    // Remove the _id field
    delete result._id;

    res.json(result);
  } catch (err) {
    console.error('Get budget stats error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// Fix getTripsByBudget to use plannedBudget field
exports.getTripsByBudget = async (req, res) => {
  try {
    const { minBudget, maxBudget } = req.query;
    const filter = { userId: req.user._id };

    if (minBudget !== undefined || maxBudget !== undefined) {
      filter.plannedBudget = {};
      if (minBudget !== undefined) {
        const min = parseFloat(minBudget);
        if (isNaN(min) || min < 0) {
          return res.status(400).json({ error: 'minBudget must be a positive number' });
        }
        filter.plannedBudget.$gte = min;
      }
      if (maxBudget !== undefined) {
        const max = parseFloat(maxBudget);
        if (isNaN(max) || max < 0) {
          return res.status(400).json({ error: 'maxBudget must be a positive number' });
        }
        filter.plannedBudget.$lte = max;
      }
    }

    const trips = await Trip.find(filter).sort({ startDate: 1 });
    res.json(trips);
  } catch (err) {
    console.error('Get trips by budget error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// Add new endpoint to get trip with its stops
exports.getTripWithStops = async (req, res) => {
  try {
    const { tripId } = req.params;
    const ownerId = req.user?._id;
    const orConds = [{ visibility: 'public' }];
    if (ownerId) orConds.unshift({ userId: ownerId });

    const trip = await Trip.findOne({ _id: tripId, $or: orConds });
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    const { Stop } = require('../../models');
    const stops = await Stop.find({ tripId }).sort({ startDate: 1 });

    res.json({ trip, stops });
  } catch (err) {
    console.error('Get trip with stops error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// ===== Missing public trip handlers added so routes don't receive undefined =====

// Get a single public trip (no auth required)
exports.getPublicTripById = async (req, res) => {
  try {
    const { tripId } = req.params;
    if (!mongoose.isValidObjectId(tripId)) {
      return res.status(400).json({ error: 'Invalid tripId' });
    }
    const trip = await Trip.findOne({ _id: tripId, visibility: 'public' });
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    res.json(trip);
  } catch (err) {
    console.error('Get public trip error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get a single public trip with its stops
exports.getPublicTripWithStops = async (req, res) => {
  try {
    const { tripId } = req.params;
    if (!mongoose.isValidObjectId(tripId)) {
      return res.status(400).json({ error: 'Invalid tripId' });
    }
    const trip = await Trip.findOne({ _id: tripId, visibility: 'public' });
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    const { Stop } = require('../../models');
    const stops = await Stop.find({ tripId }).sort({ startDate: 1 });
    res.json({ trip, stops });
  } catch (err) {
    console.error('Get public trip with stops error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};