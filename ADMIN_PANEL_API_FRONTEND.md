# 🎛️ Admin Panel API - Frontend Integration Guide

## 📋 Overview

This document describes **NEW** Admin Panel APIs for analytics and subscription management. These endpoints provide comprehensive insights, statistics, and management capabilities for the admin dashboard.

**Base URL:** `/api/admin`  
**Authentication:** Required (JWT Token + Admin Role)  
**Headers:** `Authorization: Bearer <your-jwt-token>`

### ⚠️ Important Notes:

**Existing Endpoints (Not covered here, already available):**
- `GET /api/admin/users/:id` - Already returns user's subscription info (read-only)
- `GET /api/subscription/admin/limits` - Feature limits management (already exists)
- `PUT /api/subscription/admin/limits` - Update feature limits (already exists)

**New Endpoints (Covered in this document):**
- All analytics endpoints (`/api/admin/analytics/*`)
- Subscription management endpoints (`/api/admin/subscriptions/*`)

---

## 📊 Analytics APIs

### 1. Dashboard Analytics

**Endpoint:** `GET /api/admin/analytics/dashboard`

**Description:** Get overall system statistics, user growth, subscription breakdown, and feature usage summary.

**Query Parameters:**
- `period` (optional): `7d` | `30d` | `90d` | `1y` | `all` (default: `30d`)

