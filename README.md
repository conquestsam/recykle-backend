# Recykle-Naija Backend API

A comprehensive Node.js backend service for Recykle-Naija, Nigeria's leading waste management and recycling platform. This API powers a gamified, location-based mobile application that connects households with verified waste pickers and recycling companies.

## 🌟 Features

### Core Functionality
- **Multi-role Authentication System** - Households, Waste Pickers, Recycling Companies, Admins, Government
- **Location-based Pickup Scheduling** - GPS integration with smart routing
- **Gamified Rewards System** - Points earning and redemption (airtime, data, vouchers, cash)
- **Real-time Notifications** - Email, SMS, and push notifications
- **Payment Processing** - Integrated with Paystack for secure transactions
- **Analytics Dashboard** - Comprehensive reporting and data insights
- **Environmental Impact Tracking** - CO2 savings and waste collection metrics

### Advanced Features
- **Route Optimization** - Smart routing for waste pickers
- **Real-time Tracking** - WebSocket integration for live updates
- **Automated Email System** - Template-based email notifications
- **Scheduled Tasks** - Automated analytics and cleanup jobs
- **File Upload Support** - Cloudinary integration for images
- **Rate Limiting** - API protection and security
- **Comprehensive Logging** - Winston-based logging system

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database (Neon recommended)
- Email service (Gmail SMTP)
- Paystack account for payments
- Cloudinary account for file uploads

### Installation

1. **Clone and install dependencies**
```bash
git clone <repository-url>
cd recykle-naija-backend
npm install
```

2. **Environment Setup**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Database Setup**
```bash
# Push schema to database
npm run migrate

# Seed with sample data
npm run seed
```

4. **Start Development Server**
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## 📋 API Endpoints

### Authentication Endpoints
| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| POST | `/api/auth/register` | Register new user | Public |
| POST | `/api/auth/login` | User login | Public |
| POST | `/api/auth/verify-email` | Verify email address | Public |
| POST | `/api/auth/verify-phone` | Verify phone number | Private |
| POST | `/api/auth/forgot-password` | Request password reset | Public |
| POST | `/api/auth/reset-password` | Reset password | Public |
| POST | `/api/auth/change-password` | Change password | Private |
| GET | `/api/auth/profile` | Get user profile | Private |
| POST | `/api/auth/refresh-token` | Refresh JWT token | Private |

### User Management Endpoints
| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| PUT | `/api/users/profile` | Update user profile | Private |
| PUT | `/api/users/waste-picker-profile` | Update waste picker profile | Private (Waste Picker) |
| PUT | `/api/users/recycling-company-profile` | Update company profile | Private (Company) |
| GET | `/api/users/profile/:id?` | Get full user profile | Private |
| GET | `/api/users` | Get all users | Private (Admin) |
| PUT | `/api/users/:id/status` | Update user status | Private (Admin) |
| DELETE | `/api/users/account` | Delete user account | Private |
| GET | `/api/users/stats/:id?` | Get user statistics | Private |

### Pickup Management Endpoints
| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| POST | `/api/pickups` | Create pickup request | Private (Household) |
| GET | `/api/pickups` | Get pickup requests | Private |
| GET | `/api/pickups/nearby` | Get nearby pickups | Private (Waste Picker) |
| GET | `/api/pickups/stats` | Get pickup statistics | Private |
| GET | `/api/pickups/:id` | Get single pickup | Private |
| PUT | `/api/pickups/:id/accept` | Accept pickup request | Private (Waste Picker) |
| PUT | `/api/pickups/:id/status` | Update pickup status | Private |
| PUT | `/api/pickups/:id/cancel` | Cancel pickup request | Private |

### Rewards System Endpoints
| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/api/rewards` | Get available rewards | Private |
| GET | `/api/rewards/:id` | Get single reward | Private |
| POST | `/api/rewards/redeem` | Redeem reward | Private |
| GET | `/api/rewards/redemptions/my` | Get user redemptions | Private |
| GET | `/api/rewards/redemptions/:id` | Get redemption details | Private |
| PUT | `/api/rewards/redemptions/:id/status` | Update redemption status | Private (Admin) |
| POST | `/api/rewards` | Create reward | Private (Admin) |
| PUT | `/api/rewards/:id` | Update reward | Private (Admin) |
| DELETE | `/api/rewards/:id` | Delete reward | Private (Admin) |
| GET | `/api/rewards/stats` | Get reward statistics | Private (Admin) |

### Analytics Endpoints
| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/api/analytics/dashboard` | Dashboard overview | Private (Admin/Gov) |
| GET | `/api/analytics/pickups` | Pickup analytics | Private (Admin/Gov) |
| GET | `/api/analytics/users` | User analytics | Private (Admin/Gov) |
| GET | `/api/analytics/financial` | Financial analytics | Private (Admin) |
| GET | `/api/analytics/environmental-impact` | Environmental impact | Private (Admin/Gov) |
| GET | `/api/analytics/export` | Export analytics data | Private (Admin/Gov) |

