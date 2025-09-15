import { body, param, query, validationResult } from 'express-validator';

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Auth validations
export const validateRegister = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').trim().isLength({ min: 2 }).withMessage('First name must be at least 2 characters'),
  body('lastName').trim().isLength({ min: 2 }).withMessage('Last name must be at least 2 characters'),
  body('phone').optional().isMobilePhone('en-NG').withMessage('Valid Nigerian phone number required'),
  body('role').isIn(['household', 'waste_picker', 'recycling_company']).withMessage('Invalid role'),
  handleValidationErrors
];

export const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
  handleValidationErrors
];

export const validatePasswordReset = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  handleValidationErrors
];

export const validatePasswordUpdate = [
  body('token').notEmpty().withMessage('Reset token required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  handleValidationErrors
];

// Pickup validations
export const validatePickupRequest = [
  body('wasteType').isIn(['plastic', 'paper', 'metal', 'glass', 'electronics', 'organic', 'mixed']).withMessage('Invalid waste type'),
  body('estimatedWeight').optional().isFloat({ min: 0.1 }).withMessage('Weight must be greater than 0'),
  body('pickupAddress').trim().isLength({ min: 10 }).withMessage('Pickup address must be at least 10 characters'),
  body('pickupLatitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('pickupLongitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  body('preferredDate').optional().isISO8601().withMessage('Invalid date format'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description too long'),
  handleValidationErrors
];

export const validatePickupUpdate = [
  param('id').isUUID().withMessage('Invalid pickup ID'),
  body('status').optional().isIn(['accepted', 'in_progress', 'completed', 'cancelled']).withMessage('Invalid status'),
  body('actualWeight').optional().isFloat({ min: 0.1 }).withMessage('Weight must be greater than 0'),
  body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('feedback').optional().trim().isLength({ max: 500 }).withMessage('Feedback too long'),
  handleValidationErrors
];

// Profile validations
export const validateProfileUpdate = [
  body('firstName').optional().trim().isLength({ min: 2 }).withMessage('First name must be at least 2 characters'),
  body('lastName').optional().trim().isLength({ min: 2 }).withMessage('Last name must be at least 2 characters'),
  body('phone').optional().isMobilePhone('en-NG').withMessage('Valid Nigerian phone number required'),
  body('address').optional().trim().isLength({ min: 10 }).withMessage('Address must be at least 10 characters'),
  body('city').optional().trim().isLength({ min: 2 }).withMessage('City must be at least 2 characters'),
  body('state').optional().trim().isLength({ min: 2 }).withMessage('State must be at least 2 characters'),
  handleValidationErrors
];

export const validateWastePickerProfile = [
  body('vehicleType').optional().trim().isLength({ min: 2 }).withMessage('Vehicle type required'),
  body('vehicleNumber').optional().trim().isLength({ min: 3 }).withMessage('Vehicle number required'),
  body('serviceRadius').optional().isInt({ min: 1, max: 50 }).withMessage('Service radius must be between 1-50 km'),
  body('specializations').optional().isArray().withMessage('Specializations must be an array'),
  handleValidationErrors
];

// Reward validations
export const validateRewardRedemption = [
  body('rewardId').isUUID().withMessage('Invalid reward ID'),
  body('deliveryInfo').optional().isObject().withMessage('Delivery info must be an object'),
  handleValidationErrors
];

// Query validations
export const validatePagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1-100'),
  handleValidationErrors
];

export const validateLocationQuery = [
  query('latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  query('longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  query('radius').optional().isFloat({ min: 0.1, max: 100 }).withMessage('Radius must be between 0.1-100 km'),
  handleValidationErrors
];