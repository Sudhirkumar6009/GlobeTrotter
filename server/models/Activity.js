const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  stopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stop',
    required: [true, 'Stop ID is required']
    // Removed: index: true (will be part of compound index)
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
    // Removed: index: true (will be indexed separately if needed)
  },
  name: {
    type: String,
    required: [true, 'Activity name is required'],
    trim: true,
    maxlength: [200, 'Activity name cannot exceed 200 characters']
  },
  type: {
    type: String,
    required: [true, 'Activity type is required'],
    enum: {
      values: ['sightseeing', 'food', 'adventure', 'other'],
      message: 'Activity type must be one of: sightseeing, food, adventure, other'
    }
  },
  cost: {
    type: Number,
    required: [true, 'Cost is required'],
    min: [0, 'Cost cannot be negative'],
    validate: {
      validator: function(value) {
        return Number.isFinite(value);
      },
      message: 'Cost must be a valid number'
    }
  },
  duration: {
    type: Number, // Duration in minutes
    required: [true, 'Duration is required'],
    min: [1, 'Duration must be at least 1 minute'],
    validate: {
      validator: function(value) {
        return Number.isInteger(value);
      },
      message: 'Duration must be an integer (in minutes)'
    }
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  scheduledTime: {
    type: Date
  },
  startTime: {
    type: String, // Format: "HH:MM" (24-hour format)
    validate: {
      validator: function(value) {
        if (!value) return true; // Optional field
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value);
      },
      message: 'Start time must be in HH:MM format (24-hour)'
    }
  },
  endTime: {
    type: String, // Format: "HH:MM" (24-hour format)
    validate: {
      validator: function(value) {
        if (!value) return true; // Optional field
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value);
      },
      message: 'End time must be in HH:MM format (24-hour)'
    }
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  completed: {
    type: Boolean,
    default: false
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  photos: [{
    type: String,
    trim: true
  }],
  visibility: {
    type: String,
    enum: ['public', 'private'],
    default: 'private'
  }
}, {
  timestamps: true,
  versionKey: false
});

// Indexes for better query performance - optimized compound indexes
activitySchema.index({ stopId: 1, scheduledTime: 1 }); // Most common query pattern
activitySchema.index({ type: 1, completed: 1 }); // For filtering by type and completion
activitySchema.index({ userId: 1, visibility: 1 }); // For user-specific queries
activitySchema.index({ visibility: 1 }); // For public activity queries

const Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity;
module.exports = Activity;
