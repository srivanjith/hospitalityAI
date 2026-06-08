const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const DB_DIR = path.join(__dirname, '..', 'data', 'db');
let useMongo = false;

// Ensure DB directory exists for JSON fallback
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// JSON Database Helper
const jsonDb = {
  getFilePath(collection) {
    return path.join(DB_DIR, `${collection}.json`);
  },
  
  read(collection) {
    const filePath = this.getFilePath(collection);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify([], null, 2));
      return [];
    }
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data || '[]');
    } catch (err) {
      console.error(`Error reading collection ${collection}:`, err);
      return [];
    }
  },

  write(collection, data) {
    const filePath = this.getFilePath(collection);
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error(`Error writing collection ${collection}:`, err);
    }
  },

  match(item, query) {
    if (!query) return true;
    for (const key in query) {
      // Basic query matching
      let val = query[key];
      let itemVal = item[key];
      
      // Handle MongoDB-like operator support
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        if ('$gte' in val && !(itemVal >= val.$gte)) return false;
        if ('$lte' in val && !(itemVal <= val.$lte)) return false;
        if ('$gt' in val && !(itemVal > val.$gt)) return false;
        if ('$lt' in val && !(itemVal < val.$lt)) return false;
        if ('$in' in val && !val.$in.includes(itemVal)) return false;
      } else {
        if (itemVal !== val) return false;
      }
    }
    return true;
  }
};

// Mongoose Schemas (used if MongoDB is active)
const Schemas = {
  users: new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'manager', 'guest'], default: 'manager' }
  }, { timestamps: true }),

  hotels: new mongoose.Schema({
    name: { type: String, required: true },
    location: { type: String, required: true },
    totalRooms: { type: Number, required: true }
  }, { timestamps: true }),

  bookings: new mongoose.Schema({
    hotelId: { type: String, required: true },
    guestName: { type: String, required: true },
    roomType: { type: String, required: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    guestsCount: { type: Number, required: true },
    status: { type: String, enum: ['booked', 'checked-in', 'checked-out', 'cancelled'], default: 'booked' },
    revenue: { type: Number, default: 0 }
  }, { timestamps: true }),

  occupancyHistory: new mongoose.Schema({
    date: { type: String, required: true }, // YYYY-MM-DD
    occupancyPercentage: { type: Number, required: true },
    guestCount: { type: Number, required: true },
    roomsOccupied: { type: Number, required: true },
    revenue: { type: Number, default: 0 }
  }, { timestamps: true }),

  employees: new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    department: { type: String, required: true }, // Front Desk, Housekeeping, Restaurant Services, Security, Maintenance
    shift: { type: String, required: true }, // Morning, Evening, Night
    salary: { type: Number, required: true },
    attendance: [{ date: String, status: String }], // status: present, absent, leave
    performance: { type: Number, default: 5.0 }, // Rating 1 to 5
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
  }, { timestamps: true }),

  recommendations: new mongoose.Schema({
    date: { type: String, required: true }, // YYYY-MM-DD
    predictedOccupancy: { type: Number, required: true },
    predictedGuests: { type: Number, required: true },
    recommendedStaff: {
      'Front Desk': Number,
      'Housekeeping': Number,
      'Restaurant Services': Number,
      'Security': Number,
      'Maintenance': Number
    },
    actualStaffScheduled: {
      'Front Desk': Number,
      'Housekeeping': Number,
      'Restaurant Services': Number,
      'Security': Number,
      'Maintenance': Number
    },
    optimized: { type: Boolean, default: false },
    insights: [String]
  }, { timestamps: true }),

  notifications: new mongoose.Schema({
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    date: { type: String, required: true },
    read: { type: Boolean, default: false }
  }, { timestamps: true }),

  staffReports: new mongoose.Schema({
    guestName: { type: String, required: true },
    roomNo: { type: String, required: true },
    staffName: { type: String, required: true },
    service: { type: String, required: true }
  }, { timestamps: true })
};

const Models = {};

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.log('⚠️ MONGO_URI not found in env. Falling back to local JSON database.');
    useMongo = false;
    return;
  }

  try {
    mongoose.set('strictQuery', false);
    // Connect with a 3 second timeout so it falls back quickly if MongoDB is offline
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 3000
    });
    console.log('✅ MongoDB Connected successfully!');
    useMongo = true;

    // Initialize Mongoose Models
    for (const key in Schemas) {
      Models[key] = mongoose.models[key] || mongoose.model(key, Schemas[key]);
    }
  } catch (err) {
    console.log(`⚠️ MongoDB connection failed: ${err.message}. Falling back to local JSON database.`);
    useMongo = false;
  }
};

