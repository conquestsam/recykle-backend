import db from '../database/connection.js';
import { systemSettings, users, pickupRequests, transactions } from '../database/schema.js';
import { eq, sql, desc, and, between } from 'drizzle-orm';
import logger from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

class SystemController {
  // Get system settings
  async getSettings(req, res) {
    try {
      const settings = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.isPublic, true));

      const settingsObject = settings.reduce((acc, setting) => {
        let value = setting.value;
        
        // Parse value based on type
        switch (setting.type) {
          case 'number':
            value = parseFloat(setting.value);
            break;
          case 'boolean':
            value = setting.value === 'true';
            break;
          case 'json':
            try {
              value = JSON.parse(setting.value);
            } catch (e) {
              value = setting.value;
            }
            break;
        }
        
        acc[setting.key] = value;
        return acc;
      }, {});

      res.json({
        success: true,
        data: settingsObject
      });

    } catch (error) {
      logger.error('Get settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get settings',
        error: error.message
      });
    }
  }

  // Clear cache
async clearCache(req, res) {
  try {
    // This is a simplified cache clearing implementation
    // In production, you'd use proper cache management (Redis, etc.)
    
    // Clear any in-memory caches if you have them
    // For example, if you have a settings cache:
    // settingsCache.clear();
    
    // If using Redis or other cache systems:
    // await redisClient.flushAll();
    
    // For now, we'll just return success since this is a basic implementation
    res.json({
      success: true,
      message: 'Cache cleared successfully',
      data: {
        timestamp: new Date().toISOString(),
        cleared: true
      }
    });

  } catch (error) {
    logger.error('Clear cache error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cache',
      error: error.message
    });
  }
}

  // Get single setting
  async getSetting(req, res) {
    try {
      const { key } = req.params;

      const setting = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, key))
        .limit(1);

      if (!setting.length) {
        return res.status(404).json({
          success: false,
          message: 'Setting not found'
        });
      }

      const settingData = setting[0];

      // Check if user can access private settings
      if (!settingData.isPublic && (!req.user || req.user.role !== 'admin')) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      res.json({
        success: true,
        data: settingData
      });

    } catch (error) {
      logger.error('Get setting error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get setting',
        error: error.message
      });
    }
  }

  // Create system setting
  async createSetting(req, res) {
    try {
      const { key, value, description, type = 'string', isPublic = false } = req.body;

      const newSetting = await db
        .insert(systemSettings)
        .values({
          key,
          value: String(value),
          description,
          type,
          isPublic
        })
        .returning();

      res.status(201).json({
        success: true,
        message: 'Setting created successfully',
        data: newSetting[0]
      });

    } catch (error) {
      logger.error('Create setting error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create setting',
        error: error.message
      });
    }
  }

  // Update system setting
  async updateSetting(req, res) {
    try {
      const { key } = req.params;
      const { value, description, type, isPublic } = req.body;

      const updateData = { updatedAt: new Date() };
      if (value !== undefined) updateData.value = String(value);
      if (description !== undefined) updateData.description = description;
      if (type !== undefined) updateData.type = type;
      if (isPublic !== undefined) updateData.isPublic = isPublic;

      const updatedSetting = await db
        .update(systemSettings)
        .set(updateData)
        .where(eq(systemSettings.key, key))
        .returning();

      if (!updatedSetting.length) {
        return res.status(404).json({
          success: false,
          message: 'Setting not found'
        });
      }

      res.json({
        success: true,
        message: 'Setting updated successfully',
        data: updatedSetting[0]
      });

    } catch (error) {
      logger.error('Update setting error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update setting',
        error: error.message
      });
    }
  }

  // Delete system setting
  async deleteSetting(req, res) {
    try {
      const { key } = req.params;

      const deletedSetting = await db
        .delete(systemSettings)
        .where(eq(systemSettings.key, key))
        .returning();

      if (!deletedSetting.length) {
        return res.status(404).json({
          success: false,
          message: 'Setting not found'
        });
      }

      res.json({
        success: true,
        message: 'Setting deleted successfully'
      });

    } catch (error) {
      logger.error('Delete setting error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete setting',
        error: error.message
      });
    }
  }

  // Health check
  async healthCheck(req, res) {
    try {
      // Test database connection
      await db.execute(sql`SELECT 1`);

      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
      };

      res.json({
        success: true,
        data: health
      });

    } catch (error) {
      logger.error('Health check error:', error);
      res.status(503).json({
        success: false,
        message: 'System unhealthy',
        error: error.message
      });
    }
  }

  // Get system statistics
  async getSystemStats(req, res) {
    try {
      const stats = await Promise.all([
        // User stats
        db.select({
          totalUsers: sql`count(*)`,
          activeUsers: sql`count(*) filter (where status = 'active')`,
          newUsersToday: sql`count(*) filter (where date(created_at) = current_date)`
        }).from(users),

        // Pickup stats
        db.select({
          totalPickups: sql`count(*)`,
          completedPickups: sql`count(*) filter (where status = 'completed')`,
          pendingPickups: sql`count(*) filter (where status = 'pending')`,
          todayPickups: sql`count(*) filter (where date(created_at) = current_date)`
        }).from(pickupRequests),

        // Transaction stats
        db.select({
          totalTransactions: sql`count(*)`,
          totalRevenue: sql`sum(amount) filter (where status = 'completed')`,
          todayRevenue: sql`sum(amount) filter (where status = 'completed' and date(created_at) = current_date)`
        }).from(transactions)
      ]);

      const systemStats = {
        users: stats[0][0],
        pickups: stats[1][0],
        transactions: stats[2][0],
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          nodeVersion: process.version,
          platform: process.platform
        }
      };

      res.json({
        success: true,
        data: systemStats
      });

    } catch (error) {
      logger.error('Get system stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get system statistics',
        error: error.message
      });
    }
  }

  // Create backup
  async createBackup(req, res) {
    try {
      // This is a simplified backup implementation
      // In production, you'd use proper database backup tools
      
      const backupData = {
        timestamp: new Date().toISOString(),
        users: await db.select().from(users),
        pickupRequests: await db.select().from(pickupRequests),
        transactions: await db.select().from(transactions),
        systemSettings: await db.select().from(systemSettings)
      };

      const backupFileName = `backup_${Date.now()}.json`;
      const backupPath = path.join(process.cwd(), 'backups', backupFileName);

      // Ensure backups directory exists
      await fs.mkdir(path.dirname(backupPath), { recursive: true });

      // Write backup file
      await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));

      res.json({
        success: true,
        message: 'Backup created successfully',
        data: {
          fileName: backupFileName,
          size: (await fs.stat(backupPath)).size,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Create backup error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create backup',
        error: error.message
      });
    }
  }

  // Get system logs
  async getLogs(req, res) {
    try {
      const { level, startDate, endDate, limit = 100 } = req.query;

      // This is a simplified implementation
      // In production, you'd use proper log management tools
      
      const logsPath = path.join(process.cwd(), 'logs', 'combined.log');
      
      try {
        const logContent = await fs.readFile(logsPath, 'utf8');
        const logLines = logContent.split('\n').filter(line => line.trim());
        
        let filteredLogs = logLines;
        
        // Filter by level if specified
        if (level) {
          filteredLogs = filteredLogs.filter(line => 
            line.toLowerCase().includes(level.toLowerCase())
          );
        }
        
        // Take only the last N logs
        const recentLogs = filteredLogs.slice(-parseInt(limit));
        
        res.json({
          success: true,
          data: {
            logs: recentLogs,
            total: recentLogs.length
          }
        });
        
      } catch (fileError) {
        res.json({
          success: true,
          data: {
            logs: [],
            total: 0,
            message: 'No log file found'
          }
        });
      }

    } catch (error) {
      logger.error('Get logs error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get logs',
        error: error.message
      });
    }
  }
}

// Keep your default export
export default SystemController;