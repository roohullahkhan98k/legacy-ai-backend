# Admin Panel - Feature Limits Management Guide

## Overview

Admin users can manage feature limits for all subscription plans (Personal, Premium, Ultimate) through the admin API endpoints.

## Prerequisites

1. **Admin User**: You need a user with `role = 'admin'` in the database
2. **Authentication**: Admin endpoints require JWT token with admin role

## Creating Admin User

### Option 1: Using Node.js Script (Recommended)

```bash
node scripts/createAdminUser.js
```

This will create/update admin user with:
- Email: `admin@legacyai.com`
- Username: `admin`
- Password: `admin123`
- Role: `admin`

### Option 2: Using SQL Script

Run the SQL script in your PostgreSQL database:

```bash
psql -U postgres -d ai_prototype -f scripts/createAdminUser.sql
```

Or manually in psql:

```sql
-- Update existing user to admin
UPDATE users 
SET role = 'admin', "isActive" = true, "isVerified" = true
WHERE email = 'your-email@example.com';
```

### Option 3: Direct SQL Insert

```sql
-- Create new admin user (password: admin123)
INSERT INTO users (id, email, username, password, "firstName", "lastName", role, "isActive", "isVerified", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin@legacyai.com',
  'admin',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyY5Y5Y5Y5Y5Y', -- 'admin123' hashed
  'Admin',
  'User',
  'admin',
  true,
  true,
  NOW(),
  NOW()
);
```

## Frontend: Checking User Role

### 1. After Login - Check User Role

```javascript
// After successful login
const response = await fetch('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
});

const data = await response.json();

if (data.success && data.user) {
  const isAdmin = data.user.role === 'admin';
  
  if (isAdmin) {
    // Show admin panel link/button
    showAdminPanel();
  }
}
```

### 2. From JWT Token

```javascript
// Decode JWT token (frontend)
function decodeToken(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

// Check if user is admin
const token = localStorage.getItem('token');
if (token) {
  const decoded = decodeToken(token);
  const isAdmin = decoded?.role === 'admin';
}
```

### 3. Get Current User Info

```javascript
// Call your user profile endpoint
const response = await fetch('/api/user/profile', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const data = await response.json();
const isAdmin = data.user?.role === 'admin';
```

## Admin API Endpoints

All admin endpoints require:
- **Authentication**: Valid JWT token
- **Authorization**: User must have `role = 'admin'`

Base URL: `/api/subscription/admin`

### 1. Get All Feature Limits

**GET** `/api/subscription/admin/limits`

Get all feature limits for all plans.

#### Response
```json
{
  "success": true,
  "limits": {
    "personal": {
      "voice_clones": { "limit_value": 1, "limit_type": "monthly", "id": "..." },
      "avatar_generations": { "limit_value": 1, "limit_type": "monthly", "id": "..." },
      "memory_graph_operations": { "limit_value": 1, "limit_type": "monthly", "id": "..." },
      "interview_sessions": { "limit_value": 1, "limit_type": "monthly", "id": "..." },
      "multimedia_uploads": { "limit_value": 1, "limit_type": "monthly", "id": "..." }
    },
    "premium": {
      "voice_clones": { "limit_value": 2, "limit_type": "monthly", "id": "..." },
      ...
    },
    "ultimate": {
      "voice_clones": { "limit_value": -1, "limit_type": "monthly", "id": "..." },
      ...
    }
  },
  "raw": [...]
}
```

#### Example
```javascript
const response = await fetch('/api/subscription/admin/limits', {
  headers: {
    'Authorization': `Bearer ${adminToken}`
  }
});

const data = await response.json();
console.log(data.limits.personal.voice_clones.limit_value); // 1
```

### 2. Update Single Feature Limit

**PUT** `/api/subscription/admin/limits`

Update limit for one feature in one plan.

#### Request Body
```json
{
  "planType": "personal" | "premium" | "ultimate",
  "featureName": "voice_clones" | "avatar_generations" | "memory_graph_operations" | "interview_sessions" | "multimedia_uploads",
  "limitValue": 5,
  "limitType": "monthly" // optional, defaults to "monthly"
}
```

#### Response
```json
{
  "success": true,
  "message": "Limit updated successfully",
  "limit": {
    "plan_type": "personal",
    "feature_name": "voice_clones",
    "limit_value": 5,
    "limit_type": "monthly",
    "id": "..."
  }
}
```

