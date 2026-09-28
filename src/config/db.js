const mongoose = require('mongoose');
const dns = require('dns');

// If using cloud SRV records (e.g., mongodb+srv://), ensure public DNS resolvers are available
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore in environments where setServers is restricted
}

let cachedConnection = null;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (cachedConnection) {
    return cachedConnection;
  }

  const primaryUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ecom_db';
  const localFallbackUri = 'mongodb://127.0.0.1:27017/ecom_db';

  cachedConnection = (async () => {
    try {
      const conn = await mongoose.connect(primaryUri, {
        serverSelectionTimeoutMS: 6000
      });
      console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      console.warn(`[Database Warning] Primary connection failed: ${error.message}`);

      // If primary was not local, try fallback to local MongoDB instance
      if (!primaryUri.includes('127.0.0.1') && !primaryUri.includes('localhost')) {
        console.log(`[Database] Attempting fallback to local MongoDB at ${localFallbackUri}...`);
        try {
          const fallbackConn = await mongoose.connect(localFallbackUri, {
            serverSelectionTimeoutMS: 5000
          });
          console.log(`[Database] Fallback Connected: ${fallbackConn.connection.host}`);
          return fallbackConn;
        } catch (fallbackError) {
          console.error(`[Database Error] Fallback failed: ${fallbackError.message}`);
        }
      }

      cachedConnection = null;
      throw error;
    }
  })();

  return cachedConnection;
};

module.exports = connectDB;
