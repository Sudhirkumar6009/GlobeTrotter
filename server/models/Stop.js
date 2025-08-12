const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema({
  tripId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    required: [true, 'Trip ID is required']
    // Removed: index: true (will be part of compound index)
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
    // Removed: index: true (not frequently queried alone)
  },
  city: {
    type: String,
    required: [true, 'City name is required'],
    trim: true,
    maxlength: [100, 'City name cannot exceed 100 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
    maxlength: [50, 'Category cannot exceed 50 characters'],
    enum: {
      values: ['accommodation', 'transport', 'sightseeing', 'dining', 'shopping', 'entertainment', 'other'],
      message: 'Category must be one of: accommodation, transport, sightseeing, dining, shopping, entertainment, other'
    },
    default: 'other'
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function(endDate) {
        return endDate >= this.startDate;
      },
      message: 'End date must be after or equal to start date'
    }
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
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    }
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
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
stopSchema.index({ tripId: 1, startDate: 1 }); // Most common query pattern
stopSchema.index({ location: '2dsphere' }); // For geospatial queries
stopSchema.index({ category: 1, visibility: 1 }); // Combined for category filtering
stopSchema.index({ userId: 1 }); // For user-specific queries when needed

const Stop = mongoose.model('Stop', stopSchema);

module.exports = Stop;
