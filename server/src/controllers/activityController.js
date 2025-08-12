const { Activity } = require('../../models');

exports.createActivity = async (req, res) => {
  try {
    const { stopId, name, type, cost, duration, startTime, endTime, description, visibility } = req.body;
    
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
    
    const activity = await Activity.create({ 
      stopId, 
      name, 
      type, 
      cost, 
      duration, 
      startTime, 
      endTime, 
      description, 
      visibility: visibility || 'private',
      userId: req.user._id // Track who created this activity
    });
    res.status(201).json(activity);
  } catch (err) {
    console.error('Create activity error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getActivitiesForStop = async (req, res) => {
  try {
    const { stopId } = req.params;
    const activities = await Activity.find({ stopId }).sort({ createdAt: -1 });
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateActivity = async (req, res) => {
  try {
    const updateData = { ...req.body };
    
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
    
    const activity = await Activity.findByIdAndUpdate(req.params.activityId, updateData, { new: true, runValidators: true });
    if (!activity) return res.status(404).json({ error: 'Activity not found' });
    res.json(activity);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteActivity = async (req, res) => {
  try {
    const activity = await Activity.findByIdAndDelete(req.params.activityId);
    if (!activity) return res.status(404).json({ error: 'Activity not found' });
    res.json({ message: 'Activity deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
