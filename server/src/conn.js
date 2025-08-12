const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/globetrotter';
    if (!process.env.MONGO_URI) {
      console.warn('MONGO_URI not set. Using fallback local Mongo URI:', uri);
    }
    const conn = await mongoose.connect(uri, {
      // Add a few safe defaults
      autoIndex: true,
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database Name: ${conn.connection.name}`);
    
    // Handle connection events
    mongoose.connection.on('connected', () => {
      console.log('Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('Mongoose disconnected from MongoDB');
    });

    // Handle process termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('Mongoose connection closed due to application termination');
      process.exit(0);
    });

    return conn;
    
  } catch (error) {
    console.error('Error connecting to MongoDB (startup will continue, operations may fail until DB available):', error.message);
  }
};

module.exports = {
  connectDB,
  connection: mongoose.connection
};
