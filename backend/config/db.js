const { Sequelize, DataTypes, Op } = require('sequelize');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const DB_DIR = path.join(__dirname, '..', 'data', 'db');
let useMySQL = false;
let sequelize;

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

const Models = {};

// Helper to map MongoDB operators to Sequelize operators
function translateQuery(query) {
  if (!query) return {};
  const where = {};
  for (const key in query) {
    let targetKey = key;
    if (key === '_id') {
      targetKey = 'id';
    }
    const val = query[key];
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const fieldOperators = {};
      for (const op in val) {
        if (op === '$gte') fieldOperators[Op.gte] = val[op];
        else if (op === '$lte') fieldOperators[Op.lte] = val[op];
        else if (op === '$gt') fieldOperators[Op.gt] = val[op];
        else if (op === '$lt') fieldOperators[Op.lt] = val[op];
        else if (op === '$in') fieldOperators[Op.in] = val[op];
        else if (op === '$ne') fieldOperators[Op.ne] = val[op];
        else fieldOperators[op] = val[op];
      }
      where[targetKey] = fieldOperators;
    } else {
      where[targetKey] = val;
    }
  }
  return where;
}

// Helper to extract fields from Mongoose style updates
function translateUpdate(update) {
  if (!update) return {};
  if (update.$set) {
    return { ...update.$set };
  }
  return update;
}

// Format document output to ensure it matches mongo layout (having both id and _id)
function formatDoc(doc) {
  if (!doc) return null;
  const plain = typeof doc.toJSON === 'function' ? doc.toJSON() : doc;
  return {
    ...plain,
    id: plain.id,
    _id: plain.id
  };
}

const defineModels = () => {
  Models.users = sequelize.define('users', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.ENUM('admin', 'manager', 'guest'), defaultValue: 'manager' }
  });

  Models.hotels = sequelize.define('hotels', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    location: { type: DataTypes.STRING, allowNull: false },
    totalRooms: { type: DataTypes.INTEGER, allowNull: false }
  });

  Models.bookings = sequelize.define('bookings', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    hotelId: { type: DataTypes.STRING, allowNull: false },
    guestName: { type: DataTypes.STRING, allowNull: false },
    roomType: { type: DataTypes.STRING, allowNull: false },
    checkIn: { type: DataTypes.DATE, allowNull: false },
    checkOut: { type: DataTypes.DATE, allowNull: false },
    checkInTime: { type: DataTypes.STRING, defaultValue: '14:00' },
    checkOutTime: { type: DataTypes.STRING, defaultValue: '12:00' },
    guestsCount: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.ENUM('booked', 'checked-in', 'checked-out', 'cancelled'), defaultValue: 'booked' },
    revenue: { type: DataTypes.FLOAT, defaultValue: 0 }
  });

  Models.occupancyHistory = sequelize.define('occupancyHistory', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    date: { type: DataTypes.STRING, allowNull: false },
    occupancyPercentage: { type: DataTypes.FLOAT, allowNull: false },
    guestCount: { type: DataTypes.INTEGER, allowNull: false },
    roomsOccupied: { type: DataTypes.INTEGER, allowNull: false },
    revenue: { type: DataTypes.FLOAT, defaultValue: 0 }
  }, {
    tableName: 'occupancyHistory'
  });

  Models.employees = sequelize.define('employees', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    department: { type: DataTypes.STRING, allowNull: false },
    shift: { type: DataTypes.STRING, allowNull: false },
    salary: { type: DataTypes.FLOAT, allowNull: false },
    attendance: { type: DataTypes.JSON, defaultValue: [] },
    performance: { type: DataTypes.FLOAT, defaultValue: 5.0 },
    status: { type: DataTypes.STRING, defaultValue: 'active' }
  });

  Models.recommendations = sequelize.define('recommendations', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    date: { type: DataTypes.STRING, allowNull: false },
    predictedOccupancy: { type: DataTypes.FLOAT, allowNull: false },
    predictedGuests: { type: DataTypes.FLOAT, allowNull: false },
    recommendedStaff: { type: DataTypes.JSON },
    actualStaffScheduled: { type: DataTypes.JSON },
    optimized: { type: DataTypes.BOOLEAN, defaultValue: false },
    insights: { type: DataTypes.JSON }
  });

  Models.notifications = sequelize.define('notifications', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    type: { type: DataTypes.STRING, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    message: { type: DataTypes.STRING, allowNull: false },
    date: { type: DataTypes.STRING, allowNull: false },
    read: { type: DataTypes.BOOLEAN, defaultValue: false }
  });

  Models.staffReports = sequelize.define('staffReports', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    guestName: { type: DataTypes.STRING, allowNull: false },
    roomNo: { type: DataTypes.STRING, allowNull: false },
    staffName: { type: DataTypes.STRING, allowNull: false },
    service: { type: DataTypes.STRING, allowNull: false }
  }, {
    tableName: 'staffReports'
  });
};