// Universal Repository Wrapper
const db = {
  isFallback: () => !useMongo,
  collection(name) {
    return {
      async find(query = {}) {
        if (useMongo) {
          const mQuery = Models[name].find({});
          // Basic support for query constraints
          if (query) {
            for (const key in query) {
              const val = query[key];
              if (val && typeof val === 'object' && !Array.isArray(val)) {
                if ('$gte' in val) mQuery.where(key).gte(val.$gte);
                if ('$lte' in val) mQuery.where(key).lte(val.$lte);
                if ('$gt' in val) mQuery.where(key).gt(val.$gt);
                if ('$lt' in val) mQuery.where(key).lt(val.$lt);
                if ('$in' in val) mQuery.where(key).in(val.$in);
              } else {
                mQuery.where(key).equals(val);
              }
            }
          }
          const results = await mQuery.lean();
          return results.map(doc => ({ ...doc, id: doc._id.toString() }));
        } else {
          const items = jsonDb.read(name);
          return items.filter(item => jsonDb.match(item, query));
        }
      },

      async findOne(query = {}) {
        if (useMongo) {
          const doc = await Models[name].findOne(query).lean();
          return doc ? { ...doc, id: doc._id.toString() } : null;
        } else {
          const items = jsonDb.read(name);
          const found = items.find(item => jsonDb.match(item, query));
          return found || null;
        }
      },

      async findById(id) {
        if (useMongo) {
          const doc = await Models[name].findById(id).lean();
          return doc ? { ...doc, id: doc._id.toString() } : null;
        } else {
          const items = jsonDb.read(name);
          const found = items.find(item => item._id === id || item.id === id);
          return found || null;
        }
      },

      async create(doc) {
        if (useMongo) {
          const mDoc = new Models[name](doc);
          const saved = await mDoc.save();
          const lean = saved.toObject();
          return { ...lean, id: lean._id.toString() };
        } else {
          const items = jsonDb.read(name);
          const newDoc = {
            ...doc,
            _id: Math.random().toString(36).substring(2, 11),
            id: Math.random().toString(36).substring(2, 11),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          items.push(newDoc);
          jsonDb.write(name, items);
          return newDoc;
        }
      },

      async insertMany(docs) {
        if (useMongo) {
          const saved = await Models[name].insertMany(docs);
          return saved.map(s => {
            const lean = s.toObject();
            return { ...lean, id: lean._id.toString() };
          });
        } else {
          const items = jsonDb.read(name);
          const newDocs = docs.map(doc => ({
            ...doc,
            _id: Math.random().toString(36).substring(2, 11),
            id: Math.random().toString(36).substring(2, 11),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }));
          items.push(...newDocs);
          jsonDb.write(name, items);
          return newDocs;
        }
      },

      async updateOne(query, update) {
        if (useMongo) {
          const res = await Models[name].updateOne(query, update);
          return { matchedCount: res.matchedCount, modifiedCount: res.modifiedCount };
        } else {
          const items = jsonDb.read(name);
          const idx = items.findIndex(item => jsonDb.match(item, query));
          if (idx !== -1) {
            const current = items[idx];
            // Basic support for $set update operator
            let updated = { ...current };
            if (update.$set) {
              updated = { ...updated, ...update.$set };
            } else {
              updated = { ...updated, ...update };
            }
            updated.updatedAt = new Date().toISOString();
            items[idx] = updated;
            jsonDb.write(name, items);
            return { matchedCount: 1, modifiedCount: 1 };
          }
          return { matchedCount: 0, modifiedCount: 0 };
        }
      },

      async updateMany(query, update) {
        if (useMongo) {
          const res = await Models[name].updateMany(query, update);
          return { matchedCount: res.matchedCount, modifiedCount: res.modifiedCount };
        } else {
          const items = jsonDb.read(name);
          let modifiedCount = 0;
          const updatedItems = items.map(item => {
            if (jsonDb.match(item, query)) {
              let updated = { ...item };
              if (update.$set) {
                updated = { ...updated, ...update.$set };
              } else {
                updated = { ...updated, ...update };
              }
              updated.updatedAt = new Date().toISOString();
              modifiedCount++;
              return updated;
            }
            return item;
          });
          if (modifiedCount > 0) {
            jsonDb.write(name, updatedItems);
          }
          return { matchedCount: modifiedCount, modifiedCount };
        }
      },

      async findByIdAndUpdate(id, update, options = {}) {
        if (useMongo) {
          const doc = await Models[name].findByIdAndUpdate(id, update, { new: true }).lean();
          return doc ? { ...doc, id: doc._id.toString() } : null;
        } else {
          const items = jsonDb.read(name);
          const idx = items.findIndex(item => item._id === id || item.id === id);
          if (idx !== -1) {
            let updated = { ...items[idx] };
            if (update.$set) {
              updated = { ...updated, ...update.$set };
            } else {
              updated = { ...updated, ...update };
            }
            updated.updatedAt = new Date().toISOString();
            items[idx] = updated;
            jsonDb.write(name, items);
            return updated;
          }
          return null;
        }
      },

      async deleteOne(query) {
        if (useMongo) {
          const res = await Models[name].deleteOne(query);
          return { deletedCount: res.deletedCount };
        } else {
          const items = jsonDb.read(name);
          const idx = items.findIndex(item => jsonDb.match(item, query));
          if (idx !== -1) {
            items.splice(idx, 1);
            jsonDb.write(name, items);
            return { deletedCount: 1 };
          }
          return { deletedCount: 0 };
        }
      },

      async deleteMany(query = {}) {
        if (useMongo) {
          const res = await Models[name].deleteMany(query);
          return { deletedCount: res.deletedCount };
        } else {
          const items = jsonDb.read(name);
          const initialCount = items.length;
          const filtered = items.filter(item => !jsonDb.match(item, query));
          jsonDb.write(name, filtered);
          return { deletedCount: initialCount - filtered.length };
        }
      },

      async countDocuments(query = {}) {
        if (useMongo) {
          return await Models[name].countDocuments(query);
        } else {
          const items = jsonDb.read(name);
          return items.filter(item => jsonDb.match(item, query)).length;
        }
      }
    };
  }
};

module.exports = { connectDB, db };
