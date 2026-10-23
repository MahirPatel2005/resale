require('dotenv').config();
const mongoose = require('mongoose');
const ResaleListing = require('./models/ResaleListing');
const seedData = require('./data/seedResaleListings.json');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/listings-db';

async function migrate() {
  console.log(`Connecting to MongoDB at ${MONGODB_URI}...`);
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB ✓');

  const db = mongoose.connection.db;

  // Check if old collection exists
  const collections = await db.listCollections({ name: 'listings' }).toArray();
  let migratedCount = 0;

  if (collections.length > 0) {
    const oldCollection = db.collection('listings');
    const oldResaleListings = await oldCollection.find({
      $or: [
        { custom: true },
        { url: { $regex: /propertyguru/i } }
      ]
    }).toArray();

    if (oldResaleListings.length > 0) {
      console.log(`Found ${oldResaleListings.length} resale listings in old 'listings' collection.`);
      for (const item of oldResaleListings) {
        const doc = { ...item };
        delete doc._id;
        await ResaleListing.findOneAndUpdate(
          { slug: doc.slug },
          { $set: doc },
          { upsert: true, new: true }
        );
        migratedCount++;
        console.log(`  ✓ Migrated: ${doc.title} (${doc.slug})`);
      }
    }
  }

  // If no resale listings were found in old collection, seed with default resale properties
  if (migratedCount === 0) {
    console.log('No existing resale listings found in old collection. Seeding initial resale listings from seed file...');
    for (const item of seedData) {
      await ResaleListing.findOneAndUpdate(
        { slug: item.slug },
        { $set: item },
        { upsert: true, new: true }
      );
      migratedCount++;
      console.log(`  ✓ Seeded: ${item.title} (${item.slug})`);
    }
  }

  const finalCount = await ResaleListing.countDocuments();
  console.log(`\nMigration complete! Total listings in 'resale_listings' collection: ${finalCount}`);
  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
