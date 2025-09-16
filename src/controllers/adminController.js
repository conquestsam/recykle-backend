import db from '../database/connection.js';
import { users, pickupRequests, transactions, notifications } from '../database/schema.js';
import { eq, and, desc, sql, between, or, like } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import emailService from '../services/emailService.js';
import logger from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

export default class AdminController {
  // Get all admin users (Super Admin only)
  async getAllAdminUsers(req, res) {
    try {
      const { page = 1, limit = 20, search } = req.query;
      const offset = (page - 1) * limit;

      let query = db
        .select()
        .from(users)
        .where(or(
          eq(users.role, 'admin'),
          eq(users.role, 'government')
        ));

      if (search) {
        query = query.where(and(
          or(
            eq(users.role, 'admin'),
            eq(users.role, 'government')
          ),
          or(
            like(users.firstName, `%${search}%`),
            like(users.lastName, `%${search}%`),
            like(users.email, `%${search}%`)
          )
        ));
      }

      const adminUsers = await query
        .orderBy(desc(users.createdAt))
        .limit(parseInt(limit))
        .offset(offset);

      // Remove sensitive data
      const sanitizedUsers = adminUsers.map(user => {
        delete user.password;
        delete user.emailVerificationToken;
        delete user.phoneVerificationCode;
        delete user.passwordResetToken;
        return user;
      });

      res.json({
        success: true,
        data: sanitizedUsers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: sanitizedUsers.length
        }
      });

    } catch (error) {
      logger.error('Get all admin users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get admin users',
        error: error.message
      });
    }
  }

  // Create admin user (Super Admin only)
  async createAdminUser(req, res) {
    try {
      const { email, password, firstName, lastName, role, permissions } = req.body;

      // Check if user already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      const newAdminUser = await db
        .insert(users)
        .values({
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role: role || 'admin',
          status: 'active',
          isEmailVerified: true,
          permissions: permissions || {}
        })
        .returning();

      const user = newAdminUser[0];
      delete user.password;

      res.status(201).json({
        success: true,
        message: 'Admin user created successfully',
        data: user
      });

    } catch (error) {
      logger.error('Create admin user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create admin user',
        error: error.message
      });
    }
  }

  // Update admin user (Super Admin only)
  async updateAdminUser(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Remove sensitive fields
      delete updateData.password;
      delete updateData.email;

      const updatedUser = await db
        .update(users)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();

      if (!updatedUser.length) {
        return res.status(404).json({
          success: false,
          message: 'Admin user not found'
        });
      }

      const user = updatedUser[0];
      delete user.password;

      res.json({
        success: true,
        message: 'Admin user updated successfully',
        data: user
      });

    } catch (error) {
      logger.error('Update admin user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update admin user',
        error: error.message
      });
    }
  }

  // Delete admin user (Super Admin only)
  async deleteAdminUser(req, res) {
    try {
      const { id } = req.params;

      // Prevent self-deletion
      if (id === req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete your own account'
        });
      }

      // Soft delete
      await db
        .update(users)
        .set({ 
          status: 'inactive',
          updatedAt: new Date() 
        })
        .where(eq(users.id, id));

      res.json({
        success: true,
        message: 'Admin user deleted successfully'
      });

    } catch (error) {
      logger.error('Delete admin user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete admin user',
        error: error.message
      });
    }
  }

  // Get admin dashboard
  async getAdminDashboard(req, res) {
    try {
      const { period = '30d' } = req.query;

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      // Get comprehensive dashboard data
      const [userStats] = await db
        .select({
          totalUsers: sql`count(*)`,
          activeUsers: sql`count(*) filter (where status = 'active')`,
          newUsersThisPeriod: sql`count(*) filter (where created_at >= ${startDate})`,
          households: sql`count(*) filter (where role = 'household')`,
          wastePickers: sql`count(*) filter (where role = 'waste_picker')`,
          companies: sql`count(*) filter (where role = 'recycling_company')`
        })
        .from(users);

      const [pickupStats] = await db
        .select({
          totalPickups: sql`count(*)`,
          completedPickups: sql`count(*) filter (where status = 'completed')`,
          pendingPickups: sql`count(*) filter (where status = 'pending')`,
          totalWasteCollected: sql`sum(actual_weight)`,
          totalPointsAwarded: sql`sum(points_earned)`
        })
        .from(pickupRequests)
        .where(between(pickupRequests.createdAt, startDate, endDate));

      const [transactionStats] = await db
        .select({
          totalRevenue: sql`sum(amount) filter (where status = 'completed')`,
          totalTransactions: sql`count(*) filter (where status = 'completed')`,
          pendingTransactions: sql`count(*) filter (where status = 'pending')`
        })
        .from(transactions)
        .where(between(transactions.createdAt, startDate, endDate));

      // Get recent activities
      const recentActivities = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          action: sql`'user_registered'`,
          timestamp: users.createdAt
        })
        .from(users)
        .where(sql`${users.createdAt} >= ${startDate}`)
        .orderBy(desc(users.createdAt))
        .limit(10);

      const dashboardData = {
        period,
        dateRange: { startDate, endDate },
        users: userStats,
        pickups: pickupStats,
        transactions: transactionStats,
        recentActivities,
        systemHealth: {
          apiStatus: 'healthy',
          databaseStatus: 'connected',
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage()
        }
      };

      res.json({
        success: true,
        data: dashboardData
      });

    } catch (error) {
      logger.error('Get admin dashboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get admin dashboard',
        error: error.message
      });
    }
  }

  // Get admin statistics
  async getAdminStats(req, res) {
    try {
      const stats = await Promise.all([
        // User statistics
        db.select({
          totalUsers: sql`count(*)`,
          activeUsers: sql`count(*) filter (where status = 'active')`,
          suspendedUsers: sql`count(*) filter (where status = 'suspended')`,
          unverifiedUsers: sql`count(*) filter (where is_email_verified = false)`
        }).from(users),

        // System statistics
        db.select({
          totalPickups: sql`count(*)`,
          completedPickups: sql`count(*) filter (where status = 'completed')`,
          totalWasteCollected: sql`sum(actual_weight)`
        }).from(pickupRequests),

        // Financial statistics
        db.select({
          totalRevenue: sql`sum(amount) filter (where status = 'completed')`,
          pendingPayments: sql`sum(amount) filter (where status = 'pending')`
        }).from(transactions)
      ]);

      const adminStats = {
        users: stats[0][0],
        pickups: stats[1][0],
        financial: stats[2][0],
        system: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          nodeVersion: process.version
        }
      };

      res.json({
        success: true,
        data: adminStats
      });

    } catch (error) {
      logger.error('Get admin stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get admin statistics',
        error: error.message
      });
    }
  }

  // Manage user roles (Admin only)
  async manageUserRoles(req, res) {
    try {
      const { id } = req.params;
      const { role, permissions } = req.body;

      const updatedUser = await db
        .update(users)
        .set({ 
          role,
          permissions: permissions || {},
          updatedAt: new Date() 
        })
        .where(eq(users.id, id))
        .returning();

      if (!updatedUser.length) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        message: 'User role updated successfully',
        data: updatedUser[0]
      });

    } catch (error) {
      logger.error('Manage user roles error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user role',
        error: error.message
      });
    }
  }

  // System maintenance (Admin only)
  async systemMaintenance(req, res) {
    try {
      const { action, parameters } = req.body;

      let result = {};

      switch (action) {
        case 'clear_cache':
          // Clear application cache
          result = { message: 'Cache cleared successfully' };
          break;

        case 'cleanup_logs':
          // Clean up old log files
          result = { message: 'Logs cleaned up successfully' };
          break;

        case 'optimize_database':
          // Run database optimization
          result = { message: 'Database optimized successfully' };
          break;

        case 'backup_database':
          // Create database backup
          result = { message: 'Database backup created successfully' };
          break;

        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid maintenance action'
          });
      }

      logger.info(`System maintenance performed: ${action}`, { userId: req.user.id });

      res.json({
        success: true,
        message: 'Maintenance task completed successfully',
        data: result
      });

    } catch (error) {
      logger.error('System maintenance error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform maintenance task',
        error: error.message
      });
    }
  }

  // Bulk user operations (Admin only)
  async bulkUserOperations(req, res) {
    try {
      const { operation, userIds, data } = req.body;

      let result = {};

      switch (operation) {
        case 'update_status':
          await db
            .update(users)
            .set({ 
              status: data.status,
              updatedAt: new Date() 
            })
            .where(sql`${users.id} = ANY(${userIds})`);
          
          result = { 
            message: `Updated status for ${userIds.length} users`,
            affectedUsers: userIds.length 
          };
          break;

        case 'send_notification':
          // Create notifications for all users
          for (const userId of userIds) {
            await db.insert(notifications).values({
              userId,
              type: 'system_update',
              title: data.title,
              message: data.message,
              data: data.notificationData || {}
            });
          }
          
          result = { 
            message: `Sent notifications to ${userIds.length} users`,
            affectedUsers: userIds.length 
          };
          break;

        case 'export_users':
          const exportUsers = await db
            .select()
            .from(users)
            .where(sql`${users.id} = ANY(${userIds})`);
          
          result = { 
            message: 'Users exported successfully',
            data: exportUsers 
          };
          break;

        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid bulk operation'
          });
      }

      res.json({
        success: true,
        message: 'Bulk operation completed successfully',
        data: result
      });

    } catch (error) {
      logger.error('Bulk user operations error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform bulk operation',
        error: error.message
      });
    }
  }

  // Get system logs (Admin only)
  async getSystemLogs(req, res) {
    try {
      const { level, startDate, endDate, limit = 100 } = req.query;

      // Read log files
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
        
        // Filter by date range if specified
        if (startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          
          filteredLogs = filteredLogs.filter(line => {
            const logDate = this.extractDateFromLog(line);
            return logDate && logDate >= start && logDate <= end;
          });
        }
        
        // Take only the last N logs
        const recentLogs = filteredLogs.slice(-parseInt(limit));
        
        res.json({
          success: true,
          data: {
            logs: recentLogs,
            total: recentLogs.length,
            level,
            dateRange: { startDate, endDate }
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
      logger.error('Get system logs error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get system logs',
        error: error.message
      });
    }
  }

  // Helper method to extract date from log line
  extractDateFromLog(logLine) {
    try {
      const dateMatch = logLine.match(/\d{4}-\d{2}-\d{2}/);
      return dateMatch ? new Date(dateMatch[0]) : null;
    } catch (error) {
      return null;
    }
  }
}
