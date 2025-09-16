import db from '../database/connection.js';
import { users } from '../database/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import emailService from '../services/emailService.js';
import logger from '../utils/logger.js';

// Mock support tickets table structure
const mockSupportTickets = [];

export default class SupportController {
  // Get support tickets
  async getSupportTickets(req, res) {
    try {
      const { page = 1, limit = 20, status, priority } = req.query;
      const userId = req.user.id;

      // Filter tickets based on user role
      let tickets = mockSupportTickets;
      
      if (req.user.role !== 'admin') {
        tickets = tickets.filter(ticket => ticket.userId === userId);
      }

      // Apply filters
      if (status) {
        tickets = tickets.filter(ticket => ticket.status === status);
      }
      if (priority) {
        tickets = tickets.filter(ticket => ticket.priority === priority);
      }

      // Pagination
      const offset = (page - 1) * limit;
      const paginatedTickets = tickets.slice(offset, offset + parseInt(limit));

      res.json({
        success: true,
        data: paginatedTickets,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: tickets.length
        }
      });

    } catch (error) {
      logger.error('Get support tickets error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get support tickets',
        error: error.message
      });
    }
  }

  // Create support ticket
  async createSupportTicket(req, res) {
    try {
      const { subject, description, priority = 'medium', category } = req.body;
      const userId = req.user.id;

      const newTicket = {
        id: Date.now().toString(),
        userId,
        subject,
        description,
        priority,
        category,
        status: 'open',
        assignedTo: null,
        attachments: req.files ? req.files.map(file => file.path) : [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockSupportTickets.push(newTicket);

      // Send notification to admin users
      const adminUsers = await db
        .select()
        .from(users)
        .where(eq(users.role, 'admin'));

      for (const admin of adminUsers) {
        // Send email notification about new ticket
        logger.info(`New support ticket created: ${newTicket.id}`);
      }

      res.status(201).json({
        success: true,
        message: 'Support ticket created successfully',
        data: newTicket
      });

    } catch (error) {
      logger.error('Create support ticket error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create support ticket',
        error: error.message
      });
    }
  }

  // Get support ticket by ID
  async getSupportTicketById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const ticket = mockSupportTickets.find(t => t.id === id);

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Support ticket not found'
        });
      }

      // Check permissions
      if (req.user.role !== 'admin' && ticket.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      res.json({
        success: true,
        data: ticket
      });

    } catch (error) {
      logger.error('Get support ticket by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get support ticket',
        error: error.message
      });
    }
  }

  // Update support ticket
  async updateSupportTicket(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const userId = req.user.id;

      const ticketIndex = mockSupportTickets.findIndex(t => t.id === id);

      if (ticketIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Support ticket not found'
        });
      }

      const ticket = mockSupportTickets[ticketIndex];

      // Check permissions
      if (req.user.role !== 'admin' && ticket.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Update ticket
      mockSupportTickets[ticketIndex] = {
        ...ticket,
        ...updateData,
        updatedAt: new Date()
      };

      res.json({
        success: true,
        message: 'Support ticket updated successfully',
        data: mockSupportTickets[ticketIndex]
      });

    } catch (error) {
      logger.error('Update support ticket error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update support ticket',
        error: error.message
      });
    }
  }

  // Close support ticket
  async closeSupportTicket(req, res) {
    try {
      const { id } = req.params;
      const { resolution } = req.body;

      const ticketIndex = mockSupportTickets.findIndex(t => t.id === id);

      if (ticketIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Support ticket not found'
        });
      }

      // Update ticket status
      mockSupportTickets[ticketIndex] = {
        ...mockSupportTickets[ticketIndex],
        status: 'closed',
        resolution,
        closedAt: new Date(),
        updatedAt: new Date()
      };

      res.json({
        success: true,
        message: 'Support ticket closed successfully',
        data: mockSupportTickets[ticketIndex]
      });

    } catch (error) {
      logger.error('Close support ticket error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to close support ticket',
        error: error.message
      });
    }
  }

  // Assign support ticket (Admin only)
  async assignSupportTicket(req, res) {
    try {
      const { id } = req.params;
      const { assignedTo } = req.body;

      const ticketIndex = mockSupportTickets.findIndex(t => t.id === id);

      if (ticketIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Support ticket not found'
        });
      }

      // Update ticket assignment
      mockSupportTickets[ticketIndex] = {
        ...mockSupportTickets[ticketIndex],
        assignedTo,
        status: 'in_progress',
        updatedAt: new Date()
      };

      res.json({
        success: true,
        message: 'Support ticket assigned successfully',
        data: mockSupportTickets[ticketIndex]
      });

    } catch (error) {
      logger.error('Assign support ticket error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to assign support ticket',
        error: error.message
      });
    }
  }
}
