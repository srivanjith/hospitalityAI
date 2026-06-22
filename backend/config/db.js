const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  console.warn('⚠️ Could not set custom DNS servers:', e.message);
}

const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const DB_DIR = path.join(__dirname, '..', 'data', 'db');
let useMongoDB = false;
let mongoClient;
let dbInstance;

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// JSON Database Helper (Fallback)
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
      let val = query[key];
      let itemVal = item[key];
      
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

// Helper to check if a string is a valid ObjectId
function toObjectId(id) {
  if (!id) return id;
  if (id instanceof ObjectId) return id;
  if (typeof id === 'string' && id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id)) {
    try {
      return new ObjectId(id);
    } catch (e) {
      return id;
    }
  }
  return id;
}

// Convert Mongoose/generic queries to MongoDB-compatible formats (casting id to _id and string ID to ObjectId)
function normalizeQuery(query) {
  if (!query) return {};
  const normalized = {};
  for (const key in query) {
    let val = query[key];
    let targetKey = key;
    if (key === 'id') {
      targetKey = '_id';
    }
    
    if (targetKey === '_id') {
      if (typeof val === 'string') {
        val = toObjectId(val);
      } else if (val && typeof val === 'object' && !Array.isArray(val)) {
        const normalizedVal = {};
        for (const op in val) {
          if (op === '$in' && Array.isArray(val[op])) {
            normalizedVal[op] = val[op].map(v => typeof v === 'string' ? toObjectId(v) : v);
          } else if (op === '$ne') {
            normalizedVal[op] = typeof val[op] === 'string' ? toObjectId(val[op]) : val[op];
          } else {
            normalizedVal[op] = val[op];
          }
        }
        val = normalizedVal;
      }
    }
    normalized[targetKey] = val;
  }
  return normalized;
}

// Format document output to ensure it matches mongo layout (having both id and _id as strings)
function formatDoc(doc) {
  if (!doc) return null;
  const formatted = { ...doc };
  if (formatted._id) {
    const idStr = formatted._id.toString();
    formatted._id = idStr;
    formatted.id = idStr;
  }
  return formatted;
}

let connectionPromise = null;

const connectDB = async () => {
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hospitalityAI';
    
    if (!process.env.MONGO_URI) {
      console.log('⚠️ MONGO_URI not found in env. Attempting connection to local default mongodb...');
    }

    try {
      mongoClient = new MongoClient(mongoUri, {
        serverSelectionTimeoutMS: 3000
      });
      await mongoClient.connect();
      
      let dbName = 'hospitalityAI';
      const match = mongoUri.match(/\/([a-zA-Z0-9_-]+)(?:\?.*)?$/);
      if (match && match[1]) {
        dbName = match[1];
      }
      
      dbInstance = mongoClient.db(dbName);
      console.log(`✅ MongoDB Connected successfully to database: "${dbName}"`);
      useMongoDB = true;
    } catch (err) {
      console.log(`⚠️ MongoDB connection failed: ${err.message}. Falling back to local JSON database.`);
      useMongoDB = false;
    }
  })();

  return connectionPromise;
};

const disconnectDB = async () => {
  if (useMongoDB && mongoClient) {
    await mongoClient.close();
    console.log('🔌 Closed MongoDB connection.');
    useMongoDB = false;
    connectionPromise = null;
    dbInstance = null;
  }
};

