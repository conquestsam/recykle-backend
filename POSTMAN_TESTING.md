# Postman Testing Guide for Recykle-Naija API

This comprehensive guide covers testing all API endpoints using Postman with detailed examples and expected responses.

## 🚀 Getting Started

### 1. Import Postman Collection
Create a new Postman collection named "Recykle-Naija API" and set up the following:

**Base URL Variable:**
- Variable: `base_url`
- Value: `http://localhost:3000` (development) or `https://your-app.onrender.com` (production)

**Authentication Token Variable:**
- Variable: `auth_token`
- Value: Will be set after login

### 2. Environment Setup
Create environments for:
- **Development**: `http://localhost:3000`
- **Production**: `https://your-app.onrender.com`

## 📋 Complete API Endpoints Testing

### 🔐 Authentication Endpoints

#### 1. Register User
```http
POST {{base_url}}/api/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+2348123456789",
  "role": "household",
  "address": "123 Test Street, Lagos",
  "city": "Lagos",
  "state": "Lagos",
  "latitude": "6.5244",
  "longitude": "3.3792"
}
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "test@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "household",
      "status": "pending_verification"
    },
    "token": "jwt_token_here"
  }
}
```

#### 2. Login User
```http
POST {{base_url}}/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```

**Test Script (Add to Tests tab):**
```javascript
if (pm.response.code === 200) {
    const response = pm.response.json();
    pm.environment.set("auth_token", response.data.token);
    pm.test("Login successful", function () {
        pm.expect(response.success).to.be.true;
        pm.expect(response.data.token).to.exist;
    });
}
```

#### 3. Verify Email
```http
POST {{base_url}}/api/auth/verify-email
Content-Type: application/json

{
  "token": "email_verification_token_from_email"
}
```

#### 4. Get Profile
```http
GET {{base_url}}/api/auth/profile
Authorization: Bearer {{auth_token}}
```

#### 5. Change Password
```http
POST {{base_url}}/api/auth/change-password
Authorization: Bearer {{auth_token}}
Content-Type: application/json

{
  "currentPassword": "password123",
  "newPassword": "newpassword123"
}
```

### 👥 User Management Endpoints

#### 1. Get All Users (Admin Only)
```http
GET {{base_url}}/api/users?page=1&limit=10&role=household
Authorization: Bearer {{auth_token}}
```

#### 2. Create User (Admin Only)
```http
POST {{base_url}}/api/users
Authorization: Bearer {{auth_token}}
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "password123",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "waste_picker",
  "phone": "+2348987654321",
  "city": "Lagos",
  "state": "Lagos"
}
```

#### 3. Get User by ID
```http
GET {{base_url}}/api/users/{{user_id}}
Authorization: Bearer {{auth_token}}
```

#### 4. Update User Profile
```http
PUT {{base_url}}/api/users/profile
Authorization: Bearer {{auth_token}}
Content-Type: application/json

{
  "firstName": "Updated John",
  "lastName": "Updated Doe",
  "phone": "+2348111111111",
  "address": "456 Updated Street, Lagos"
}
```

#### 5. Update Waste Picker Profile
```http
PUT {{base_url}}/api/users/waste-picker-profile
Authorization: Bearer {{auth_token}}
Content-Type: application/json

{
  "vehicleType": "Motorcycle",
  "vehicleNumber": "LAG-123-ABC",
  "serviceRadius": 15,
  "specializations": ["plastic", "paper", "metal"],
  "workingHours": {
    "monday": {"start": "08:00", "end": "18:00"},
    "tuesday": {"start": "08:00", "end": "18:00"}
  },
  "bankAccountName": "John Doe",
  "bankAccountNumber": "1234567890",
  "bankName": "First Bank"
}
```

#### 6. Search Waste Pickers
```http
GET {{base_url}}/api/users/search/waste-pickers?latitude=6.5244&longitude=3.3792&radius=10&specialization=plastic&isVerified=true
Authorization: Bearer {{auth_token}}
```

#### 7. Upload Avatar
```http
POST {{base_url}}/api/users/upload-avatar
Authorization: Bearer {{auth_token}}
Content-Type: multipart/form-data

# Add file in Body > form-data
# Key: avatar (File type)
# Value: Select image file
```

#### 8. Get Leaderboard
```http
GET {{base_url}}/api/users/leaderboard?limit=10
Authorization: Bearer {{auth_token}}
```

### 🗑️ Pickup Management Endpoints