### Notification Endpoints
| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/api/notifications` | Get user notifications | Private |
| GET | `/api/notifications/stats` | Get notification stats | Private |
| GET | `/api/notifications/:id` | Get single notification | Private |
| PUT | `/api/notifications/:id/read` | Mark as read | Private |
| PUT | `/api/notifications/read-all` | Mark all as read | Private |
| DELETE | `/api/notifications/:id` | Delete notification | Private |
| DELETE | `/api/notifications` | Delete all notifications | Private |
| POST | `/api/notifications/test` | Send test notification | Private (Admin) |
| POST | `/api/notifications/broadcast` | Broadcast notification | Private (Admin) |

### Payment Endpoints
| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| POST | `/api/payments/initialize` | Initialize payment | Private |
| POST | `/api/payments/verify` | Verify payment | Private |
| GET | `/api/payments/banks` | Get bank list | Private |
| POST | `/api/payments/resolve-account` | Resolve bank account | Private |
| POST | `/api/payments/transfer` | Initiate transfer | Private (Admin) |
| GET | `/api/payments/transactions` | Get user transactions | Private |
| GET | `/api/payments/transactions/:id` | Get single transaction | Private |

## 🔧 Configuration

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# JWT
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# Server
PORT=3000
NODE_ENV=development

# Email Service
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@recykle-naija.com

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Paystack
PAYSTACK_SECRET_KEY=sk_test_your-paystack-secret-key
PAYSTACK_PUBLIC_KEY=pk_test_your-paystack-public-key

# SMS Service (Termii)
TERMII_API_KEY=your-termii-api-key
TERMII_SENDER_ID=RecykleNG

# External APIs
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# App URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3000
```

## 📊 Database Schema

The application uses PostgreSQL with Drizzle ORM. Key tables include:

- **users** - User accounts and profiles
- **waste_picker_profiles** - Waste picker specific data
- **recycling_company_profiles** - Company specific data
- **pickup_requests** - Waste pickup requests
- **transactions** - Financial transactions
- **rewards** - Available rewards
- **reward_redemptions** - Reward redemption records
- **notifications** - User notifications
- **analytics_data** - Aggregated analytics data

## 🔐 Authentication & Authorization

- **JWT-based authentication** with refresh tokens
- **Role-based access control** (RBAC)
- **Email and phone verification** required
- **Password reset** functionality
- **Account status management** (active, suspended, pending)

## 📧 Email System

Automated email notifications for:
- Welcome and verification emails
- Pickup request confirmations
- Pickup status updates
- Reward redemptions
- Payment confirmations
- Weekly summary reports
- Password reset requests

## 💳 Payment Integration

- **Paystack integration** for secure payments
- **Bank account verification**
- **Transfer management** for waste picker payments
- **Transaction tracking** and reporting
- **Multiple payment methods** support

## 📱 Real-time Features

- **WebSocket integration** for live updates
- **Location tracking** for waste pickers
- **Pickup status updates** in real-time
- **Notification delivery** via Socket.IO

## 🔄 Scheduled Tasks

- **Daily analytics aggregation** (midnight)
- **Weekly summary emails** (Sunday 9 AM)
- **Notification cleanup** (daily 2 AM)
- **Data archiving** and maintenance

## 🧪 Testing with Postman

### Sample Test Accounts
```
Admin: admin@recykle-naija.com / admin123456
Waste Picker: picker@recykle-naija.com / picker123456
Household: household@recykle-naija.com / household123456
Company: company@recykle-naija.com / company123456
```

### Testing Workflow
1. **Register/Login** to get JWT token
2. **Verify email** using verification endpoint
3. **Create pickup request** (household user)
4. **Accept pickup** (waste picker user)
5. **Complete pickup** and earn points
6. **Redeem rewards** with earned points
7. **View analytics** (admin user)

## 🚀 Deployment

### Production Setup
1. Set up Neon PostgreSQL database
2. Configure environment variables
3. Deploy to your preferred platform (Railway, Render, etc.)
4. Set up domain and SSL
5. Configure monitoring and logging

### Health Checks
- `GET /health` - Basic health check
- `GET /api` - API documentation endpoint

## 📈 Monitoring & Logging

- **Winston logging** with file rotation
- **Error tracking** and reporting
- **Performance monitoring**
- **Database query logging**
- **API request logging**

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Email: support@recykle-naija.com
- Phone: +234-800-RECYKLE
- Documentation: [API Docs](http://localhost:3000/api)

## 🌍 Environmental Impact

This platform contributes to:
- **Waste reduction** and proper disposal
- **CO2 emissions reduction** through recycling
- **Job creation** for waste pickers
- **Environmental awareness** in communities
- **Data-driven policy making** for governments

---

**Built with ❤️ for a cleaner Nigeria** 🇳🇬