const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  name: {
    type: String,
    required: [true, 'Trip name is required'],
    trim: true,
    maxlength: [200, 'Trip name cannot exceed 200 characters']
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
      message: 'End date must be after start date'
    }
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
  },
  coverPhoto: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['planning', 'active', 'completed', 'cancelled'],
    default: 'planning',
  },
  participants: {
    type: Number,
    default: 1,
    min: 1,
  },
  suggestions: {
    type: [String],
    default: [],
  },
  sections: {
    type: [
      new mongoose.Schema(
        {
          id: Number,
          title: String,
          description: String,
          dateRange: String,
          budget: { type: Number, default: 0 },
          startDate: { type: Date },
          endDate: {
            type: Date,
            validate: {
              validator: function (endDate) {
                if (!endDate || !this.startDate) return true;
                return endDate >= this.startDate;
              },
              message: 'Section end date must be after or equal to start date'
            }
          },
          allDay: { type: Boolean, default: false },
          startTime: {
            type: String,
            validate: {
              validator: function (value) {
                if (!value) return true;
                return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value);
              },
              message: 'Section start time must be in HH:MM format (24-hour)'
            }
          },
          endTime: {
            type: String,
            validate: {
              validator: function (value) {
                if (!value) return true;
                return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value);
              },
              message: 'Section end time must be in HH:MM format (24-hour)'
            }
          },
        },
        { _id: false }
      ),
    ],
    default: [],
  },
  computedBudget: {
    type: Number,
    default: 0,
  },
  plannedBudget: {
    type: Number,
    default: 0,
    min: 0,
  },
  startTime: {
    type: String,
    validate: {
      validator: function(value) {
        if (!value) return true;
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value);
      },
      message: 'Start time must be in HH:MM format (24-hour)'
    }
  },
  endTime: {
    type: String,
    validate: {
      validator: function(value) {
        if (!value) return true;
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value);
      },
      message: 'End time must be in HH:MM format (24-hour)'
    }
  },
  budget: {
    type: Number,
    min: [0, 'Budget cannot be negative'],
    default: 0
  },
  visibility: {
    type: String,
    enum: ['public', 'private'],
    default: 'private',
    required: [true, 'Trip visibility is required']
  }
}, { timestamps: true });


// Indexes for better query performance
tripSchema.index({ userId: 1, startDate: -1 });
tripSchema.index({ visibility: 1 });
tripSchema.index({ visibility: 1, status: 1 }); // Compound index for public trips filtering

const Trip = mongoose.model('Trip', tripSchema);

module.exports = Trip;