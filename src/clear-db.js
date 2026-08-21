require('dotenv').config();
const mongoose = require('mongoose');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/listings-db';

console.log(`Connecting to ${MONGODB_URI} to clear data...`);

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB ✓');
    await mongoose.connection.db.dropDatabase();
    console.log('Database cleared and dropped successfully! ✓');
    process.exit(0);
  })
  .catch(err => {
    console.error('Failed to clear database:', err);
    process.exit(1);
  });
