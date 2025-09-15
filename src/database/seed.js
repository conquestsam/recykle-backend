import db from './connection.js';
import { 
  users, 
  rewards, 
  systemSettings, 
  emailTemplates,
  wastePickerProfiles,
  recyclingCompanyProfiles 
} from './schema.js';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger.js';

async function seedDatabase() {
  try {
    logger.info('Starting database seeding...');

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123456', 12);
    const adminUser = await db
      .insert(users)
      .values({
        email: 'admin@recykle-naija.com',
        password: adminPassword,
        firstName: 'System',
        lastName: 'Administrator',
        role: 'admin',
        status: 'active',
        isEmailVerified: true,
        phone: '+2348000000000',
        isPhoneVerified: true,
        city: 'Lagos',
        state: 'Lagos',
        country: 'Nigeria'
      })
      .onConflictDoNothing()
      .returning();

    // Create sample waste picker
    const wastePickerPassword = await bcrypt.hash('picker123456', 12);
    const wastePicker = await db
      .insert(users)
      .values({
        email: 'picker@recykle-naija.com',
        password: wastePickerPassword,
        firstName: 'John',
        lastName: 'Collector',
        role: 'waste_picker',
        status: 'active',
        isEmailVerified: true,
        phone: '+2348111111111',
        isPhoneVerified: true,
        address: '123 Collection Street, Ikeja',
        city: 'Lagos',
        state: 'Lagos',
        country: 'Nigeria',
        latitude: '6.5954',
        longitude: '3.3364'
      })
      .onConflictDoNothing()
      .returning();

    // Create waste picker profile
    if (wastePicker.length > 0) {
      await db
        .insert(wastePickerProfiles)
        .values({
          userId: wastePicker[0].id,
          vehicleType: 'Motorcycle',
          vehicleNumber: 'LAG-123-ABC',
          serviceRadius: 15,
          specializations: ['plastic', 'paper', 'metal'],
          isVerified: true,
          workingHours: {
            monday: { start: '08:00', end: '18:00' },
            tuesday: { start: '08:00', end: '18:00' },
            wednesday: { start: '08:00', end: '18:00' },
            thursday: { start: '08:00', end: '18:00' },
            friday: { start: '08:00', end: '18:00' },
            saturday: { start: '09:00', end: '15:00' },
            sunday: { closed: true }
          },
          bankAccountName: 'John Collector',
          bankAccountNumber: '1234567890',
          bankName: 'First Bank'
        })
        .onConflictDoNothing();
    }

    // Create sample household user
    const householdPassword = await bcrypt.hash('household123456', 12);
    await db
      .insert(users)
      .values({
        email: 'household@recykle-naija.com',
        password: householdPassword,
        firstName: 'Jane',
        lastName: 'Homeowner',
        role: 'household',
        status: 'active',
        isEmailVerified: true,
        phone: '+2348222222222',
        isPhoneVerified: true,
        address: '456 Residential Avenue, Victoria Island',
        city: 'Lagos',
        state: 'Lagos',
        country: 'Nigeria',
        latitude: '6.4281',
        longitude: '3.4219',
        totalPoints: 500,
        availablePoints: 350
      })
      .onConflictDoNothing();

    // Create sample recycling company
    const companyPassword = await bcrypt.hash('company123456', 12);
    const recyclingCompany = await db
      .insert(users)
      .values({
        email: 'company@recykle-naija.com',
        password: companyPassword,
        firstName: 'Green',
        lastName: 'Recycling',
        role: 'recycling_company',
        status: 'active',
        isEmailVerified: true,
        phone: '+2348333333333',
        isPhoneVerified: true,
        address: '789 Industrial Estate, Ikeja',
        city: 'Lagos',
        state: 'Lagos',
        country: 'Nigeria',
        latitude: '6.5833',
        longitude: '3.3500'
      })
      .onConflictDoNothing()
      .returning();

    // Create recycling company profile
    if (recyclingCompany.length > 0) {
      await db
        .insert(recyclingCompanyProfiles)
        .values({
          userId: recyclingCompany[0].id,
          companyName: 'Green Recycling Ltd',
          registrationNumber: 'RC123456',
          website: 'https://greenrecycling.ng',
          description: 'Leading recycling company in Lagos, specializing in plastic and paper waste processing.',
          acceptedWasteTypes: ['plastic', 'paper', 'metal', 'glass'],
          processingCapacity: 1000, // tons per month
          isVerified: true,
          operatingHours: {
            monday: { start: '07:00', end: '19:00' },
            tuesday: { start: '07:00', end: '19:00' },
            wednesday: { start: '07:00', end: '19:00' },
            thursday: { start: '07:00', end: '19:00' },
            friday: { start: '07:00', end: '19:00' },
            saturday: { start: '08:00', end: '16:00' },
            sunday: { closed: true }
          },
          certifications: ['ISO 14001', 'NESREA Certified']
        })
        .onConflictDoNothing();
    }

    // Create sample rewards
    const sampleRewards = [
      {
        name: 'MTN Airtime ₦100',
        description: 'Get ₦100 MTN airtime credit',
        type: 'airtime',
        pointsCost: 100,
        value: '100.00',
        provider: 'MTN',
        stockQuantity: 1000,
        termsAndConditions: 'Airtime will be credited within 24 hours'
      },
      {
        name: 'GLO Data 1GB',
        description: 'Get 1GB GLO data bundle',
        type: 'data',
        pointsCost: 150,
        value: '200.00',
        provider: 'GLO',
        stockQuantity: 500,
        termsAndConditions: 'Data will be credited within 24 hours'
      },
      {
        name: 'Shoprite Voucher ₦500',
        description: '₦500 shopping voucher for Shoprite',
        type: 'voucher',
        pointsCost: 500,
        value: '500.00',
        provider: 'Shoprite',
        stockQuantity: 100,
        termsAndConditions: 'Valid for 30 days from redemption date'
      },
      {
        name: 'Cash Reward ₦1000',
        description: 'Direct cash transfer to your bank account',
        type: 'cash',
        pointsCost: 1000,
        value: '1000.00',
        provider: 'Recykle-Naija',
        stockQuantity: 50,
        termsAndConditions: 'Transfer will be processed within 3-5 business days'
      },
      {
        name: 'Eco-Friendly Water Bottle',
        description: 'Reusable stainless steel water bottle',
        type: 'voucher',
        pointsCost: 300,
        value: '250.00',
        provider: 'EcoStore',
        stockQuantity: 200,
        termsAndConditions: 'Delivery within Lagos only'
      }
    ];

    for (const reward of sampleRewards) {
      await db
        .insert(rewards)
        .values(reward)
        .onConflictDoNothing();
    }

    // Create system settings
    const systemSettingsData = [
      {
        key: 'points_per_kg',
        value: '10',
        description: 'Points awarded per kilogram of waste collected',
        type: 'number',
        isPublic: true
      },
      {
        key: 'min_pickup_weight',
        value: '0.5',
        description: 'Minimum weight (kg) required for pickup',
        type: 'number',
        isPublic: true
      },
      {
        key: 'max_pickup_radius',
        value: '50',
        description: 'Maximum radius (km) for pickup requests',
        type: 'number',
        isPublic: true
      },
      {
        key: 'commission_rate',
        value: '0.05',
        description: 'Commission rate for transactions',
        type: 'number',
        isPublic: false
      },
      {
        key: 'app_version',
        value: '1.0.0',
        description: 'Current app version',
        type: 'string',
        isPublic: true
      },
      {
        key: 'maintenance_mode',
        value: 'false',
        description: 'Enable/disable maintenance mode',
        type: 'boolean',
        isPublic: true
      },
      {
        key: 'supported_waste_types',
        value: JSON.stringify(['plastic', 'paper', 'metal', 'glass', 'electronics', 'organic']),
        description: 'List of supported waste types',
        type: 'json',
        isPublic: true
      },
      {
        key: 'contact_email',
        value: 'support@recykle-naija.com',
        description: 'Support contact email',
        type: 'string',
        isPublic: true
      },
      {
        key: 'contact_phone',
        value: '+234-800-RECYKLE',
        description: 'Support contact phone',
        type: 'string',
        isPublic: true
      }
    ];

    for (const setting of systemSettingsData) {
      await db
        .insert(systemSettings)
        .values(setting)
        .onConflictDoUpdate({
          target: systemSettings.key,
          set: {
            value: setting.value,
            updatedAt: new Date()
          }
        });
    }

    logger.info('Database seeding completed successfully!');
    logger.info('Sample accounts created:');
    logger.info('- Admin: admin@recykle-naija.com / admin123456');
    logger.info('- Waste Picker: picker@recykle-naija.com / picker123456');
    logger.info('- Household: household@recykle-naija.com / household123456');
    logger.info('- Recycling Company: company@recykle-naija.com / company123456');

  } catch (error) {
    logger.error('Database seeding failed:', error);
    throw error;
  }
}

// Run seeding if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => {
      logger.info('Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Seeding failed:', error);
      process.exit(1);
    });
}

export default seedDatabase;