// Universal Repository Wrapper
const db = {
  isFallback: () => !useMongoDB,
  collection(name) {
    return {
      async find(query = {}) {
        if (useMongoDB) {
          const normalized = normalizeQuery(query);
          const results = await dbInstance.collection(name).find(normalized).toArray();
          return results.map(doc => formatDoc(doc));
        } else {
          const items = jsonDb.read(name);
          return items.filter(item => jsonDb.match(item, query));
        }
      },

      async findOne(query = {}) {
        if (useMongoDB) {
          const normalized = normalizeQuery(query);
          const doc = await dbInstance.collection(name).findOne(normalized);
          return formatDoc(doc);
        } else {
          const items = jsonDb.read(name);
          const found = items.find(item => jsonDb.match(item, query));
          return found || null;
        }
      },

      async findById(id) {
        if (useMongoDB) {
          const doc = await dbInstance.collection(name).findOne({ _id: toObjectId(id) });
          return formatDoc(doc);
        } else {
          const items = jsonDb.read(name);
          const found = items.find(item => item._id === id || item.id === id);
          return found || null;
        }
      },

      async create(doc) {
        if (useMongoDB) {
          const payload = { ...doc };
          if (payload.id && !payload._id) {
            payload._id = toObjectId(payload.id);
            delete payload.id;
          } else if (payload._id) {
            payload._id = toObjectId(payload._id);
          }
          if (!payload.createdAt) payload.createdAt = new Date().toISOString();
          if (!payload.updatedAt) payload.updatedAt = new Date().toISOString();
          
          const result = await dbInstance.collection(name).insertOne(payload);
          const created = await dbInstance.collection(name).findOne({ _id: result.insertedId });
          return formatDoc(created);
        } else {
          const items = jsonDb.read(name);
          const newId = Math.random().toString(36).substring(2, 11);
          const newDoc = {
            ...doc,
            _id: newId,
            id: newId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          items.push(newDoc);
          jsonDb.write(name, items);
          return newDoc;
        }
      },

      async insertMany(docs) {
        if (useMongoDB) {
          if (!docs || docs.length === 0) return [];
          const payloads = docs.map(doc => {
            const payload = { ...doc };
            if (payload.id && !payload._id) {
              payload._id = toObjectId(payload.id);
              delete payload.id;
            } else if (payload._id) {
              payload._id = toObjectId(payload._id);
            }
            if (!payload.createdAt) payload.createdAt = new Date().toISOString();
            if (!payload.updatedAt) payload.updatedAt = new Date().toISOString();
            return payload;
          });
          const result = await dbInstance.collection(name).insertMany(payloads);
          const insertedIds = Object.values(result.insertedIds);
          const created = await dbInstance.collection(name).find({ _id: { $in: insertedIds } }).toArray();
          return created.map(doc => formatDoc(doc));
        } else {
          const items = jsonDb.read(name);
          const newDocs = docs.map(doc => {
            const newId = Math.random().toString(36).substring(2, 11);
            return {
              ...doc,
              _id: newId,
              id: newId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
          });
          items.push(...newDocs);
          jsonDb.write(name, items);
          return newDocs;
        }
      },

      async updateOne(query, update) {
        if (useMongoDB) {
          const normalized = normalizeQuery(query);
          const updatePayload = (update.$set || update.$unset || update.$push || update.$pull || update.$inc) ? update : { $set: update };
          if (updatePayload.$set) {
            updatePayload.$set.updatedAt = new Date().toISOString();
          } else {
            updatePayload.$set = { updatedAt: new Date().toISOString() };
          }
          const result = await dbInstance.collection(name).updateOne(normalized, updatePayload);
          return { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount };
        } else {
          const items = jsonDb.read(name);
          const idx = items.findIndex(item => jsonDb.match(item, query));
          if (idx !== -1) {
            const current = items[idx];
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
        if (useMongoDB) {
          const normalized = normalizeQuery(query);
          const updatePayload = (update.$set || update.$unset || update.$push || update.$pull || update.$inc) ? update : { $set: update };
          if (updatePayload.$set) {
            updatePayload.$set.updatedAt = new Date().toISOString();
          } else {
            updatePayload.$set = { updatedAt: new Date().toISOString() };
          }
          const result = await dbInstance.collection(name).updateMany(normalized, updatePayload);
          return { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount };
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
        if (useMongoDB) {
          const normalizedQuery = { _id: toObjectId(id) };
          const updatePayload = (update.$set || update.$unset || update.$push || update.$pull || update.$inc) ? update : { $set: update };
          if (updatePayload.$set) {
            updatePayload.$set.updatedAt = new Date().toISOString();
          } else {
            updatePayload.$set = { updatedAt: new Date().toISOString() };
          }
          const result = await dbInstance.collection(name).findOneAndUpdate(
            normalizedQuery,
            updatePayload,
            { returnDocument: 'after' }
          );
          let doc = result;
          if (result && typeof result === 'object' && 'value' in result) {
            doc = result.value;
          }
          return formatDoc(doc);
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
        if (useMongoDB) {
          const normalized = normalizeQuery(query);
          const result = await dbInstance.collection(name).deleteOne(normalized);
          return { deletedCount: result.deletedCount };
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
        if (useMongoDB) {
          const normalized = normalizeQuery(query);
          const result = await dbInstance.collection(name).deleteMany(normalized);
          return { deletedCount: result.deletedCount };
        } else {
          const items = jsonDb.read(name);
          const initialCount = items.length;
          const filtered = items.filter(item => !jsonDb.match(item, query));
          jsonDb.write(name, filtered);
          return { deletedCount: initialCount - filtered.length };
        }
      },

      async countDocuments(query = {}) {
        if (useMongoDB) {
          const normalized = normalizeQuery(query);
          return await dbInstance.collection(name).countDocuments(normalized);
        } else {
          const items = jsonDb.read(name);
          return items.filter(item => jsonDb.match(item, query)).length;
        }
      }
    };
  }
};

module.exports = { connectDB, disconnectDB, db };
