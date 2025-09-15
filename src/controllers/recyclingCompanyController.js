import db from '../database/connection.js';
import { users, recyclingCompanyProfiles } from '../database/schema.js';
import { eq, and, desc, like, or } from 'drizzle-orm';
import emailService from '../services/emailService.js';
import logger from '../utils/logger.js';

class RecyclingCompanyController {
  // Get all recycling companies
  async getRecyclingCompanies(req, res) {
    try {
      const { page = 1, limit = 20, search, isVerified, city, state } = req.query;
      const offset = (page - 1) * limit;

      let query = db
        .select({
          user: users,
          profile: recyclingCompanyProfiles
        })
        .from(users)
        .leftJoin(recyclingCompanyProfiles, eq(users.id, recyclingCompanyProfiles.userId))
        .where(eq(users.role, 'recycling_company'));

      // Apply filters
      const conditions = [eq(users.role, 'recycling_company')];
      
      if (search) {
        conditions.push(
          or(
            like(users.firstName, `%${search}%`),
            like(users.lastName, `%${search}%`),
            like(recyclingCompanyProfiles.companyName, `%${search}%`)
          )
        );
      }
      
      if (isVerified !== undefined) {
        conditions.push(eq(recyclingCompanyProfiles.isVerified, isVerified === 'true'));
      }
      
      if (city) {
        conditions.push(eq(users.city, city));
      }
      
      if (state) {
        conditions.push(eq(users.state, state));
      }

      if (conditions.length > 1) {
        query = query.where(and(...conditions));
      }

      const companies = await query
        .orderBy(desc(users.createdAt))
        .limit(parseInt(limit))
        .offset(offset);

      // Remove sensitive data
      const sanitizedCompanies = companies.map(company => {
        delete company.user.password;
        delete company.user.emailVerificationToken;
        delete company.user.phoneVerificationCode;
        delete company.user.passwordResetToken;
        return company;
      });

      res.json({
        success: true,
        data: sanitizedCompanies,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: sanitizedCompanies.length
        }
      });

    } catch (error) {
      logger.error('Get recycling companies error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get recycling companies',
        error: error.message
      });
    }
  }

  // Create recycling company (Admin only)
  async createRecyclingCompany(req, res) {
    try {
      const {
        email,
        password,
        firstName,
        lastName,
        phone,
        address,
        city,
        state,
        companyName,
        registrationNumber,
        website,
        description,
        acceptedWasteTypes,
        processingCapacity
      } = req.body;

      // Create user account
      const hashedPassword = await bcrypt.hash(password, 12);
      
      const newUser = await db
        .insert(users)
        .values({
          email,
          password: hashedPassword,
          firstName,
          lastName,
          phone,
          role: 'recycling_company',
          address,
          city,
          state,
          status: 'pending_verification'
        })
        .returning();

      // Create company profile
      const companyProfile = await db
        .insert(recyclingCompanyProfiles)
        .values({
          userId: newUser[0].id,
          companyName,
          registrationNumber,
          website,
          description,
          acceptedWasteTypes,
          processingCapacity
        })
        .returning();

      res.status(201).json({
        success: true,
        message: 'Recycling company created successfully',
        data: {
          user: newUser[0],
          profile: companyProfile[0]
        }
      });

    } catch (error) {
      logger.error('Create recycling company error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create recycling company',
        error: error.message
      });
    }
  }

  // Get recycling company by ID
  async getRecyclingCompanyById(req, res) {
    try {
      const { id } = req.params;

      const company = await db
        .select({
          user: users,
          profile: recyclingCompanyProfiles
        })
        .from(users)
        .leftJoin(recyclingCompanyProfiles, eq(users.id, recyclingCompanyProfiles.userId))
        .where(and(
          eq(users.id, id),
          eq(users.role, 'recycling_company')
        ))
        .limit(1);

      if (!company.length) {
        return res.status(404).json({
          success: false,
          message: 'Recycling company not found'
        });
      }

      const companyData = company[0];
      delete companyData.user.password;

      res.json({
        success: true,
        data: companyData
      });

    } catch (error) {
      logger.error('Get recycling company by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get recycling company',
        error: error.message
      });
    }
  }

  // Update recycling company
  async updateRecyclingCompany(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Check if user can update this company
      if (req.user.role !== 'admin' && req.user.id !== id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Update user data
      const userUpdateData = {};
      if (updateData.firstName) userUpdateData.firstName = updateData.firstName;
      if (updateData.lastName) userUpdateData.lastName = updateData.lastName;
      if (updateData.phone) userUpdateData.phone = updateData.phone;
      if (updateData.address) userUpdateData.address = updateData.address;
      if (updateData.city) userUpdateData.city = updateData.city;
      if (updateData.state) userUpdateData.state = updateData.state;

      if (Object.keys(userUpdateData).length > 0) {
        await db
          .update(users)
          .set({ ...userUpdateData, updatedAt: new Date() })
          .where(eq(users.id, id));
      }

      // Update company profile
      const profileUpdateData = {};
      if (updateData.companyName) profileUpdateData.companyName = updateData.companyName;
      if (updateData.registrationNumber) profileUpdateData.registrationNumber = updateData.registrationNumber;
      if (updateData.website) profileUpdateData.website = updateData.website;
      if (updateData.description) profileUpdateData.description = updateData.description;
      if (updateData.acceptedWasteTypes) profileUpdateData.acceptedWasteTypes = updateData.acceptedWasteTypes;
      if (updateData.processingCapacity) profileUpdateData.processingCapacity = updateData.processingCapacity;

      if (Object.keys(profileUpdateData).length > 0) {
        await db
          .update(recyclingCompanyProfiles)
          .set({ ...profileUpdateData, updatedAt: new Date() })
          .where(eq(recyclingCompanyProfiles.userId, id));
      }

      res.json({
        success: true,
        message: 'Recycling company updated successfully'
      });

    } catch (error) {
      logger.error('Update recycling company error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update recycling company',
        error: error.message
      });
    }
  }

  // Delete recycling company (Admin only)
  async deleteRecyclingCompany(req, res) {
    try {
      const { id } = req.params;

      // Soft delete by updating status
      await db
        .update(users)
        .set({ 
          status: 'inactive',
          updatedAt: new Date() 
        })
        .where(eq(users.id, id));

      res.json({
        success: true,
        message: 'Recycling company deleted successfully'
      });

    } catch (error) {
      logger.error('Delete recycling company error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete recycling company',
        error: error.message
      });
    }
  }

  // Approve recycling company (Admin only)
  async approveRecyclingCompany(req, res) {
    try {
      const { id } = req.params;

      // Update user status
      const updatedUser = await db
        .update(users)
        .set({ 
          status: 'active',
          updatedAt: new Date() 
        })
        .where(eq(users.id, id))
        .returning();

      // Update company verification status
      await db
        .update(recyclingCompanyProfiles)
        .set({ 
          isVerified: true,
          updatedAt: new Date() 
        })
        .where(eq(recyclingCompanyProfiles.userId, id));

      if (updatedUser.length > 0) {
        // Send approval email
        await emailService.sendAccountVerificationApproved(updatedUser[0]);
      }

      res.json({
        success: true,
        message: 'Recycling company approved successfully'
      });

    } catch (error) {
      logger.error('Approve recycling company error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to approve recycling company',
        error: error.message
      });
    }
  }
}

export const getRecyclingCompanies = new RecyclingCompanyController().getRecyclingCompanies;
export const createRecyclingCompany = new RecyclingCompanyController().createRecyclingCompany;
export const getRecyclingCompanyById = new RecyclingCompanyController().getRecyclingCompanyById;
export const updateRecyclingCompany = new RecyclingCompanyController().updateRecyclingCompany;
export const deleteRecyclingCompany = new RecyclingCompanyController().deleteRecyclingCompany;
export const approveRecyclingCompany = new RecyclingCompanyController().approveRecyclingCompany;