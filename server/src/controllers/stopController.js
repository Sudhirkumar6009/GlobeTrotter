const { Stop, Trip } = require('../../models');
const mongoose = require('mongoose');

exports.createStop = async (req, res) => {
  try {
    const { tripId, city, category, startDate, endDate, startTime, endTime, notes, visibility } = req.body;
    
    // Validate required fields
    if (!tripId || !city || !startDate || !endDate) {
      return res.status(400).json({ error: 'Trip ID, city, start date, and end date are required' });
    }

    // Validate tripId format
    if (!mongoose.isValidObjectId(tripId)) {
      return res.status(400).json({ error: 'Invalid trip ID format' });
    }

    // Check if trip exists and user has access to it
    const trip = await Trip.findOne({
      _id: tripId,
      $or: [
        { userId: req.user._id }, // User owns the trip
        { visibility: 'public' } // Public trip
      ]
    });
    
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found or access denied' });
    }

    // Validate date range
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    
    if (endDateObj < startDateObj) {
      return res.status(400).json({ error: 'End date must be after or equal to start date' });
    }

    // Validate time format if provided
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (startTime && !timeRegex.test(startTime)) {
      return res.status(400).json({ error: 'Start time must be in HH:MM format (24-hour)' });
    }
    if (endTime && !timeRegex.test(endTime)) {
      return res.status(400).json({ error: 'End time must be in HH:MM format (24-hour)' });
    }

    // Validate visibility if provided
    if (visibility && !['public', 'private'].includes(visibility)) {
      return res.status(400).json({ error: 'Visibility must be either "public" or "private"' });
    }

    // Validate category if provided
    const validCategories = ['accommodation', 'transport', 'sightseeing', 'dining', 'shopping', 'entertainment', 'other'];
    if (category && !validCategories.includes(category)) {
      return res.status(400).json({ 
        error: `Category must be one of: ${validCategories.join(', ')}` 
      });
    }

    // Create stop with proper data structure
    const stopData = {
      tripId: new mongoose.Types.ObjectId(tripId),
      userId: req.user._id,
      city: city.trim(),
      category: category || 'other',
      startDate: startDateObj,
      endDate: endDateObj,
      visibility: visibility || 'private'
    };

    // Add optional fields if provided
    if (startTime) stopData.startTime = startTime;
    if (endTime) stopData.endTime = endTime;
    if (notes) stopData.notes = notes.trim();
    
    const stop = await Stop.create(stopData);
    
    // Return the created stop with populated trip info if needed
    await stop.populate('tripId', 'name');
    
    res.status(201).json({
      success: true,
      message: 'Stop created successfully',
      stop
    });
    
  } catch (err) {
    console.error('Create stop error:', err);
    
    // Handle MongoDB validation errors
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ error: errors.join(', ') });
    }
    
    // Handle MongoDB duplicate key errors
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Stop with similar details already exists' });
    }
    
    res.status(500).json({ error: 'Failed to create stop' });
  }
};

exports.getStopsForTrip = async (req, res) => {
  try {
    const { tripId } = req.params;
    
    // Validate tripId format
    if (!mongoose.isValidObjectId(tripId)) {
      return res.status(400).json({ error: 'Invalid trip ID format' });
    }

    // Check if trip exists and user has access to it
    const trip = await Trip.findOne({
      _id: tripId,
      $or: [
        { userId: req.user._id }, // User owns the trip
        { visibility: 'public' } // Public trip
      ]
    });
    
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found or access denied' });
    }

    // Get stops for the trip
    const stops = await Stop.find({ tripId })
      .populate('tripId', 'name visibility')
      .sort({ startDate: 1, startTime: 1 });

    res.json({
      success: true,
      count: stops.length,
      stops
    });
    
  } catch (err) {
    console.error('Get stops for trip error:', err);
    res.status(500).json({ error: 'Failed to fetch stops' });
  }
};