const connectDB = async () => {
  const mysqlUri = process.env.MYSQL_URI;
  const mysqlHost = process.env.MYSQL_HOST;
  
  if (!mysqlUri && !mysqlHost) {
    console.log('⚠️ MySQL configuration not found in env. Falling back to local JSON database.');
    useMySQL = false;
    return;
  }

  try {
    const dbName = process.env.MYSQL_DATABASE || 'hospitalityAI';

    // Programmatically create/verify the database if connecting using separate config
    if (!mysqlUri) {
      const connection = await mysql.createConnection({
        host: mysqlHost,
        port: process.env.MYSQL_PORT || 3306,
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        connectTimeout: 3000
      });
      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
      await connection.end();
      console.log(`✅ Database "${dbName}" created or verified.`);
    }

    if (mysqlUri) {
      sequelize = new Sequelize(mysqlUri, {
        logging: false,
        dialectOptions: {
          connectTimeout: 3000
        }
      });
    } else {
      sequelize = new Sequelize(
        dbName,
        process.env.MYSQL_USER || 'root',
        process.env.MYSQL_PASSWORD || '',
        {
          host: mysqlHost,
          dialect: 'mysql',
          port: process.env.MYSQL_PORT || 3306,
          logging: false,
          dialectOptions: {
            connectTimeout: 3000
          }
        }
      );
    }

    await sequelize.authenticate();
    console.log('✅ MySQL Connected successfully!');
    useMySQL = true;

    defineModels();
    await sequelize.sync({ alter: true });
    console.log('✅ MySQL Tables synced successfully!');

  } catch (err) {
    console.log(`⚠️ MySQL connection failed: ${err.message}. Falling back to local JSON database.`);
    useMySQL = false;
  }
};

const disconnectDB = async () => {
  if (useMySQL && sequelize) {
    await sequelize.close();
    console.log('🔌 Closed MySQL connection.');
  }
};

// Universal Repository Wrapper
const db = {
  isFallback: () => !useMySQL,
  collection(name) {
    return {
      async find(query = {}) {
        if (useMySQL) {
          const where = translateQuery(query);
          const results = await Models[name].findAll({ where });
          return results.map(doc => formatDoc(doc));
        } else {
          const items = jsonDb.read(name);
          return items.filter(item => jsonDb.match(item, query));
        }
      },

      async findOne(query = {}) {
        if (useMySQL) {
          const where = translateQuery(query);
          const doc = await Models[name].findOne({ where });
          return formatDoc(doc);
        } else {
          const items = jsonDb.read(name);
          const found = items.find(item => jsonDb.match(item, query));
          return found || null;
        }
      },

      async findById(id) {
        if (useMySQL) {
          const doc = await Models[name].findByPk(id);
          return formatDoc(doc);
        } else {
          const items = jsonDb.read(name);
          const found = items.find(item => item._id === id || item.id === id);
          return found || null;
        }
      },

      async create(doc) {
        if (useMySQL) {
          const payload = { ...doc };
          if (payload._id && !payload.id) payload.id = payload._id;
          const created = await Models[name].create(payload);
          return formatDoc(created);
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
        if (useMySQL) {
          const payloads = docs.map(doc => {
            const payload = { ...doc };
            if (payload._id && !payload.id) payload.id = payload._id;
            return payload;
          });
          const created = await Models[name].bulkCreate(payloads);
          return created.map(doc => formatDoc(doc));
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
        if (useMySQL) {
          const where = translateQuery(query);
          const values = translateUpdate(update);
          const [affectedCount] = await Models[name].update(values, {
            where,
            limit: 1
          });
          return { matchedCount: affectedCount, modifiedCount: affectedCount };
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
        if (useMySQL) {
          const where = translateQuery(query);
          const values = translateUpdate(update);
          const [affectedCount] = await Models[name].update(values, { where });
          return { matchedCount: affectedCount, modifiedCount: affectedCount };
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
        if (useMySQL) {
          const values = translateUpdate(update);
          const instance = await Models[name].findByPk(id);
          if (instance) {
            await instance.update(values);
            return formatDoc(instance);
          }
          return null;
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
        if (useMySQL) {
          const where = translateQuery(query);
          const deletedCount = await Models[name].destroy({ where, limit: 1 });
          return { deletedCount };
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
        if (useMySQL) {
          const where = translateQuery(query);
          const deletedCount = await Models[name].destroy({ where });
          return { deletedCount };
        } else {
          const items = jsonDb.read(name);
          const initialCount = items.length;
          const filtered = items.filter(item => !jsonDb.match(item, query));
          jsonDb.write(name, filtered);
          return { deletedCount: initialCount - filtered.length };
        }
      },

      async countDocuments(query = {}) {
        if (useMySQL) {
          const where = translateQuery(query);
          return await Models[name].count({ where });
        } else {
          const items = jsonDb.read(name);
          return items.filter(item => jsonDb.match(item, query)).length;
        }
      }
    };
  }
};

module.exports = { connectDB, disconnectDB, db };
