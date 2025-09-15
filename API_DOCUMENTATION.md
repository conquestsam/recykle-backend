# Recykle-Naija API Documentation

Complete API documentation for the Recykle-Naija waste management platform backend service.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
4. [Error Handling](#error-handling)
5. [Rate Limiting](#rate-limiting)
6. [WebSocket Events](#websocket-events)
7. [Cron Jobs](#cron-jobs)

## 🌟 Overview

The Recykle-Naija API is a RESTful service built with Node.js, Express, and PostgreSQL. It provides comprehensive waste management functionality including user management, pickup scheduling, rewards system, and analytics.

**Base URL:** `https://your-app.onrender.com/api`

**API Version:** v1.0.0

**Content Type:** `application/json`

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```http
Authorization: Bearer <your_jwt_token>
```

### User Roles
- **household**: Regular users who request pickups
- **waste_picker**: Service providers who collect waste
- **recycling_company**: Companies that process waste
- **admin**: System administrators
- **government**: Government officials with analytics access

## 📚 API Endpoints

### 🔑 Authentication Endpoints

#### Register User
```http
POST /api/auth/register
```

**Description:** Register a new user account

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+2348123456789",
  "role": "household",
  "address": "123 Street, Lagos",
  "city": "Lagos",
  "state": "Lagos",
  "latitude": "6.5244",
  "longitude": "3.3792"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "household",
      "status": "pending_verification"
    },
    "token": "jwt_token"
  }
}
```

#### Login User
```http
POST /api/auth/login
```

**Description:** Authenticate user and receive JWT token

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "household",
      "status": "active"
    },
    "token": "jwt_token"
  }
}
```

#### Verify Email
```http
POST /api/auth/verify-email
```

**Description:** Verify user email address

**Request Body:**
```json
{
  "token": "email_verification_token"
}
```

#### Forgot Password
```http
POST /api/auth/forgot-password
```

**Description:** Request password reset email

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

#### Reset Password
```http
POST /api/auth/reset-password
```

**Description:** Reset password using token from email

**Request Body:**
```json
{
  "token": "reset_token",
  "password": "newpassword123"
}
```

### 👥 User Management Endpoints

#### Get All Users (Admin Only)
```http
GET /api/users?page=1&limit=20&role=household&status=active&search=john
```

**Description:** Retrieve paginated list of users with filtering

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `role` (optional): Filter by user role
- `status` (optional): Filter by user status
- `search` (optional): Search by name or email

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "household",
      "status": "active",
      "totalPoints": 150,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

#### Create User (Admin Only)
```http
POST /api/users
```

**Description:** Create new user account (admin only)

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "waste_picker",
  "phone": "+2348987654321"
}
```

#### Update User Profile
```http
PUT /api/users/profile
```

**Description:** Update current user's profile

**Request Body:**
```json
{
  "firstName": "Updated John",
  "lastName": "Updated Doe",
  "phone": "+2348111111111",
  "address": "456 Updated Street"
}
```

#### Search Waste Pickers
```http
GET /api/users/search/waste-pickers?latitude=6.5244&longitude=3.3792&radius=10&specialization=plastic&isVerified=true
```

**Description:** Find waste pickers by location and specialization

**Query Parameters:**
- `latitude` (required): Latitude coordinate
- `longitude` (required): Longitude coordinate
- `radius` (optional): Search radius in km (default: 10)
- `specialization` (optional): Waste type specialization
- `isVerified` (optional): Filter verified pickers only

#### Upload Avatar
```http
POST /api/users/upload-avatar
```

**Description:** Upload user profile picture

**Request:** Multipart form data with `avatar` file field

**Response (200):**
```json
{
  "success": true,
  "message": "Avatar uploaded successfully",
  "data": {
    "avatar": "https://cloudinary.com/image.jpg"
  }
}
```

### 🗑️ Pickup Management Endpoints

#### Create Pickup Request
```http
POST /api/pickups
```

**Description:** Create new waste pickup request (household only)

**Request Body:**
```json
{
  "wasteType": "plastic",
  "estimatedWeight": 5.5,
  "description": "Mixed plastic bottles",
  "pickupAddress": "123 Test Street, Lagos",
  "pickupLatitude": "6.5244",
  "pickupLongitude": "3.3792",
  "preferredDate": "2024-01-15T10:00:00Z",
  "preferredTimeSlot": "morning",
  "images": ["https://example.com/image1.jpg"]
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Pickup request created successfully",
  "data": {
    "id": "uuid",
    "wasteType": "plastic",
    "estimatedWeight": 5.5,
    "status": "pending",
    "pickupAddress": "123 Test Street, Lagos",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

#### Get Pickup Requests
```http
GET /api/pickups?page=1&limit=20&status=pending&wasteType=plastic
```

**Description:** Get pickup requests (filtered by user role)

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `status` (optional): Filter by status
- `wasteType` (optional): Filter by waste type
- `userId` (optional): Filter by user ID (admin only)

#### Accept Pickup Request (Waste Picker Only)
```http
PUT /api/pickups/{id}/accept
```

**Description:** Accept a pending pickup request

**Response (200):**
```json
{
  "success": true,
  "message": "Pickup request accepted successfully",
  "data": {
    "id": "uuid",
    "status": "accepted",
    "wastePickerId": "picker_uuid",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

#### Update Pickup Status
```http
PUT /api/pickups/{id}/status
```

**Description:** Update pickup request status

**Request Body:**
```json
{
  "status": "completed",
  "actualWeight": 6.2,
  "rating": 5,
  "feedback": "Excellent service!"
}
```

#### Get Nearby Pickups (Waste Picker Only)
```http
GET /api/pickups/nearby?latitude=6.5244&longitude=3.3792&radius=10
```

**Description:** Find pending pickups near waste picker's location

### 🎁 Rewards System Endpoints

#### Get Available Rewards
```http
GET /api/rewards?page=1&limit=20&type=airtime&isActive=true
```

**Description:** Get list of available rewards

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `type` (optional): Filter by reward type
- `isActive` (optional): Filter active rewards only

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "MTN Airtime ₦100",
      "description": "Get ₦100 MTN airtime credit",
      "type": "airtime",
      "pointsCost": 100,
      "value": "100.00",
      "provider": "MTN",
      "stockQuantity": 1000,
      "isActive": true
    }
  ]
}
```

#### Redeem Reward
```http
POST /api/rewards/redeem
```

**Description:** Redeem reward using points

**Request Body:**
```json
{
  "rewardId": "reward_uuid",
  "deliveryInfo": {
    "phoneNumber": "+2348123456789",
    "address": "123 Street, Lagos"
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Reward redeemed successfully",
  "data": {
    "redemption": {
      "id": "uuid",
      "rewardId": "reward_uuid",
      "pointsUsed": 100,
      "status": "pending"
    },
    "redemptionCode": "RN1234567890"
  }
}
```

#### Get User Redemptions
```http
GET /api/rewards/redemptions/my?page=1&limit=10&status=completed
```

**Description:** Get current user's reward redemptions

### 📊 Analytics Endpoints

#### Dashboard Overview
```http
GET /api/analytics/dashboard?period=30d
```

**Description:** Get dashboard analytics overview (admin/government only)

**Query Parameters:**
- `period` (optional): Time period (7d, 30d, 90d, 1y)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "period": "30d",
    "dateRange": {
      "startDate": "2024-01-01T00:00:00Z",
      "endDate": "2024-01-31T23:59:59Z"
    },
    "pickups": {
      "totalPickups": 150,
      "completedPickups": 120,
      "pendingPickups": 20,
      "totalWasteCollected": 500.5,
      "totalPointsAwarded": 5000
    },
    "users": {
      "totalUsers": 500,
      "activeUsers": 450,
      "newRegistrations": 50
    }
  }
}
```

#### Environmental Impact
```http
GET /api/analytics/environmental-impact?startDate=2024-01-01&endDate=2024-01-31
```

**Description:** Get environmental impact metrics

**Response (200):**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalWasteCollected": 1000.5,
      "totalPickups": 200,
      "estimatedCo2Saved": 500.25,
      "treesEquivalent": 23
    },
    "locationImpact": [
      {
        "city": "Lagos",
        "state": "Lagos",
        "totalWaste": 800.0,
        "totalPickups": 160
      }
    ]
  }
}
```

