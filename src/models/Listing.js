const mongoose = require('mongoose');

const LayoutSchema = new mongoose.Schema({
  desc: String,
  type: String,
  sqft: String,
  units: Number
}, { _id: false });

const TransactionSchema = new mongoose.Schema({
  date: String,      // e.g. "Aug 2026"
  unit: String,      // e.g. "#20-03"
  beds: String,      // e.g. "3 Beds"
  sizeSqft: Number,  // e.g. 1238
  price: Number,     // e.g. 3000000
  psf: Number        // e.g. 2423
}, { _id: false });

const ListingSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true }, // acts as the unique id
  title: { type: String, required: true },
  url: String,
  address: String,
  district: String,
  propertyType: String,
  beds: String,
  baths: Number,
  floorAreaSqft: String,
  price: Number,
  psf: Number,
  topYear: String,
  unitsSoldPercent: Number,
  tenure: String,
  totalUnits: Number,
  developer: String,
  image: String, // cover image URL
  images: [String], // gallery image URLs
  layouts: [LayoutSchema],
  facilities: [String],
  history: [TransactionSchema], // Sales/Resale transaction history
  status: { type: String, default: 'active' }, // 'active', 'delisted'
  disabled: { type: Boolean, default: false },
  featured: { type: Boolean, default: false },
  custom: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Configure JSON output to include virtual 'id' mapping to 'slug'
ListingSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret.slug;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Listing', ListingSchema);
