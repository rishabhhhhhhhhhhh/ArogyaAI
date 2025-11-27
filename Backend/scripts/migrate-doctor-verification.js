// scripts/migrate-doctor-verification.js
// Migration script to add verification fields to existing doctors

require('dotenv').config();
const mongoose = require('mongoose');
const Doctor = require('../models/Doctor');

async function migrateVerificationFields() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Update all existing doctors
    const result = await Doctor.updateMany(
      {},
      {
        $set: {
          verificationStatus: function() {
            // If already verified, set to 'verified'
            if (this.verified === true) {
              return 'verified';
            }
            // Otherwise set to 'pending'
            return 'pending';
          }
        }
      }
    );

    // For verified doctors, set verificationCompletedAt
    await Doctor.updateMany(
      { verified: true, verificationCompletedAt: { $exists: false } },
      { $set: { verificationCompletedAt: new Date() } }
    );

    console.log(`Migration completed. Updated ${result.modifiedCount} doctors.`);
    
    // Show summary
    const pending = await Doctor.countDocuments({ verificationStatus: 'pending' });
    const verified = await Doctor.countDocuments({ verificationStatus: 'verified' });
    const submitted = await Doctor.countDocuments({ verificationStatus: 'submitted' });
    
    console.log('\nVerification Status Summary:');
    console.log(`- Pending: ${pending}`);
    console.log(`- Submitted: ${submitted}`);
    console.log(`- Verified: ${verified}`);

    await mongoose.connection.close();
    console.log('\nMigration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateVerificationFields();