#### 1. Create Pickup Request
```http
POST {{base_url}}/api/pickups
Authorization: Bearer {{auth_token}}
Content-Type: application/json

{
  "wasteType": "plastic",
  "estimatedWeight": 5.5,
  "description": "Mixed plastic bottles and containers",
  "pickupAddress": "123 Test Street, Lagos",
  "pickupLatitude": "6.5244",
  "pickupLongitude": "3.3792",
  "preferredDate": "2024-01-15T10:00:00Z",
  "preferredTimeSlot": "morning",
  "images": ["https://example.com/image1.jpg"]
}
```

#### 2. Get Pickup Requests
```http
GET {{base_url}}/api/pickups?page=1&limit=10&status=pending&wasteType=plastic
Authorization: Bearer {{auth_token}}
```

#### 3. Get Nearby Pickups (Waste Picker)
```http
GET {{base_url}}/api/pickups/nearby?latitude=6.5244&longitude=3.3792&radius=10
Authorization: Bearer {{auth_token}}
```

#### 4. Accept Pickup Request
```http
PUT {{base_url}}/api/pickups/{{pickup_id}}/accept
Authorization: Bearer {{auth_token}}
```

#### 5. Update Pickup Status
```http
PUT {{base_url}}/api/pickups/{{pickup_id}}/status
Authorization: Bearer {{auth_token}}
Content-Type: application/json

{
  "status": "completed",
  "actualWeight": 6.2,
  "rating": 5,
  "feedback": "Excellent service, very professional!"
}
```

#### 6. Get Pickup Statistics
```http
GET {{base_url}}/api/pickups/stats?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer {{auth_token}}
```

### 🎁 Rewards System Endpoints

#### 1. Get Available Rewards
```http
GET {{base_url}}/api/rewards?page=1&limit=10&type=airtime&isActive=true
Authorization: Bearer {{auth_token}}
```

#### 2. Get Single Reward
```http
GET {{base_url}}/api/rewards/{{reward_id}}
Authorization: Bearer {{auth_token}}
```

#### 3. Redeem Reward
```http
POST {{base_url}}/api/rewards/redeem
Authorization: Bearer {{auth_token}}
Content-Type: application/json

{
  "rewardId": "reward_uuid_here",
  "deliveryInfo": {
    "phoneNumber": "+2348123456789",
    "address": "123 Test Street, Lagos"
  }
}
```

#### 4. Get User Redemptions
```http
GET {{base_url}}/api/rewards/redemptions/my?page=1&limit=10&status=completed
Authorization: Bearer {{auth_token}}
```

#### 5. Create Reward (Admin Only)
```http
POST {{base_url}}/api/rewards
Authorization: Bearer {{auth_token}}
Content-Type: application/json

{
  "name": "MTN Airtime ₦500",
  "description": "Get ₦500 MTN airtime credit",
  "type": "airtime",
  "pointsCost": 500,
  "value": "500.00",
  "provider": "MTN",
  "stockQuantity": 100,
  "termsAndConditions": "Airtime will be credited within 24 hours"
}
```

### 📊 Analytics Endpoints

#### 1. Dashboard Overview
```http
GET {{base_url}}/api/analytics/dashboard?period=30d
Authorization: Bearer {{auth_token}}
```

#### 2. Pickup Analytics
```http
GET {{base_url}}/api/analytics/pickups?startDate=2024-01-01&endDate=2024-01-31&groupBy=day
Authorization: Bearer {{auth_token}}
```

#### 3. User Analytics
```http
GET {{base_url}}/api/analytics/users?startDate=2024-01-01&endDate=2024-01-31&groupBy=week
Authorization: Bearer {{auth_token}}
```

#### 4. Environmental Impact
```http
GET {{base_url}}/api/analytics/environmental-impact?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer {{auth_token}}
```

#### 5. Export Analytics
```http
GET {{base_url}}/api/analytics/export?type=pickups&format=json&startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer {{auth_token}}
```

### 🔔 Notification Endpoints

#### 1. Get User Notifications
```http
GET {{base_url}}/api/notifications?page=1&limit=20&isRead=false&type=pickup_request
Authorization: Bearer {{auth_token}}
```

#### 2. Mark Notification as Read
```http
PUT {{base_url}}/api/notifications/{{notification_id}}/read
Authorization: Bearer {{auth_token}}
```

#### 3. Mark All as Read
```http
PUT {{base_url}}/api/notifications/read-all
Authorization: Bearer {{auth_token}}
```

#### 4. Get Notification Stats
```http
GET {{base_url}}/api/notifications/stats
Authorization: Bearer {{auth_token}}
```

#### 5. Broadcast Notification (Admin)
```http
POST {{base_url}}/api/notifications/broadcast
Authorization: Bearer {{auth_token}}
Content-Type: application/json

{
  "type": "system_update",
  "title": "System Maintenance",
  "message": "The system will be under maintenance from 2 AM to 4 AM",
  "userRole": "household"
}
```