### 🔔 Notification Endpoints

#### Get User Notifications
```http
GET /api/notifications?page=1&limit=20&isRead=false&type=pickup_request
```

**Description:** Get user's notifications

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `isRead` (optional): Filter by read status
- `type` (optional): Filter by notification type

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "pickup_request",
      "title": "Pickup Request Created",
      "message": "Your pickup request has been created",
      "isRead": false,
      "createdAt": "2024-01-01T00:00:00Z",
      "data": {
        "pickupRequestId": "pickup_uuid"
      }
    }
  ],
  "unreadCount": 5
}
```

#### Mark Notification as Read
```http
PUT /api/notifications/{id}/read
```

**Description:** Mark specific notification as read

#### Broadcast Notification (Admin Only)
```http
POST /api/notifications/broadcast
```

**Description:** Send notification to multiple users

**Request Body:**
```json
{
  "type": "system_update",
  "title": "System Maintenance",
  "message": "System will be under maintenance",
  "userRole": "household"
}
```

### 💳 Payment Endpoints

#### Initialize Payment
```http
POST /api/payments/initialize
```

**Description:** Initialize payment with Paystack

**Request Body:**
```json
{
  "amount": "1000.00",
  "description": "Premium subscription",
  "metadata": {
    "subscriptionType": "premium"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Payment initialized successfully",
  "data": {
    "transaction": {
      "id": "uuid",
      "amount": "1000.00",
      "status": "pending"
    },
    "paymentUrl": "https://checkout.paystack.com/...",
    "reference": "payment_reference"
  }
}
```

#### Verify Payment
```http
POST /api/payments/verify
```

**Description:** Verify payment status

**Request Body:**
```json
{
  "reference": "payment_reference"
}
```

### ⚙️ System Endpoints

#### Health Check
```http
GET /api/system/health
```

**Description:** Check system health status

**Response (200):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00Z",
    "uptime": 3600,
    "memory": {
      "rss": 50000000,
      "heapTotal": 30000000,
      "heapUsed": 20000000
    },
    "environment": "production",
    "version": "1.0.0"
  }
}
```

#### Get System Settings
```http
GET /api/system/settings
```

**Description:** Get public system settings

**Response (200):**
```json
{
  "success": true,
  "data": {
    "points_per_kg": 10,
    "min_pickup_weight": 0.5,
    "max_pickup_radius": 50,
    "supported_waste_types": ["plastic", "paper", "metal", "glass"],
    "contact_email": "support@recykle-naija.com"
  }
}
```

## ❌ Error Handling

All API endpoints return consistent error responses:

### Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message",
  "errors": [
    {
      "field": "email",
      "message": "Valid email required"
    }
  ]
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

### Common Error Scenarios

#### Authentication Errors
```json
{
  "success": false,
  "message": "Access token required"
}
```

#### Validation Errors
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Valid email required"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters"
    }
  ]
}
```

#### Permission Errors
```json
{
  "success": false,
  "message": "Insufficient permissions"
}
```

## 🚦 Rate Limiting

The API implements rate limiting to prevent abuse:

- **Window:** 15 minutes
- **Limit:** 100 requests per IP
- **Headers:** Rate limit info in response headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## 🔌 WebSocket Events

Real-time features using Socket.IO:

### Connection
```javascript
const socket = io('https://your-app.onrender.com');

