require('dotenv').config({ override: true });
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

const config = require('./config');
const Listing = require('./models/Listing');

const app = express();
app.use(cors());
app.use(express.json());

// Load configurations
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'she-real-estate-secret-key-12345';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/listings-db';

// Generate a hashed password if needed (for comparisons)
const ADMIN_PASSWORD_HASH = bcrypt.hashSync(ADMIN_PASSWORD, 10);

// Connect to MongoDB Database
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB database ✓');
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err);
  });

// Configure Cloudinary
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log('Cloudinary configuration loaded ✓');
} else {
  console.warn('WARNING: Cloudinary configuration variables are missing. Direct file upload will fail.');
}

// Multer in-memory storage setup
const upload = multer({ storage: multer.memoryStorage() });

// Helper to verify JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// Optional Auth (doesn't fail if no token, just populates req.user)
function optionalAuthenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      // Just ignore token if invalid and proceed as guest
      return next();
    }
    req.user = user;
    next();
  });
}

// Helper to generate a URL-friendly slug/id
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')       // Replace spaces with -
    .replace(/[^\w\-]+/g, '')   // Remove all non-word chars
    .replace(/\-\-+/g, '-');    // Replace multiple - with single -
}

// Auth: Login Endpoint
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  if (username !== ADMIN_USERNAME) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const isMatch = password === ADMIN_PASSWORD || bcrypt.compareSync(password, ADMIN_PASSWORD_HASH);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, user: { username } });
});

// Auth: Verify Session Endpoint
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ username: req.user.username });
});

// GET Listings (supports optional auth to see disabled items)
app.get('/api/listings', optionalAuthenticateToken, async (req, res) => {
  try {
    let query = {};
    // If not authenticated admin, only return active and non-disabled listings
    if (!req.user) {
      query = { disabled: { $ne: true }, status: { $ne: 'delisted' } };
    }
    const listings = await Listing.find(query).sort({ updatedAt: -1 });
    res.json(listings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch listings data' });
  }
});

// POST: Create custom listing (Auth required)
app.post('/api/listings', authenticateToken, async (req, res) => {
  try {
    const record = req.body;
    if (!record.title) {
      return res.status(400).json({ error: 'Property title is required' });
    }

    const slug = record.id || slugify(record.title);
    const existing = await Listing.findOne({ slug });
    if (existing) {
      return res.status(400).json({ error: `A property with ID/slug "${slug}" already exists.` });
    }

    let bedsValue = record.beds;
    if (bedsValue === null || bedsValue === undefined) {
      bedsValue = '';
    } else {
      bedsValue = String(bedsValue);
    }

    const newListing = new Listing({
      slug,
      title: record.title,
      address: record.address || 'Singapore',
      district: record.district || 'D11',
      propertyType: record.propertyType || 'Condo',
      beds: bedsValue,
      baths: record.baths || null,
      floorAreaSqft: record.floorAreaSqft || '',
      price: record.price ? Number(record.price) : null,
      psf: record.psf ? Number(record.psf) : null,
      topYear: record.topYear || '',
      unitsSoldPercent: record.unitsSoldPercent !== undefined ? Number(record.unitsSoldPercent) : null,
      tenure: record.tenure || '99 years',
      totalUnits: record.totalUnits ? Number(record.totalUnits) : null,
      developer: record.developer || 'Independent Developer',
      image: record.image || '',
      images: Array.isArray(record.images) ? record.images : [],
      layouts: Array.isArray(record.layouts) ? record.layouts : [],
      facilities: Array.isArray(record.facilities) ? record.facilities : [],
      history: Array.isArray(record.history) ? record.history : [],
      disabled: record.disabled || false,
      featured: record.featured || false,
      custom: true
    });

    const saved = await newListing.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: `Failed to create listing: ${err.message}` });
  }
});

// PUT: Update a listing (Auth required)
app.put('/api/listings/:id', authenticateToken, async (req, res) => {
  try {
    const slug = req.params.id;
    const updateFields = req.body;
    const listing = await Listing.findOne({ slug });

    if (!listing) {
      return res.status(404).json({ error: `Listing with ID "${slug}" not found.` });
    }

    const cleanUpdate = { ...updateFields };
    delete cleanUpdate.id;
    delete cleanUpdate.slug;
    delete cleanUpdate.custom;

    Object.assign(listing, cleanUpdate);
    if (updateFields.disabled !== undefined) listing.disabled = !!updateFields.disabled;
    if (updateFields.featured !== undefined) listing.featured = !!updateFields.featured;
    if (updateFields.status !== undefined) listing.status = updateFields.status;

    const saved = await listing.save();
    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: `Failed to update listing: ${err.message}` });
  }
});

// DELETE: Delete a listing (Auth required)
app.delete('/api/listings/:id', authenticateToken, async (req, res) => {
  try {
    const slug = req.params.id;
    const result = await Listing.deleteOne({ slug });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: `Listing with ID "${slug}" not found.` });
    }
    res.json({ success: true, message: `Listing ${slug} deleted successfully.` });
  } catch (err) {
    res.status(500).json({ error: `Failed to delete listing: ${err.message}` });
  }
});

// POST: Upload file to Cloudinary (Auth required)
app.post('/api/upload', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      return res.status(500).json({ error: 'Cloudinary configuration is missing on the server.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    // Convert file buffer to base64 format for Cloudinary upload
    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const result = await cloudinary.uploader.upload(base64Image, {
      folder: 'properties',
    });

    res.json({ url: result.secure_url });
  } catch (err) {
    console.error('Cloudinary upload error:', err);
    res.status(500).json({ error: `Failed to upload image to Cloudinary: ${err.message}` });
  }
});

// Serve frontend build static files in production
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('API Server Running. Please start frontend dev server or build frontend to serve UI.');
  });
}

app.listen(PORT, () => {
  console.log(`Backend API Server running at http://localhost:${PORT}`);
});