### 💳 Payment Endpoints

#### 1. Initialize Payment
```http
POST {{base_url}}/api/payments/initialize
Authorization: Bearer {{auth_token}}
Content-Type: application/json

{
  "amount": "1000.00",
  "description": "Premium subscription payment",
  "metadata": {
    "subscriptionType": "premium"
  }
}
```

#### 2. Verify Payment
```http
POST {{base_url}}/api/payments/verify
Authorization: Bearer {{auth_token}}
Content-Type: application/json

{
  "reference": "payment_reference_from_paystack"
}
```

#### 3. Get Banks
```http
GET {{base_url}}/api/payments/banks
Authorization: Bearer {{auth_token}}
```

#### 4. Resolve Bank Account
```http
POST {{base_url}}/api/payments/resolve-account
Authorization: Bearer {{auth_token}}
Content-Type: application/json

{
  "accountNumber": "1234567890",
  "bankCode": "044"
}
```

#### 5. Get User Transactions
```http
GET {{base_url}}/api/payments/transactions?page=1&limit=10&type=pickup_payment&status=completed
Authorization: Bearer {{auth_token}}
```

### ⚙️ System Endpoints

#### 1. Get System Settings
```http
GET {{base_url}}/api/system/settings
```

#### 2. Health Check
```http
GET {{base_url}}/api/system/health
```

#### 3. System Statistics (Admin)
```http
GET {{base_url}}/api/system/stats
Authorization: Bearer {{auth_token}}
```

#### 4. Create System Setting (Admin)
```http
POST {{base_url}}/api/system/settings
Authorization: Bearer {{auth_token}}
Content-Type: application/json

{
  "key": "max_pickup_distance",
  "value": "50",
  "description": "Maximum distance for pickup requests in kilometers",
  "type": "number",
  "isPublic": true
}
```

## 🧪 Testing Workflows

### Complete User Journey Test

1. **Registration Flow:**
   ```
   POST /api/auth/register → 
   POST /api/auth/verify-email → 
   POST /api/auth/login
   ```

2. **Pickup Flow:**
   ```
   POST /api/pickups → 
   PUT /api/pickups/{id}/accept → 
   PUT /api/pickups/{id}/status (completed)
   ```

3. **Rewards Flow:**
   ```
   GET /api/rewards → 
   POST /api/rewards/redeem → 
   GET /api/rewards/redemptions/my
   ```

### Test Scripts for Automation

Add these to your Postman Tests tab:

```javascript
// Generic success test
pm.test("Status code is 200 or 201", function () {
    pm.expect(pm.response.code).to.be.oneOf([200, 201]);
});

pm.test("Response has success property", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.be.true;
});

// Authentication test
pm.test("Token is present", function () {
    const jsonData = pm.response.json();
    if (jsonData.data && jsonData.data.token) {
        pm.environment.set("auth_token", jsonData.data.token);
    }
});

// Pagination test
pm.test("Pagination data is present", function () {
    const jsonData = pm.response.json();
    if (jsonData.pagination) {
        pm.expect(jsonData.pagination).to.have.property('page');
        pm.expect(jsonData.pagination).to.have.property('limit');
    }
});
```

## 🔍 Error Testing

Test error scenarios:

1. **Invalid Authentication:**
   ```http
   GET {{base_url}}/api/users/profile
   Authorization: Bearer invalid_token
   ```

2. **Validation Errors:**
   ```http
   POST {{base_url}}/api/auth/register
   {
     "email": "invalid-email",
     "password": "123"
   }
   ```

3. **Not Found:**
   ```http
   GET {{base_url}}/api/users/non-existent-id
   Authorization: Bearer {{auth_token}}
   ```

## 📝 Test Data

Use these test accounts (created by seeding):

```json
{
  "admin": {
    "email": "admin@recykle-naija.com",
    "password": "admin123456"
  },
  "wastePicker": {
    "email": "picker@recykle-naija.com",
    "password": "picker123456"
  },
  "household": {
    "email": "household@recykle-naija.com",
    "password": "household123456"
  },
  "company": {
    "email": "company@recykle-naija.com",
    "password": "company123456"
  }
}
```

## 🚀 Running Tests

1. **Manual Testing:** Run requests individually
2. **Collection Runner:** Run entire collection
3. **Newman CLI:** Automate with command line
4. **CI/CD Integration:** Include in deployment pipeline

---

**Happy Testing!** 🧪 This comprehensive guide covers all API endpoints with realistic test data and expected responses.