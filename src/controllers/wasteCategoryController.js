import db from '../database/connection.js';
import logger from '../utils/logger.js';

// Mock waste categories data
const mockWasteCategories = [
  {
    id: '1',
    name: 'Plastic',
    description: 'Plastic bottles, containers, bags, and packaging materials',
    pointsPerKg: 10,
    icon: 'https://example.com/plastic-icon.png',
    color: '#22c55e',
    isActive: true,
    recyclingTips: [
      'Clean containers before disposal',
      'Remove labels when possible',
      'Separate different plastic types'
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    name: 'Paper',
    description: 'Newspapers, cardboard, office paper, and magazines',
    pointsPerKg: 8,
    icon: 'https://example.com/paper-icon.png',
    color: '#3b82f6',
    isActive: true,
    recyclingTips: [
      'Keep paper dry and clean',
      'Remove staples and clips',
      'Flatten cardboard boxes'
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '3',
    name: 'Metal',
    description: 'Aluminum cans, steel containers, and metal scraps',
    pointsPerKg: 15,
    icon: 'https://example.com/metal-icon.png',
    color: '#f59e0b',
    isActive: true,
    recyclingTips: [
      'Rinse containers clean',
      'Remove labels when possible',
      'Separate aluminum from steel'
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

class WasteCategoryController {
  // Get all waste categories
  async getWasteCategories(req, res) {
    try {
      const { isActive } = req.query;

      let categories = mockWasteCategories;

      if (isActive !== undefined) {
        categories = categories.filter(cat => cat.isActive === (isActive === 'true'));
      }

      res.json({
        success: true,
        data: categories
      });

    } catch (error) {
      logger.error('Get waste categories error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get waste categories',
        error: error.message
      });
    }
  }

  // Create waste category (Admin only)
  async createWasteCategory(req, res) {
    try {
      const {
        name,
        description,
        pointsPerKg,
        color,
        recyclingTips
      } = req.body;

      const newCategory = {
        id: Date.now().toString(),
        name,
        description,
        pointsPerKg: parseInt(pointsPerKg),
        icon: req.file ? req.file.path : null,
        color,
        isActive: true,
        recyclingTips: recyclingTips || [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockWasteCategories.push(newCategory);

      res.status(201).json({
        success: true,
        message: 'Waste category created successfully',
        data: newCategory
      });

    } catch (error) {
      logger.error('Create waste category error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create waste category',
        error: error.message
      });
    }
  }

  // Update waste category (Admin only)
  async updateWasteCategory(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const categoryIndex = mockWasteCategories.findIndex(cat => cat.id === id);

      if (categoryIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Waste category not found'
        });
      }

      // Update category
      mockWasteCategories[categoryIndex] = {
        ...mockWasteCategories[categoryIndex],
        ...updateData,
        icon: req.file ? req.file.path : mockWasteCategories[categoryIndex].icon,
        updatedAt: new Date()
      };

      res.json({
        success: true,
        message: 'Waste category updated successfully',
        data: mockWasteCategories[categoryIndex]
      });

    } catch (error) {
      logger.error('Update waste category error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update waste category',
        error: error.message
      });
    }
  }

  // Delete waste category (Admin only)
  async deleteWasteCategory(req, res) {
    try {
      const { id } = req.params;

      const categoryIndex = mockWasteCategories.findIndex(cat => cat.id === id);

      if (categoryIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Waste category not found'
        });
      }

      // Soft delete by setting isActive to false
      mockWasteCategories[categoryIndex].isActive = false;
      mockWasteCategories[categoryIndex].updatedAt = new Date();

      res.json({
        success: true,
        message: 'Waste category deleted successfully'
      });

    } catch (error) {
      logger.error('Delete waste category error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete waste category',
        error: error.message
      });
    }
  }
}

export const getWasteCategories = new WasteCategoryController().getWasteCategories;
export const createWasteCategory = new WasteCategoryController().createWasteCategory;
export const updateWasteCategory = new WasteCategoryController().updateWasteCategory;
export const deleteWasteCategory = new WasteCategoryController().deleteWasteCategory;