exports.updateStop = async (req, res) => {
  try {
    const { stopId } = req.params;
    const updateData = { ...req.body };
    
    // Validate stopId format
    if (!mongoose.isValidObjectId(stopId)) {
      return res.status(400).json({ error: 'Invalid stop ID format' });
    }

    // Get existing stop to verify ownership/access
    const existingStop = await Stop.findById(stopId).populate('tripId');
    
    if (!existingStop) {
      return res.status(404).json({ error: 'Stop not found' });
    }

    // Check if user has access to modify this stop
    const trip = existingStop.tripId;
    if (!trip || (trip.userId && trip.userId.toString() !== req.user._id.toString())) {
      return res.status(403).json({ error: 'Access denied to modify this stop' });
    }

    // Validate date range if dates are being updated
    if (updateData.startDate || updateData.endDate) {
      const startDate = new Date(updateData.startDate || existingStop.startDate);
      const endDate = new Date(updateData.endDate || existingStop.endDate);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ error: 'Invalid date format' });
      }
      
      if (endDate < startDate) {
        return res.status(400).json({ error: 'End date must be after or equal to start date' });
      }
      
      updateData.startDate = startDate;
      updateData.endDate = endDate;
    }

    // Validate time format if provided
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (updateData.startTime && !timeRegex.test(updateData.startTime)) {
      return res.status(400).json({ error: 'Start time must be in HH:MM format (24-hour)' });
    }
    if (updateData.endTime && !timeRegex.test(updateData.endTime)) {
      return res.status(400).json({ error: 'End time must be in HH:MM format (24-hour)' });
    }

    // Validate visibility if provided
    if (updateData.visibility && !['public', 'private'].includes(updateData.visibility)) {
      return res.status(400).json({ error: 'Visibility must be either "public" or "private"' });
    }

    // Validate category if provided
    const validCategories = ['accommodation', 'transport', 'sightseeing', 'dining', 'shopping', 'entertainment', 'other'];
    if (updateData.category && !validCategories.includes(updateData.category)) {
      return res.status(400).json({ 
        error: `Category must be one of: ${validCategories.join(', ')}` 
      });
    }

    // Clean up text fields
    if (updateData.city) updateData.city = updateData.city.trim();
    if (updateData.notes) updateData.notes = updateData.notes.trim();

    // Update the stop
    const stop = await Stop.findByIdAndUpdate(
      stopId, 
      updateData, 
      { 
        new: true, 
        runValidators: true,
        context: 'query' // Enable validation for updates
      }
    ).populate('tripId', 'name');
    
    res.json({
      success: true,
      message: 'Stop updated successfully',
      stop
    });
    
  } catch (err) {
    console.error('Update stop error:', err);
    
    // Handle MongoDB validation errors
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ error: errors.join(', ') });
    }
    
    res.status(500).json({ error: 'Failed to update stop' });
  }
};

exports.deleteStop = async (req, res) => {
  try {
    const { stopId } = req.params;
    
    // Validate stopId format
    if (!mongoose.isValidObjectId(stopId)) {
      return res.status(400).json({ error: 'Invalid stop ID format' });
    }

    // Get existing stop to verify ownership/access
    const existingStop = await Stop.findById(stopId).populate('tripId');
    
    if (!existingStop) {
      return res.status(404).json({ error: 'Stop not found' });
    }

    // Check if user has access to delete this stop
    const trip = existingStop.tripId;
    if (!trip || (trip.userId && trip.userId.toString() !== req.user._id.toString())) {
      return res.status(403).json({ error: 'Access denied to delete this stop' });
    }

    // Delete all activities associated with this stop
    const { Activity } = require('../../models');
    const deletedActivities = await Activity.deleteMany({ stopId });
    
    // Delete the stop
    await Stop.findByIdAndDelete(stopId);
    
    res.json({
      success: true,
      message: 'Stop and associated activities deleted successfully',
      deletedActivitiesCount: deletedActivities.deletedCount
    });
    
  } catch (err) {
    console.error('Delete stop error:', err);
    res.status(500).json({ error: 'Failed to delete stop' });
  }
};

// Add new endpoint to get stops by category
exports.getStopsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { tripId } = req.query;

    // Validate category
    const validCategories = ['accommodation', 'transport', 'sightseeing', 'dining', 'shopping', 'entertainment', 'other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ 
        error: `Category must be one of: ${validCategories.join(', ')}` 
      });
    }

    const filter = { category };
    if (tripId) {
      filter.tripId = tripId;
    }

    const stops = await Stop.find(filter).sort({ startDate: 1 });
    res.json(stops);
  } catch (err) {
    console.error('Get stops by category error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// Add endpoint to get all available categories
exports.getStopCategories = async (req, res) => {
  try {
    const categories = ['accommodation', 'transport', 'sightseeing', 'dining', 'shopping', 'entertainment', 'other'];
    res.json({ categories });
  } catch (err) {
    console.error('Get stop categories error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};