// Join user room for notifications
socket.emit('join', userId);
```

### Events

#### Location Updates (Waste Pickers)
```javascript
// Send location update
socket.emit('location_update', {
  userId: 'picker_id',
  latitude: 6.5244,
  longitude: 3.3792
});

// Receive location updates
socket.on('waste_picker_location', (data) => {
  console.log('Picker location:', data);
});
```

#### Pickup Status Updates
```javascript
// Send status update
socket.emit('pickup_status_update', {
  pickupId: 'pickup_id',
  status: 'completed',
  userId: 'user_id'
});

// Receive status updates
socket.on('pickup_status_changed', (data) => {
  console.log('Pickup status:', data);
});
```

## ⏰ Cron Jobs

Automated background tasks:

### Daily Analytics (00:00)
- Aggregates previous day's data
- Stores in analytics_data table
- Calculates waste collection metrics

### Weekly Summary Emails (Sunday 09:00)
- Sends summary to active users
- Includes pickup stats and points earned
- Only sent if user had activity

### Notification Cleanup (02:00)
- Removes notifications older than 30 days
- Keeps system performance optimal

### Reward Stock Updates (Every hour)
- Checks reward inventory
- Deactivates expired rewards
- Logs low stock warnings

### Pickup Reminders (Every 30 minutes)
- Finds upcoming pickups
- Sends reminder notifications
- Includes SMS for verified users

### Monthly Reports (1st of month, 06:00)
- Generates comprehensive reports
- Sends to admin users
- Includes environmental impact data

### Database Backup (03:00)
- Creates daily backups
- Stores essential data
- Maintains data integrity

### Token Cleanup (04:00)
- Removes expired password reset tokens
- Cleans up verification tokens
- Maintains security

## 📝 Additional Notes

### Pagination
Most list endpoints support pagination:
```http
GET /api/endpoint?page=1&limit=20
```

### Filtering
Many endpoints support filtering:
```http
GET /api/pickups?status=pending&wasteType=plastic
```

### Sorting
Some endpoints support sorting:
```http
GET /api/users?sort=createdAt&order=desc
```

### File Uploads
File uploads use multipart/form-data:
- Maximum file size: 5MB
- Supported formats: Images only
- Storage: Cloudinary CDN

### Geolocation
Location-based features use:
- Latitude/longitude coordinates
- Distance calculations in kilometers
- Radius-based searches

---

**API Version:** 1.0.0  
**Last Updated:** January 2024  
**Support:** support@recykle-naija.com