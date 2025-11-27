// Script to fix duplicate key error by dropping old 'user' index
require('dotenv').config();
const mongoose = require('mongoose');

async function fixPatientIndex() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('patients');

    // Get all indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes);

    // Drop the problematic 'user_1' index if it exists
    try {
      await collection.dropIndex('user_1');
      console.log('✅ Dropped old user_1 index');
    } catch (err) {
      if (err.code === 27) {
        console.log('Index user_1 does not exist (already removed)');
      } else {
        throw err;
      }
    }

    // Verify remaining indexes
    const remainingIndexes = await collection.indexes();
    console.log('Remaining indexes:', remainingIndexes);

    console.log('✅ Index fix complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing index:', error);
    process.exit(1);
  }
}

fixPatientIndex();
