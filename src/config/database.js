// FIXED: Proper database configuration with error handling
import db from '../database/connection.js';
import logger from '../utils/logger.js';

export const connectDatabase = async () => {
  try {
    console.log('🔍 Testing database connection...');
    
    // FIXED: Test the connection with proper error handling
    if (db && typeof db.execute === 'function') {
      const result = await db.execute('SELECT 1 as test');
      console.log('✅ Database connection test passed');
      return true;
    } else {
      console.log('⚠️  Database is using mock implementation');
      return false;
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('⚠️  Continuing with mock database...');
    return false; // Don't fail startup, just continue with mock
  }
};

export default db;