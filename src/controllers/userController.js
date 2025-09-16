import db from '../database/connection.js';
import { users, wastePickerProfiles, recyclingCompanyProfiles } from '../database/schema.js';
import { eq, and, or, like, desc, asc } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import emailService from '../services/emailService.js';
import logger from '../utils/logger.js';
import { calculateDistance } from '../utils/geoUtils.js';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

export default class UserController {
  // Create new user (Admin only)
  async createUser(req, res) {
    try {
      const { email, password, firstName, lastName, phone, role, address, city, state, latitude, longitude } = req.body;

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

      // Create user
      const newUser = await db
        .insert(users)
        .values({
          email,
          password: hashedPassword,
          firstName,
          lastName,
          phone,
          role,
          address,
          city,
          state,
          latitude,
          longitude,
          status: 'active',
          isEmailVerified: true
        })
        .returning();

      const user = newUser[0];
      delete user.password;

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: user
      });

    } catch (error) {
      logger.error('Create user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create user',
        error: error.message
      });
    }
  }

  // Get single user by ID (Admin only)
  async getUserById(req, res) {
    try {
      const { id } = req.params;

      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user.length) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const userData = user[0];
      delete userData.password;
      delete userData.emailVerificationToken;
      delete userData.phoneVerificationCode;
      delete userData.passwordResetToken;

      res.json({
        success: true,
        data: userData
      });

    } catch (error) {
      logger.error('Get user by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user',
        error: error.message
      });
    }
  }

  // Update user by ID (Admin only)
  async updateUserById(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Remove sensitive fields
      delete updateData.password;
      delete updateData.email;
      delete updateData.totalPoints;
      delete updateData.availablePoints;

      const updatedUser = await db
        .update(users)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();

      if (!updatedUser.length) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const user = updatedUser[0];
      delete user.password;

      res.json({
        success: true,
        message: 'User updated successfully',
        data: user
      });

    } catch (error) {
      logger.error('Update user by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user',
        error: error.message
      });
    }
  }

  // Delete user by ID (Admin only)
  async deleteUserById(req, res) {
    try {
      const { id } = req.params;

      // Soft delete by updating status
      const deletedUser = await db
        .update(users)
        .set({ 
          status: 'inactive',
          email: `deleted_${Date.now()}_${id}`,
          updatedAt: new Date() 
        })
        .where(eq(users.id, id))
        .returning();

      if (!deletedUser.length) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        message: 'User deleted successfully'
      });

    } catch (error) {
      logger.error('Delete user by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete user',
        error: error.message
      });
    }
  }

  // Update user (Admin only)
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Remove sensitive fields
      delete updateData.password;
      delete updateData.email;
      delete updateData.totalPoints;
      delete updateData.availablePoints;

      const updatedUser = await db
        .update(users)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();

      if (!updatedUser.length) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const user = updatedUser[0];
      delete user.password;

      res.json({
        success: true,
        message: 'User updated successfully',
        data: user
      });

    } catch (error) {
      logger.error('Update user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user',
        error: error.message
      });
    }
  }

  // Delete user (Admin only)
  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      // Soft delete by updating status
      const deletedUser = await db
        .update(users)
        .set({ 
          status: 'inactive',
          email: `deleted_${Date.now()}_${id}`,
          updatedAt: new Date() 
        })
        .where(eq(users.id, id))
        .returning();

      if (!deletedUser.length) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        message: 'User deleted successfully'
      });

    } catch (error) {
      logger.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete user',
        error: error.message
      });
    }
  }

  // Get user dashboard
  async getUserDashboard(req, res) {
    try {
      const userId = req.params.id || req.user.id;

      // Get user stats based on role
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user.length) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Basic dashboard data
      const dashboardData = {
        user: user[0],
        stats: {
          totalPoints: user[0].totalPoints || 0,
          availablePoints: user[0].availablePoints || 0,
          totalEarnings: user[0].totalEarnings || 0,
          rating: user[0].rating || 0
        }
      };

      res.json({
        success: true,
        data: dashboardData
      });

    } catch (error) {
      logger.error('Get user dashboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user dashboard',
        error: error.message
      });
    }
  }

  // Get user activity
  async getUserActivity(req, res) {
    try {
      const userId = req.params.id || req.user.id;

      // Mock activity data - in real app, you'd have an activity log table
      const activities = [
        {
          id: '1',
          type: 'login',
          description: 'User logged in',
          timestamp: new Date(),
          metadata: {}
        }
      ];

      res.json({
        success: true,
        data: activities
      });

    } catch (error) {
      logger.error('Get user activity error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user activity',
        error: error.message
      });
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const updateData = req.body;

      // Remove sensitive fields that shouldn't be updated here
      delete updateData.password;
      delete updateData.email;
      delete updateData.role;
      delete updateData.status;
      delete updateData.totalPoints;
      delete updateData.availablePoints;

      const updatedUser = await db
        .update(users)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();

      // Remove sensitive data
      const user = updatedUser[0];
      delete user.password;
      delete user.emailVerificationToken;
      delete user.phoneVerificationCode;
      delete user.passwordResetToken;

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: user
      });

    } catch (error) {
      logger.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Profile update failed',
        error: error.message
      });
    }
  }

  // Update waste picker profile
  async updateWastePickerProfile(req, res) {
    try {
      const userId = req.user.id;

      if (req.user.role !== 'waste_picker') {
        return res.status(403).json({
          success: false,
          message: 'Only waste pickers can update this profile'
        });
      }

      const updateData = req.body;

      // Check if profile exists
      const existingProfile = await db
        .select()
        .from(wastePickerProfiles)
        .where(eq(wastePickerProfiles.userId, userId))
        .limit(1);

      let profile;
      if (existingProfile.length > 0) {
        // Update existing profile
        profile = await db
          .update(wastePickerProfiles)
          .set({ ...updateData, updatedAt: new Date() })
          .where(eq(wastePickerProfiles.userId, userId))
          .returning();
      } else {
        // Create new profile
        profile = await db
          .insert(wastePickerProfiles)
          .values({ userId, ...updateData })
          .returning();
      }

      res.json({
        success: true,
        message: 'Waste picker profile updated successfully',
        data: profile[0]
      });

    } catch (error) {
      logger.error('Update waste picker profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Waste picker profile update failed',
        error: error.message
      });
    }
  }

  // Update recycling company profile
  async updateRecyclingCompanyProfile(req, res) {
    try {
      const userId = req.user.id;

      if (req.user.role !== 'recycling_company') {
        return res.status(403).json({
          success: false,
          message: 'Only recycling companies can update this profile'
        });
      }

      const updateData = req.body;

      // Check if profile exists
      const existingProfile = await db
        .select()
        .from(recyclingCompanyProfiles)
        .where(eq(recyclingCompanyProfiles.userId, userId))
        .limit(1);

      let profile;
      if (existingProfile.length > 0) {
        // Update existing profile
        profile = await db
          .update(recyclingCompanyProfiles)
          .set({ ...updateData, updatedAt: new Date() })
          .where(eq(recyclingCompanyProfiles.userId, userId))
          .returning();
      } else {
        // Create new profile
        profile = await db
          .insert(recyclingCompanyProfiles)
          .values({ userId, ...updateData })
          .returning();
      }

      res.json({
        success: true,
        message: 'Recycling company profile updated successfully',
        data: profile[0]
      });

    } catch (error) {
      logger.error('Update recycling company profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Recycling company profile update failed',
        error: error.message
      });
    }
  }

  // Get user profile with role-specific data
  async getFullProfile(req, res) {
    try {
      const userId = req.params.id || req.user.id;

      // Get basic user data
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user.length) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const userData = user[0];
      delete userData.password;
      delete userData.emailVerificationToken;
      delete userData.phoneVerificationCode;
      delete userData.passwordResetToken;

      let profileData = null;

      // Get role-specific profile data
      if (userData.role === 'waste_picker') {
        const profile = await db
          .select()
          .from(wastePickerProfiles)
          .where(eq(wastePickerProfiles.userId, userId))
          .limit(1);
        
        profileData = profile.length > 0 ? profile[0] : null;
      } else if (userData.role === 'recycling_company') {
        const profile = await db
          .select()
          .from(recyclingCompanyProfiles)
          .where(eq(recyclingCompanyProfiles.userId, userId))
          .limit(1);
        
        profileData = profile.length > 0 ? profile[0] : null;
      }

      res.json({
        success: true,
        data: {
          user: userData,
          profile: profileData
        }
      });

    } catch (error) {
      logger.error('Get full profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get profile',
        error: error.message
      });
    }
  }

  // Get all users (admin only)
  async getAllUsers(req, res) {
    try {
      const { page = 1, limit = 20, role, status, search } = req.query;
      const offset = (page - 1) * limit;

      let query = db.select().from(users);

      // Apply filters
      const conditions = [];
      if (role) conditions.push(eq(users.role, role));
      if (status) conditions.push(eq(users.status, status));
      if (search) {
        conditions.push(
          or(
            like(users.firstName, `%${search}%`),
            like(users.lastName, `%${search}%`),
            like(users.email, `%${search}%`)
          )
        );
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const allUsers = await query
        .orderBy(desc(users.createdAt))
        .limit(parseInt(limit))
        .offset(offset);

      // Remove sensitive data
      const sanitizedUsers = allUsers.map(user => {
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
      logger.error('Get all users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get users',
        error: error.message
      });
    }
  }

  // Update user status (admin only)
  async updateUserStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const updatedUser = await db
        .update(users)
        .set({ status, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();

      if (!updatedUser.length) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Send notification email if approved
      if (status === 'active') {
        await emailService.sendAccountVerificationApproved(updatedUser[0]);
      }

      res.json({
        success: true,
        message: 'User status updated successfully',
        data: updatedUser[0]
      });

    } catch (error) {
      logger.error('Update user status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user status',
        error: error.message
      });
    }
  }

  // Delete user account
  async deleteAccount(req, res) {
    try {
      const userId = req.user.id;

      // Soft delete by updating status
      await db
        .update(users)
        .set({ 
          status: 'inactive',
          email: `deleted_${Date.now()}_${req.user.email}`,
          updatedAt: new Date() 
        })
        .where(eq(users.id, userId));

      res.json({
        success: true,
        message: 'Account deleted successfully'
      });

    } catch (error) {
      logger.error('Delete account error:', error);
      res.status(500).json({
        success: false,
        message: 'Account deletion failed',
        error: error.message
      });
    }
  }

  // Get user statistics
  async getUserStats(req, res) {
    try {
      const userId = req.params.id || req.user.id;

      // This would typically involve complex queries
      // For now, returning basic user data
      const user = await db
        .select({
          totalPoints: users.totalPoints,
          availablePoints: users.availablePoints,
          totalEarnings: users.totalEarnings,
          rating: users.rating,
          totalRatings: users.totalRatings,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user.length) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: user[0]
      });

    } catch (error) {
      logger.error('Get user stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user statistics',
        error: error.message
      });
    }
  }

  // Search waste pickers
  async searchWastePickers(req, res) {
    try {
      const { latitude, longitude, radius = 10, specialization, isVerified } = req.query;

      let query = db
        .select({
          user: users,
          profile: wastePickerProfiles
        })
        .from(users)
        .leftJoin(wastePickerProfiles, eq(users.id, wastePickerProfiles.userId))
        .where(and(
          eq(users.role, 'waste_picker'),
          eq(users.status, 'active')
        ));

      if (isVerified === 'true') {
        query = query.where(and(
          eq(users.role, 'waste_picker'),
          eq(users.status, 'active'),
          eq(wastePickerProfiles.isVerified, true)
        ));
      }

      const wastePickers = await query;

      // Filter by location if coordinates provided
      let filteredPickers = wastePickers;
      if (latitude && longitude) {
        filteredPickers = wastePickers.filter(picker => {
          if (!picker.user.latitude || !picker.user.longitude) return false;
          
          const distance = calculateDistance(
            parseFloat(latitude),
            parseFloat(longitude),
            parseFloat(picker.user.latitude),
            parseFloat(picker.user.longitude)
          );
          
          return distance <= parseFloat(radius);
        });
      }

      // Filter by specialization
      if (specialization) {
        filteredPickers = filteredPickers.filter(picker => {
          return picker.profile?.specializations?.includes(specialization);
        });
      }

      // Remove sensitive data
      const sanitizedPickers = filteredPickers.map(picker => {
        delete picker.user.password;
        delete picker.user.emailVerificationToken;
        delete picker.user.phoneVerificationCode;
        delete picker.user.passwordResetToken;
        return picker;
      });

      res.json({
        success: true,
        data: sanitizedPickers
      });

    } catch (error) {
      logger.error('Search waste pickers error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search waste pickers',
        error: error.message
      });
    }
  }

  // Search recycling companies
  async searchRecyclingCompanies(req, res) {
    try {
      const { latitude, longitude, radius = 50, wasteType, isVerified } = req.query;

      let query = db
        .select({
          user: users,
          profile: recyclingCompanyProfiles
        })
        .from(users)
        .leftJoin(recyclingCompanyProfiles, eq(users.id, recyclingCompanyProfiles.userId))
        .where(and(
          eq(users.role, 'recycling_company'),
          eq(users.status, 'active')
        ));

      if (isVerified === 'true') {
        query = query.where(and(
          eq(users.role, 'recycling_company'),
          eq(users.status, 'active'),
          eq(recyclingCompanyProfiles.isVerified, true)
        ));
      }

      const companies = await query;

      // Filter by location if coordinates provided
      let filteredCompanies = companies;
      if (latitude && longitude) {
        filteredCompanies = companies.filter(company => {
          if (!company.user.latitude || !company.user.longitude) return false;
          
          const distance = calculateDistance(
            parseFloat(latitude),
            parseFloat(longitude),
            parseFloat(company.user.latitude),
            parseFloat(company.user.longitude)
          );
          
          return distance <= parseFloat(radius);
        });
      }

      // Filter by waste type
      if (wasteType) {
        filteredCompanies = filteredCompanies.filter(company => {
          return company.profile?.acceptedWasteTypes?.includes(wasteType);
        });
      }

      // Remove sensitive data
      const sanitizedCompanies = filteredCompanies.map(company => {
        delete company.user.password;
        delete company.user.emailVerificationToken;
        delete company.user.phoneVerificationCode;
        delete company.user.passwordResetToken;
        return company;
      });

      res.json({
        success: true,
        data: sanitizedCompanies
      });

    } catch (error) {
      logger.error('Search recycling companies error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search recycling companies',
        error: error.message
      });
    }
  }

  // Upload avatar
  async uploadAvatar(req, res) {
    try {
      upload.single('avatar')(req, res, async (err) => {
        if (err) {
          return res.status(400).json({
            success: false,
            message: err.message
          });
        }

        if (!req.file) {
          return res.status(400).json({
            success: false,
            message: 'No file uploaded'
          });
        }

        // Upload to Cloudinary
        const result = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              resource_type: 'image',
              folder: 'recykle-naija/avatars',
              transformation: [
                { width: 300, height: 300, crop: 'fill' },
                { quality: 'auto' }
              ]
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          ).end(req.file.buffer);
        });

        // Update user avatar
        const updatedUser = await db
          .update(users)
          .set({ 
            avatar: result.secure_url,
            updatedAt: new Date() 
          })
          .where(eq(users.id, req.user.id))
          .returning();

        res.json({
          success: true,
          message: 'Avatar uploaded successfully',
          data: {
            avatar: result.secure_url
          }
        });
      });

    } catch (error) {
      logger.error('Upload avatar error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload avatar',
        error: error.message
      });
    }
  }

  // Upload verification documents
  async uploadVerificationDocuments(req, res) {
    try {
      upload.array('documents', 5)(req, res, async (err) => {
        if (err) {
          return res.status(400).json({
            success: false,
            message: err.message
          });
        }

        if (!req.files || req.files.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'No files uploaded'
          });
        }

        // Upload all files to Cloudinary
        const uploadPromises = req.files.map(file => {
          return new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
              {
                resource_type: 'image',
                folder: 'recykle-naija/documents',
                transformation: [{ quality: 'auto' }]
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result.secure_url);
              }
            ).end(file.buffer);
          });
        });

        const documentUrls = await Promise.all(uploadPromises);

        // Update profile based on user role
        if (req.user.role === 'waste_picker') {
          await db
            .update(wastePickerProfiles)
            .set({
              verificationDocuments: documentUrls,
              updatedAt: new Date()
            })
            .where(eq(wastePickerProfiles.userId, req.user.id));
        } else if (req.user.role === 'recycling_company') {
          await db
            .update(recyclingCompanyProfiles)
            .set({
              verificationDocuments: documentUrls,
              updatedAt: new Date()
            })
            .where(eq(recyclingCompanyProfiles.userId, req.user.id));
        }

        res.json({
          success: true,
          message: 'Documents uploaded successfully',
          data: {
            documents: documentUrls
          }
        });
      });

    } catch (error) {
      logger.error('Upload verification documents error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload documents',
        error: error.message
      });
    }
  }

  // Get leaderboard
  async getLeaderboard(req, res) {
    try {
      const { limit = 20, period = 'all' } = req.query;

      let query = db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          avatar: users.avatar,
          totalPoints: users.totalPoints,
          city: users.city,
          state: users.state
        })
        .from(users)
        .where(eq(users.status, 'active'))
        .orderBy(desc(users.totalPoints))
        .limit(parseInt(limit));

      const leaderboard = await query;

      res.json({
        success: true,
        data: leaderboard
      });

    } catch (error) {
      logger.error('Get leaderboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get leaderboard',
        error: error.message
      });
    }
  }
}