**Response Example:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalUsers": 1250,
      "activeUsers": 1180,
      "newUsers": 45,
      "totalInterviews": 3200,
      "completedInterviews": 2850,
      "newInterviews": 120,
      "totalMemories": 8500,
      "totalVoices": 420,
      "totalAvatars": 380,
      "totalMultimedia": 12500,
      "totalSubscriptions": 850,
      "activeSubscriptions": 720,
      "newSubscriptions": 25
    },
    "subscriptions": {
      "total": 850,
      "active": 720,
      "byPlan": {
        "personal": { "total": 450, "active": 380 },
        "premium": { "total": 300, "active": 260 },
        "ultimate": { "total": 100, "active": 80 }
      },
      "growth": [
        { "date": "2025-01-01", "count": 2 },
        { "date": "2025-01-02", "count": 5 },
        { "date": "2025-01-03", "count": 3 }
      ]
    },
    "userGrowth": [
      { "date": "2025-01-01", "count": 10 },
      { "date": "2025-01-02", "count": 15 },
      { "date": "2025-01-03", "count": 8 }
    ],
    "featureUsage": {
      "voice_clones": {
        "totalUsage": 12500,
        "activeUsers": 420
      },
      "avatar_generations": {
        "totalUsage": 8500,
        "activeUsers": 380
      },
      "interview_sessions": {
        "totalUsage": 3200,
        "activeUsers": 800
      }
    },
    "period": "30d"
  }
}
```

**Frontend Usage:**
```javascript
// Fetch dashboard data
const response = await fetch('/api/admin/analytics/dashboard?period=30d', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const data = await response.json();

// Use userGrowth array for line chart
const userGrowthChartData = data.data.userGrowth;
// [{ date: "2025-01-01", count: 10 }, ...]

// Use subscription breakdown for pie chart
const subscriptionPieData = data.data.subscriptions.byPlan;
// { personal: { total: 450, active: 380 }, ... }
```

---

### 2. Package Analytics

**Endpoint:** `GET /api/admin/analytics/packages`

**Description:** Get detailed subscription/purchase analytics - see who bought which packages, purchase dates, and growth trends by plan.

**Query Parameters:**
- `period` (optional): `7d` | `30d` | `90d` | `1y` | `all` (default: `30d`)

**Response Example:**
```json
{
  "success": true,
  "data": {
    "subscriptions": {
      "personal": [
        {
          "id": "uuid-123",
          "userId": "user-uuid-456",
          "user": {
            "email": "user@example.com",
            "username": "johndoe",
            "name": "John Doe"
          },
          "status": "active",
          "planType": "personal",
          "createdAt": "2025-01-10T10:00:00Z",
          "currentPeriodStart": "2025-01-01T00:00:00Z",
          "currentPeriodEnd": "2025-02-01T00:00:00Z",
          "canceledAt": null,
          "cancelAtPeriodEnd": false
        }
      ],
      "premium": [...],
      "ultimate": [...]
    },
    "statistics": {
      "total": 850,
      "byPlan": {
        "personal": 450,
        "premium": 300,
        "ultimate": 100
      },
      "byStatus": {
        "active": 720,
        "inactive": 80,
        "canceled": 30,
        "trialing": 15,
        "past_due": 5
      },
      "recentPurchases": [
        {
          "userId": "user-uuid-789",
          "user": {
            "email": "newuser@example.com",
            "username": "newuser",
            "name": "New User"
          },
          "plan": "premium",
          "purchasedAt": "2025-01-15T14:30:00Z"
        }
      ]
    },
    "growthByPlan": {
      "personal": [
        { "date": "2025-01-01", "count": 2 },
        { "date": "2025-01-02", "count": 5 }
      ],
      "premium": [
        { "date": "2025-01-01", "count": 1 },
        { "date": "2025-01-02", "count": 3 }
      ],
      "ultimate": [
        { "date": "2025-01-01", "count": 0 },
        { "date": "2025-01-02", "count": 2 }
      ]
    },
    "period": "30d"
  }
}
```

**Frontend Usage:**
```javascript
// Get package analytics
const response = await fetch('/api/admin/analytics/packages?period=30d', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const data = await response.json();

// Display "Who Bought What" table
const personalSubscriptions = data.data.subscriptions.personal;
// List of users who bought personal plan

// Show growth trends (line chart with multiple series)
const growthData = data.data.growthByPlan;
// { personal: [...], premium: [...], ultimate: [...] }

// Show recent purchases
const recentPurchases = data.data.statistics.recentPurchases;
// Top 10 recent active subscriptions
```

---

### 3. Usage Analytics

**Endpoint:** `GET /api/admin/analytics/usage`

**Description:** Get feature usage statistics - see which features are used most, top users per feature, and usage trends over time.

**Query Parameters:**
- `period` (optional): `7d` | `30d` | `90d` | `1y` | `all` (default: `30d`)

**Response Example:**
```json
{
  "success": true,
  "data": {
    "byFeature": {
      "voice_clones": [
        {
          "userId": "user-uuid-123",
          "user": {
            "email": "user@example.com",
            "username": "johndoe"
          },
          "usageCount": 150,
          "periodStart": "2025-01-01T00:00:00Z",
          "periodEnd": "2025-01-31T23:59:59Z"
        }
      ],
      "avatar_generations": [...],
      "interview_sessions": [...]
    },
    "statistics": {
      "voice_clones": {
        "totalUsage": 12500,
        "uniqueUsers": 420,
        "averageUsage": 29.76,
        "topUsers": [
          {
            "userId": "user-uuid-123",
            "user": {
              "email": "poweruser@example.com",
              "username": "poweruser"
            },
            "usageCount": 150,
            "periodStart": "2025-01-01T00:00:00Z",
            "periodEnd": "2025-01-31T23:59:59Z"
          }
        ]
      }
    },
    "usageOverTime": {
      "voice_clones": [
        { "date": "2025-01-01", "total": 450 },
        { "date": "2025-01-02", "total": 520 }
      ],
      "avatar_generations": [
        { "date": "2025-01-01", "total": 320 },
        { "date": "2025-01-02", "total": 380 }
      ]
    },
    "period": "30d"
  }
}
```

**Frontend Usage:**
```javascript
// Get usage analytics
const response = await fetch('/api/admin/analytics/usage?period=30d', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const data = await response.json();

// Show feature usage comparison (bar chart)
const featureStats = data.data.statistics;
// { voice_clones: { totalUsage: 12500, ... }, ... }

// Display top users per feature
const topVoiceUsers = data.data.statistics.voice_clones.topUsers;
// Top 10 users for voice cloning

// Show usage trends over time (line chart)
const voiceUsageTrend = data.data.usageOverTime.voice_clones;
// [{ date: "2025-01-01", total: 450 }, ...]
```

---

### 4. User Activity Analytics

**Endpoint:** `GET /api/admin/analytics/users-activity`

**Description:** Get most active users - see top users by interviews, memories, voices, avatars, and multimedia uploads.

**Query Parameters:**
- `period` (optional): `7d` | `30d` | `90d` | `1y` | `all` (default: `30d`)

**Response Example:**
```json
{
  "success": true,
  "data": {
    "topUsersByInterviews": [
      {
        "userId": "user-uuid-123",
        "user": {
          "id": "user-uuid-123",
          "email": "activeuser@example.com",
          "username": "activeuser",
          "name": "Active User"
        },
        "count": 45,
        "type": "interviews"
      }
    ],
    "topUsersByMemories": [
      {
        "userId": "user-uuid-456",
        "user": {
          "id": "user-uuid-456",
          "email": "memoryuser@example.com",
          "username": "memoryuser",
          "name": "Memory User"
        },
        "count": 320,
        "type": "memories"
      }
    ],
    "topUsersByVoices": [...],
    "topUsersByAvatars": [...],
    "topUsersByMultimedia": [
      {
        "userId": "user-uuid-789",
        "user": {
          "id": "user-uuid-789",
          "email": "mediauser@example.com",
          "username": "mediauser",
          "name": "Media User"
        },
        "count": 150,
        "type": "multimedia"
      }
    ],
    "period": "30d"
  }
}
```

**Frontend Usage:**
```javascript
// Get user activity
const response = await fetch('/api/admin/analytics/users-activity?period=30d', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const data = await response.json();

// Display leaderboards
const topInterviewUsers = data.data.topUsersByInterviews;
// Top 10 users by interview count
const topMemoryUsers = data.data.topUsersByMemories;
// Top 10 users by memory count
const topMultimediaUsers = data.data.topUsersByMultimedia;
// Top 10 users by multimedia upload count
```

---

### 5. Content Analytics

**Endpoint:** `GET /api/admin/analytics/content`

**Description:** Get content statistics and growth trends for interviews, memories, voices, avatars, and multimedia.

**Query Parameters:**
- `period` (optional): `7d` | `30d` | `90d` | `1y` | `all` (default: `30d`)

**Response Example:**
```json
{
  "success": true,
  "data": {
    "interviews": {
      "total": 3200,
      "completed": 2850,
      "active": 350,
      "recent": 120,
      "growth": [
        { "date": "2025-01-01", "count": 15 },
        { "date": "2025-01-02", "count": 22 }
      ]
    },
    "memories": {
      "total": 8500,
      "recent": 450,
      "byCategory": {
        "withPerson": 3200,
        "withEvent": 2800,
        "withTags": 5200,
        "withMedia": 1800
      },
      "growth": [
        { "date": "2025-01-01", "count": 45 },
        { "date": "2025-01-02", "count": 52 }
      ]
    },
    "voices": {
      "total": 420,
      "recent": 35,
      "growth": [
        { "date": "2025-01-01", "count": 2 },
        { "date": "2025-01-02", "count": 5 }
      ]
    },
    "avatars": {
      "total": 380,
      "recent": 28,
      "animations": 1200,
      "growth": [
        { "date": "2025-01-01", "count": 3 },
        { "date": "2025-01-02", "count": 4 }
      ]
    },
    "multimedia": {
      "total": 12500,
      "recent": 680,
      "byType": [
        {
          "file_type": "image",
          "count": 8500,
          "total_size": 15728640000
        },
        {
          "file_type": "video",
          "count": 3200,
          "total_size": 52428800000
        }
      ],
      "nodes": 450,
      "links": 5800,
      "growth": [
        { "date": "2025-01-01", "count": 85 },
        { "date": "2025-01-02", "count": 92 }
      ]
    },
    "period": "30d"
  }
}
```

**Frontend Usage:**
```javascript
// Get content analytics
const response = await fetch('/api/admin/analytics/content?period=30d', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const data = await response.json();

// Show content overview cards
const interviewStats = data.data.interviews;
// { total: 3200, completed: 2850, ... }

// Display content growth charts
const interviewGrowth = data.data.interviews.growth;
// [{ date: "2025-01-01", count: 15 }, ...]

// Show multimedia breakdown (pie chart)
const multimediaByType = data.data.multimedia.byType;
// [{ file_type: "image", count: 8500, ... }, ...]
```

---

## 📦 Subscription Management APIs

**Important:** These are NEW endpoints for managing subscriptions independently. 

**Note:** To view a user's subscription information, you can also use the existing endpoint:
- `GET /api/admin/users/:id` - Returns user details with subscription info included

### 1. List All Subscriptions

**Endpoint:** `GET /api/admin/subscriptions`

**Description:** Get all subscriptions with pagination, filtering, and search.

**Query Parameters:**
- `page` (optional): Page number (default: `1`)
- `limit` (optional): Items per page (default: `20`)
- `status` (optional): Filter by status - `active` | `inactive` | `canceled` | `trialing` | `past_due`
- `planType` (optional): Filter by plan - `personal` | `premium` | `ultimate`
- `search` (optional): Search by user email, username, or name

**Response Example:**
```json
{
  "success": true,
  "subscriptions": [
    {
      "id": "sub-uuid-123",
      "user_id": "user-uuid-456",
      "stripe_customer_id": "cus_xxx",
      "stripe_subscription_id": "sub_xxx",
      "plan_type": "premium",
      "status": "active",
      "current_period_start": "2025-01-01T00:00:00Z",
      "current_period_end": "2025-02-01T00:00:00Z",
      "cancel_at_period_end": false,
      "canceled_at": null,
      "metadata": {},
      "created_at": "2024-12-01T10:00:00Z",
      "updated_at": "2025-01-15T14:30:00Z",
      "user": {
        "id": "user-uuid-456",
        "email": "user@example.com",
        "username": "johndoe",
        "name": "John Doe"
      }
    }
  ],
  "pagination": {
    "total": 850,
    "page": 1,
    "limit": 20,
    "totalPages": 43
  }
}
```

**Frontend Usage:**
```javascript
// Get subscriptions with filters
const response = await fetch(
  '/api/admin/subscriptions?page=1&limit=20&status=active&planType=premium&search=john',
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
);
const data = await response.json();

// Display subscriptions table
const subscriptions = data.subscriptions;
const pagination = data.pagination;
```

---

### 2. Get Subscription by ID

**Endpoint:** `GET /api/admin/subscriptions/:id`

**Description:** Get detailed information about a specific subscription.

**Response Example:**
```json
{
  "success": true,
  "subscription": {
    "id": "sub-uuid-123",
    "user_id": "user-uuid-456",
    "plan_type": "premium",
    "status": "active",
    "current_period_start": "2025-01-01T00:00:00Z",
    "current_period_end": "2025-02-01T00:00:00Z",
    "cancel_at_period_end": false,
    "canceled_at": null,
    "user": {
      "id": "user-uuid-456",
      "email": "user@example.com",
      "username": "johndoe",
      "firstName": "John",
      "lastName": "Doe"
    }
  }
}
```

---

### 3. Check Downgrade (Preview)

**Endpoint:** `GET /api/admin/subscriptions/:id/check-downgrade?planType=personal`

**Description:** Check if a subscription can be downgraded to a plan. Shows what needs cleanup before downgrade. Use this BEFORE attempting to downgrade to show admin what the user needs to clean up.

**Query Parameters:**
- `planType` (required): `personal` | `premium` | `ultimate`

**Response Example:**
```json
{
  "success": true,
  "isDowngrade": true,
  "currentPlan": "premium",
  "targetPlan": "personal",
  "canDowngrade": false,
  "needsCleanup": true,
  "cleanupRequired": true,
  "message": "⚠️ Cleanup Required: You have 2 feature(s) that exceed the personal plan limits. Please delete 60 item(s) before downgrading.",
  "warnings": [
    {
      "feature": "voice_clones",
      "currentUsage": 50,
      "newLimit": 10,
      "overage": 40,
      "message": "You have 50 voice clones, but personal plan only allows 10. Please delete 40 item(s) before downgrading."
    }
  ],
  "featuresExceedingLimit": [
    {
      "feature": "voice_clones",
      "currentUsage": 50,
      "currentLimit": -1,
      "newLimit": 10,
      "overage": 40,
      "needsCleanup": true
    }
  ],
  "featuresWithinLimit": [
    {
      "feature": "interview_sessions",
      "currentUsage": 5,
      "currentLimit": -1,
      "newLimit": 10,
      "overage": 0,
      "needsCleanup": false
    }
  ],
  "totalOverage": 60
}
```

**Frontend Usage:**
```javascript
// Check if downgrade is allowed before attempting
const response = await fetch(
  `/api/admin/subscriptions/${subscriptionId}/check-downgrade?planType=personal`,
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
);
const preview = await response.json();

if (preview.canDowngrade) {
  // Show confirmation dialog
  // Proceed with downgrade
} else {
  // Show cleanup requirements
  // Display what needs to be deleted
  console.log(preview.featuresExceedingLimit);
  console.log(preview.message);
}
```

---

### 4. Update Subscription

**Endpoint:** `PUT /api/admin/subscriptions/:id`

**Description:** Update subscription status, plan type, or billing periods.

**Important:** When changing `plan_type` to a lower plan (downgrade), the backend automatically validates if the user can downgrade. If the user exceeds the new plan's limits, the update will be blocked and you'll receive cleanup requirements.

**Request Body:**
```json
{
  "status": "active",
  "plan_type": "ultimate",
  "current_period_start": "2025-01-01T00:00:00Z",
  "current_period_end": "2025-02-01T00:00:00Z",
  "cancel_at_period_end": false
}
```

**Note:** All fields are optional. Only include fields you want to update.

**Success Response:**
```json
{
  "success": true,
  "subscription": {
    "id": "sub-uuid-123",
    "plan_type": "ultimate",
    "status": "active",
    ...
  }
}
```

**Error Response (Downgrade Blocked - User Exceeds Limits):**
```json
{
  "success": false,
  "error": "Downgrade not allowed",
  "message": "Cannot downgrade: You have 2 feature(s) that exceed the personal plan limits. Please delete items to continue.",
  "needsCleanup": true,
  "cleanupRequired": [
    {
      "feature": "voice_clones",
      "currentUsage": 50,
      "newLimit": 10,
      "overage": 40,
      "message": "You have 50 voice clones, but personal plan only allows 10. Please delete 40 item(s) before downgrading."
    },
    {
      "feature": "avatar_generations",
      "currentUsage": 25,
      "newLimit": 5,
      "overage": 20,
      "message": "You have 25 avatar generations, but personal plan only allows 5. Please delete 20 item(s) before downgrading."
    }
  ]
}
```

**HTTP Status Codes:**
- `200` - Success (update completed)
- `400` - Bad Request (invalid status/plan type)
- `403` - Forbidden (downgrade blocked - user exceeds new plan limits)
- `404` - Not Found (subscription not found)
- `500` - Server Error

**Frontend Usage:**
```javascript
// Update subscription (with downgrade validation)
const response = await fetch(`/api/admin/subscriptions/${subscriptionId}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    plan_type: 'personal' // Trying to downgrade
  })
});
const data = await response.json();

// Check if downgrade was blocked
if (!data.success && data.needsCleanup) {
  // Show cleanup requirements to admin
  console.error(data.message);
  data.cleanupRequired.forEach(item => {
    console.log(`${item.feature}: Delete ${item.overage} items`);
  });
  // Display error message and cleanup list to admin
} else if (data.success) {
  // Update successful
  console.log('Subscription updated');
}
```

---

### 5. Delete Subscription

**Endpoint:** `DELETE /api/admin/subscriptions/:id`

**Description:** Delete a subscription (use with caution).

**Response Example:**
```json
{
  "success": true,
  "message": "Subscription deleted successfully"
}
```

---

### 5. Get User's Subscription Info

**Note:** To get a user's subscription information, use the existing endpoint:
**Endpoint:** `GET /api/admin/users/:id`

This endpoint already returns the user's subscription details in the response (see User Management section). It includes:
- Subscription plan type
- Subscription status
- Billing period dates
- Cancellation info

**Example Response:**
```json
{
  "success": true,
  "user": { ... },
  "statistics": {
    "subscription": {
      "plan": "premium",
      "status": "active",
      "current_period_start": "2025-01-01T00:00:00Z",
      "current_period_end": "2025-02-01T00:00:00Z",
      "cancel_at_period_end": false,
      "stripe_subscription_id": "sub_xxx"
    }
  }
}
```

---

## 📊 Graph Data Structure

All time-series data follows this format:

```typescript
interface TimeSeriesDataPoint {
  date: string;  // ISO date string: "2025-01-15"
  count: number; // Count for that date
}
```

**Example:**
```json
[
  { "date": "2025-01-01", "count": 10 },
  { "date": "2025-01-02", "count": 15 },
  { "date": "2025-01-03", "count": 8 }
]
```

**Frontend Chart Integration:**
```javascript
// For Chart.js, Recharts, or any charting library
const chartData = {
  labels: data.map(item => item.date),
  datasets: [{
    label: 'User Growth',
    data: data.map(item => item.count)
  }]
};
```

---

## 🔐 Authentication

All endpoints require:

1. **JWT Token** in Authorization header:
   ```
   Authorization: Bearer <your-jwt-token>
   ```

2. **Admin Role** - User must have `role: 'admin'` in the database.

**Error Response (401 Unauthorized):**
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

**Error Response (403 Forbidden - Not Admin):**
```json
{
  "success": false,
  "error": "Forbidden - Admin access required"
}
```

---

## 📝 Period Filter Options

All analytics endpoints support the `period` query parameter:

- `7d` - Last 7 days
- `30d` - Last 30 days (default)
- `90d` - Last 90 days
- `1y` - Last year
- `all` - All time

**Example:**
```javascript
const url = '/api/admin/analytics/dashboard?period=90d';
```

---

## 🎨 Frontend Integration Examples

### Dashboard Component

```javascript
// Fetch dashboard data
const fetchDashboard = async (period = '30d') => {
  const response = await fetch(
    `/api/admin/analytics/dashboard?period=${period}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  const data = await response.json();
  
  if (data.success) {
    // Display metrics cards
    setTotalUsers(data.data.overview.totalUsers);
    setActiveSubscriptions(data.data.subscriptions.active);
    
    // Show user growth chart
    setUserGrowthChart(data.data.userGrowth);
    
    // Show subscription breakdown pie chart
    setSubscriptionBreakdown(data.data.subscriptions.byPlan);
  }
};
```

### Package Analytics Table

```javascript
// Fetch package analytics
const fetchPackageAnalytics = async () => {
  const response = await fetch(
    '/api/admin/analytics/packages?period=30d',
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  const data = await response.json();
  
  if (data.success) {
    // Display "Who Bought What" table
    const personalUsers = data.data.subscriptions.personal;
    const premiumUsers = data.data.subscriptions.premium;
    const ultimateUsers = data.data.subscriptions.ultimate;
    
    // Show growth chart by plan
    const growthData = data.data.growthByPlan;
    // { personal: [...], premium: [...], ultimate: [...] }
  }
};
```

### Subscription Management

```javascript
// List subscriptions with filters
const fetchSubscriptions = async (filters = {}) => {
  const params = new URLSearchParams({
    page: filters.page || 1,
    limit: filters.limit || 20,
    ...(filters.status && { status: filters.status }),
    ...(filters.planType && { planType: filters.planType }),
    ...(filters.search && { search: filters.search })
  });
  
  const response = await fetch(
    `/api/admin/subscriptions?${params}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  const data = await response.json();
  
  return data;
};
```

---

## ⚠️ Error Handling

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (not admin)
- `404` - Not Found
- `500` - Server Error

---

## 📚 Summary of Available Endpoints

### Analytics Endpoints:
1. `GET /api/admin/analytics/dashboard` - Overall system statistics
2. `GET /api/admin/analytics/packages` - Package purchase analytics
3. `GET /api/admin/analytics/usage` - Feature usage analytics
4. `GET /api/admin/analytics/users-activity` - Top active users
5. `GET /api/admin/analytics/content` - Content statistics

### Subscription Management:
1. `GET /api/admin/subscriptions` - List all subscriptions (with filters)
2. `GET /api/admin/subscriptions/:id` - Get subscription by ID
3. `GET /api/admin/subscriptions/:id/check-downgrade` - Check if downgrade is allowed (preview cleanup requirements)
4. `PUT /api/admin/subscriptions/:id` - Update subscription (validates downgrades automatically)
5. `DELETE /api/admin/subscriptions/:id` - Delete subscription
6. `GET /api/admin/users/:id` - Get user details (includes subscription info - **EXISTING**)

### Existing Subscription Admin APIs (Old):
- `GET /api/subscription/admin/limits` - Get feature limits (**EXISTING**)
- `PUT /api/subscription/admin/limits` - Update feature limits (**EXISTING**)
- `PUT /api/subscription/admin/limits/bulk` - Bulk update limits (**EXISTING**)
- `POST /api/subscription/admin/limits/reset` - Reset limits to defaults (**EXISTING**)

---

## 🚀 Ready to Use!

All these APIs are fully implemented and ready for frontend integration. The data structures are designed to be chart-friendly, so you can directly use them with any charting library (Chart.js, Recharts, D3.js, etc.).

For questions or issues, refer to the backend API documentation or contact the backend team.