#### Example
```javascript
const response = await fetch('/api/subscription/admin/limits', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    planType: 'personal',
    featureName: 'voice_clones',
    limitValue: 5
  })
});

const data = await response.json();
```

### 3. Update Multiple Limits (Bulk)

**PUT** `/api/subscription/admin/limits/bulk`

Update multiple limits at once.

#### Request Body
```json
{
  "limits": [
    {
      "planType": "personal",
      "featureName": "voice_clones",
      "limitValue": 5
    },
    {
      "planType": "personal",
      "featureName": "avatar_generations",
      "limitValue": 5
    },
    {
      "planType": "premium",
      "featureName": "voice_clones",
      "limitValue": 20
    }
  ]
}
```

#### Response
```json
{
  "success": true,
  "message": "Updated 3 limit(s)",
  "updated": [
    {
      "plan_type": "personal",
      "feature_name": "voice_clones",
      "limit_value": 5,
      "limit_type": "monthly"
    },
    ...
  ],
  "errors": [] // If any updates failed
}
```

#### Example
```javascript
const response = await fetch('/api/subscription/admin/limits/bulk', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    limits: [
      { planType: 'personal', featureName: 'voice_clones', limitValue: 5 },
      { planType: 'personal', featureName: 'avatar_generations', limitValue: 5 },
      { planType: 'premium', featureName: 'voice_clones', limitValue: 20 }
    ]
  })
});
```

### 4. Reset All Limits to Defaults

**POST** `/api/subscription/admin/limits/reset`

Reset all feature limits to default values defined in code.

#### Response
```json
{
  "success": true,
  "message": "Limits reset to defaults",
  "limits": [...]
}
```

#### Example
```javascript
const response = await fetch('/api/subscription/admin/limits/reset', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`
  }
});
```

## Feature Names

Valid feature names:
- `voice_clones`
- `avatar_generations`
- `memory_graph_operations`
- `interview_sessions`
- `multimedia_uploads`

## Limit Values

- **-1**: Unlimited
- **0**: Not allowed
- **1-1000000**: Specific limit

## Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Authentication required"
}
```

### 403 Forbidden (Not Admin)
```json
{
  "success": false,
  "error": "Admin access required",
  "message": "You do not have permission to access this resource"
}
```

### 400 Bad Request
```json
{
  "success": false,
  "error": "Missing required fields: planType, featureName, limitValue"
}
```

## Frontend Implementation Example

### React Component

```jsx
import React, { useState, useEffect } from 'react';

function AdminLimitsPanel() {
  const [limits, setLimits] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLimits();
  }, []);

  const fetchLimits = async () => {
    try {
      const response = await fetch('/api/subscription/admin/limits', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setLimits(data.limits);
      }
    } catch (error) {
      console.error('Error fetching limits:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateLimit = async (planType, featureName, limitValue) => {
    try {
      const response = await fetch('/api/subscription/admin/limits', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          planType,
          featureName,
          limitValue: parseInt(limitValue)
        })
      });
      const data = await response.json();
      if (data.success) {
        await fetchLimits(); // Refresh
        alert('Limit updated successfully!');
      }
    } catch (error) {
      console.error('Error updating limit:', error);
      alert('Failed to update limit');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!limits) return <div>Error loading limits</div>;

  return (
    <div className="admin-limits-panel">
      <h2>Feature Limits Management</h2>
      {['personal', 'premium', 'ultimate'].map(plan => (
        <div key={plan} className="plan-section">
          <h3>{plan.toUpperCase()} Plan</h3>
          {Object.entries(limits[plan] || {}).map(([feature, limit]) => (
            <div key={feature} className="limit-row">
              <label>{feature.replace(/_/g, ' ')}</label>
              <input
                type="number"
                value={limit.limit_value === -1 ? 'Unlimited' : limit.limit_value}
                onChange={(e) => {
                  const value = e.target.value === 'Unlimited' ? -1 : parseInt(e.target.value);
                  updateLimit(plan, feature, value);
                }}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default AdminLimitsPanel;
```

## Notes

- **Changes take effect immediately** - No restart needed
- **Existing users** - Limits apply to all users on that plan
- **Unlimited** - Use `-1` for unlimited features
- **Validation** - Backend validates all inputs
- **Audit** - Consider adding audit logs for limit changes

