const mongoose = require('mongoose');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: validator.isEmail,
      message: 'Please provide a valid email address'
    }
  },
  passwordHash: {
    type: String,
    required: [true, 'Password hash is required']
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
    trim: true,
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
  },
  profilePicture: {
    type: String,
    trim: true
  },
  preferences: {
    budget: {
      type: String,
      enum: ['low', 'moderate', 'luxury'],
      default: 'moderate'
    },
    travelStyle: {
      type: String,
      enum: ['adventure', 'relaxation', 'cultural', 'business', 'family'],
      default: 'cultural'
    },
    preferredActivities: [{
      type: String,
      enum: ['sightseeing', 'food', 'adventure', 'other']
    }],
  }
}, {
  timestamps: true,
  versionKey: false
});

const User = mongoose.model('User', userSchema);

module.exports = User;
