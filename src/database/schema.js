// FIXED: Proper Drizzle ORM schema definitions with correct imports
import { pgTable, uuid, varchar, text, integer, decimal, boolean, timestamp, pgEnum, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// FIXED: Define enums properly
export const userRoleEnum = pgEnum('user_role', [
  'household', 
  'waste_picker', 
  'recycling_company', 
  'admin', 
  'government'
]);

export const userStatusEnum = pgEnum('user_status', [
  'active',
  'inactive', 
  'suspended',
  'pending_verification'
]);

export const pickupStatusEnum = pgEnum('pickup_status', [
  'pending',
  'accepted',
  'in_progress', 
  'completed',
  'cancelled'
]);

export const wasteTypeEnum = pgEnum('waste_type', [
  'plastic',
  'paper',
  'metal',
  'glass',
  'electronics',
  'organic',
  'mixed'
]);

export const transactionTypeEnum = pgEnum('transaction_type', [
  'pickup_payment',
  'subscription',
  'commission',
  'refund',
  'withdrawal'
]);

export const transactionStatusEnum = pgEnum('transaction_status', [
  'pending',
  'completed',
  'failed',
  'cancelled'
]);

export const rewardTypeEnum = pgEnum('reward_type', [
  'airtime',
  'data',
  'voucher',
  'cash'
]);

export const notificationTypeEnum = pgEnum('notification_type', [
  'pickup_request',
  'pickup_accepted',
  'pickup_completed',
  'reward_earned',
  'payment_received',
  'system_update'
]);

// FIXED: Users table with proper column definitions
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  password: varchar('password', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  role: userRoleEnum('role').notNull().default('household'),
  status: userStatusEnum('status').notNull().default('pending_verification'),
  isEmailVerified: boolean('is_email_verified').default(false),
  isPhoneVerified: boolean('is_phone_verified').default(false),
  emailVerificationToken: varchar('email_verification_token', { length: 255 }),
  phoneVerificationCode: varchar('phone_verification_code', { length: 10 }),
  passwordResetToken: varchar('password_reset_token', { length: 255 }),
  passwordResetExpires: timestamp('password_reset_expires'),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  country: varchar('country', { length: 100 }).default('Nigeria'),
  latitude: varchar('latitude', { length: 50 }),
  longitude: varchar('longitude', { length: 50 }),
  avatar: text('avatar'),
  totalPoints: integer('total_points').default(0),
  availablePoints: integer('available_points').default(0),
  totalEarnings: decimal('total_earnings', { precision: 10, scale: 2 }).default('0.00'),
  rating: decimal('rating', { precision: 3, scale: 2 }).default('0.00'),
  totalRatings: integer('total_ratings').default(0),
  lastLoginAt: timestamp('last_login_at'),
  permissions: jsonb('permissions').default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// FIXED: Waste picker profiles table
export const wastePickerProfiles = pgTable('waste_picker_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  vehicleType: varchar('vehicle_type', { length: 100 }),
  vehicleNumber: varchar('vehicle_number', { length: 50 }),
  licenseNumber: varchar('license_number', { length: 50 }),
  serviceRadius: integer('service_radius').default(10),
  specializations: jsonb('specializations').default([]),
  workingHours: jsonb('working_hours').default({}),
  isVerified: boolean('is_verified').default(false),
  verificationDocuments: jsonb('verification_documents').default([]),
  bankAccountName: varchar('bank_account_name', { length: 255 }),
  bankAccountNumber: varchar('bank_account_number', { length: 20 }),
  bankName: varchar('bank_name', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// FIXED: Recycling company profiles table
export const recyclingCompanyProfiles = pgTable('recycling_company_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  registrationNumber: varchar('registration_number', { length: 100 }),
  website: varchar('website', { length: 255 }),
  description: text('description'),
  acceptedWasteTypes: jsonb('accepted_waste_types').default([]),
  processingCapacity: integer('processing_capacity'),
  isVerified: boolean('is_verified').default(false),
  verificationDocuments: jsonb('verification_documents').default([]),
  operatingHours: jsonb('operating_hours').default({}),
  certifications: jsonb('certifications').default([]),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// FIXED: Pickup requests table
export const pickupRequests = pgTable('pickup_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  requesterId: uuid('requester_id').references(() => users.id).notNull(),
  wastePickerId: uuid('waste_picker_id').references(() => users.id),
  wasteType: wasteTypeEnum('waste_type').notNull(),
  estimatedWeight: decimal('estimated_weight', { precision: 8, scale: 2 }),
  actualWeight: decimal('actual_weight', { precision: 8, scale: 2 }),
  description: text('description'),
  images: jsonb('images').default([]),
  pickupAddress: text('pickup_address').notNull(),
  pickupLatitude: varchar('pickup_latitude', { length: 50 }).notNull(),
  pickupLongitude: varchar('pickup_longitude', { length: 50 }).notNull(),
  preferredDate: timestamp('preferred_date'),
  preferredTimeSlot: varchar('preferred_time_slot', { length: 50 }),
  status: pickupStatusEnum('status').default('pending'),
  pointsEarned: integer('points_earned').default(0),
  rating: integer('rating'),
  feedback: text('feedback'),
  completedAt: timestamp('completed_at'),
  cancelledAt: timestamp('cancelled_at'),
  cancellationReason: text('cancellation_reason'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// FIXED: Rewards table
export const rewards = pgTable('rewards', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: rewardTypeEnum('type').notNull(),
  pointsCost: integer('points_cost').notNull(),
  value: decimal('value', { precision: 10, scale: 2 }).notNull(),
  provider: varchar('provider', { length: 100 }),
  stockQuantity: integer('stock_quantity'),
  image: text('image'),
  termsAndConditions: text('terms_and_conditions'),
  expiryDate: timestamp('expiry_date'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// FIXED: Reward redemptions table
export const rewardRedemptions = pgTable('reward_redemptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  rewardId: uuid('reward_id').references(() => rewards.id).notNull(),
  pointsUsed: integer('points_used').notNull(),
  redemptionCode: varchar('redemption_code', { length: 50 }),
  deliveryInfo: jsonb('delivery_info').default({}),
  status: varchar('status', { length: 50 }).default('pending'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// FIXED: Transactions table
export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  pickupRequestId: uuid('pickup_request_id').references(() => pickupRequests.id),
  type: transactionTypeEnum('type').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  points: integer('points').default(0),
  status: transactionStatusEnum('status').default('pending'),
  paymentReference: varchar('payment_reference', { length: 255 }),
  paymentMethod: varchar('payment_method', { length: 100 }),
  description: text('description'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// FIXED: Notifications table
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  type: notificationTypeEnum('type').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  data: jsonb('data').default({}),
  isRead: boolean('is_read').default(false),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// FIXED: System settings table
export const systemSettings = pgTable('system_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 255 }).unique().notNull(),
  value: text('value').notNull(),
  description: text('description'),
  type: varchar('type', { length: 50 }).default('string'),
  isPublic: boolean('is_public').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// FIXED: Analytics data table
export const analyticsData = pgTable('analytics_data', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: timestamp('date').notNull(),
  totalPickups: integer('total_pickups').default(0),
  totalWasteCollected: decimal('total_waste_collected', { precision: 10, scale: 2 }).default('0.00'),
  totalPointsAwarded: integer('total_points_awarded').default(0),
  totalRevenue: decimal('total_revenue', { precision: 10, scale: 2 }).default('0.00'),
  activeUsers: integer('active_users').default(0),
  newRegistrations: integer('new_registrations').default(0),
  wasteTypeBreakdown: jsonb('waste_type_breakdown').default({}),
  locationData: jsonb('location_data').default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// FIXED: Email templates table
export const emailTemplates = pgTable('email_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).unique().notNull(),
  subject: varchar('subject', { length: 500 }).notNull(),
  htmlContent: text('html_content').notNull(),
  textContent: text('text_content'),
  variables: jsonb('variables').default([]),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// FIXED: Subscriptions table
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  planName: varchar('plan_name', { length: 100 }).notNull(),
  planType: varchar('plan_type', { length: 50 }).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  startDate: timestamp('start_date').defaultNow(),
  endDate: timestamp('end_date').notNull(),
  status: varchar('status', { length: 50 }).default('active'),
  autoRenew: boolean('auto_renew').default(true),
  features: jsonb('features').default([]),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// FIXED: Define proper relations
export const usersRelations = relations(users, ({ one, many }) => ({
  wastePickerProfile: one(wastePickerProfiles),
  recyclingCompanyProfile: one(recyclingCompanyProfiles),
  pickupRequests: many(pickupRequests),
  transactions: many(transactions),
  notifications: many(notifications),
  subscriptions: many(subscriptions)
}));

export const pickupRequestsRelations = relations(pickupRequests, ({ one }) => ({
  requester: one(users, {
    fields: [pickupRequests.requesterId],
    references: [users.id]
  }),
  wastePicker: one(users, {
    fields: [pickupRequests.wastePickerId],
    references: [users.id]
  })
}));

export const rewardRedemptionsRelations = relations(rewardRedemptions, ({ one }) => ({
  user: one(users, {
    fields: [rewardRedemptions.userId],
    references: [users.id]
  }),
  reward: one(rewards, {
    fields: [rewardRedemptions.rewardId],
    references: [rewards.id]
  })
}));

console.log('📋 Database schema loaded successfully');