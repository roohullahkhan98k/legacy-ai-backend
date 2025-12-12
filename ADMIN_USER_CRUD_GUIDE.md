# Admin User CRUD - Complete Guide

## Overview

Full CRUD (Create, Read, Update, Delete) operations for managing users. Only admins can access these endpoints.

## Authentication

All endpoints require:
1. **JWT Token** (Bearer token in Authorization header)
2. **Admin Role** (user must have `role: 'admin'`)

## API Endpoints

### 1. Get All Users (with pagination & filters)

**GET** `/api/admin/users`

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 20) - Items per page
- `search` (optional) - Search in email, username, firstName, lastName
- `role` (optional) - Filter by role: `user`, `admin`, `moderator`
- `isActive` (optional) - Filter by active status: `true` or `false`

**Example:**
```bash
GET /api/admin/users?page=1&limit=20&search=john&role=user&isActive=true
Authorization: Bearer <admin-jwt-token>
```

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "username": "username",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user",
      "isActive": true,
      "isVerified": true,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

---

### 2. Get Single User (with statistics)

**GET** `/api/admin/users/:id`

**Example:**
```bash
GET /api/admin/users/bb45e214-5671-43a4-bc6b-7c28d5bde949
Authorization: Bearer <admin-jwt-token>
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "isActive": true,
    "isVerified": true
  },
  "statistics": {
    "interviews": 5,
    "memories": 20,
    "voices": 3,
    "avatars": 2,
    "hasSubscription": true,
    "subscription": {
      "plan": "premium",
      "status": "active",
      "current_period_start": "2025-01-01T00:00:00Z",
      "current_period_end": "2025-02-01T00:00:00Z",
      "cancel_at_period_end": false,
      "stripe_subscription_id": "sub_xxxxx"
    }
  }
}
```

---

### 3. Create User

**POST** `/api/admin/users`

**Body:**
```json
{
  "email": "newuser@example.com",
  "username": "newuser",
  "password": "password123",
  "firstName": "New",
  "lastName": "User",
  "role": "user",
  "isActive": true,
  "isVerified": false
}
```

**Required Fields:**
- `email` - Must be unique, valid email
- `username` - Must be unique, 3-30 chars, alphanumeric + underscore
- `password` - Min 6 characters (will be hashed automatically)

**Optional Fields:**
- `firstName` - User's first name
- `lastName` - User's last name
- `role` - `user`, `admin`, or `moderator` (default: `user`)
- `isActive` - Boolean (default: `true`)
- `isVerified` - Boolean (default: `false`)

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "newuser@example.com",
    "username": "newuser",
    "firstName": "New",
    "lastName": "User",
    "role": "user",
    "isActive": true,
    "isVerified": false
  }
}
```

---

### 4. Update User

**PUT** `/api/admin/users/:id`

**Body (all fields optional):**
```json
{
  "email": "updated@example.com",
  "username": "updateduser",
  "password": "newpassword123",
  "firstName": "Updated",
  "lastName": "Name",
  "role": "admin",
  "isActive": false,
  "isVerified": true,
  "avatar": "/uploads/users/profile.jpg"
}
```

**Notes:**
- Password will be automatically hashed if provided
- You cannot remove your own admin role
- Email/username must be unique

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "updated@example.com",
    "username": "updateduser",
    "role": "admin",
    "isActive": false
  }
}
```

---

### 5. Delete User (CASCADE DELETE)

**DELETE** `/api/admin/users/:id`

**⚠️ WARNING:** This deletes **EVERYTHING** related to the user:
- ✅ Interviews (from PostgreSQL + ChromaDB)
- ✅ Memory nodes (from PostgreSQL + ChromaDB)
- ✅ Voice clones
- ✅ Generated audio files
- ✅ Avatars (files + database records)
- ✅ Multimedia files (files + database records)
- ✅ Multimedia memory nodes
- ✅ Multimedia links
- ✅ Subscriptions
- ✅ Feature usage records
- ✅ User profile picture
- ✅ User account

**Protection:**
- You **cannot** delete your own account

**Example:**
```bash
DELETE /api/admin/users/bb45e214-5671-43a4-bc6b-7c28d5bde949
Authorization: Bearer <admin-jwt-token>
```

**Response:**
```json
{
  "success": true,
  "message": "User and all related data deleted successfully",
  "deleted": {
    "user": true,
    "interviews": 5,
    "memories": 20,
    "voices": 3,
    "generatedAudio": 10,
    "avatars": 2,
    "multimedia": 15,
    "multimediaNodes": 8,
    "multimediaLinks": 12,
    "subscriptions": 1,
    "usage": 5
  }
}
```

---

## Frontend Integration Guide

### How to Use These APIs

**Important:** All endpoints require admin authentication. Include the JWT token in the Authorization header.

**Base URL:** `/api/admin`

**Headers Required:**
```
Authorization: Bearer <your-admin-jwt-token>
Content-Type: application/json (for POST/PUT)
```

---

### 1. Get All Users

**Endpoint:** `GET /api/admin/users`

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `search` - Search in email, username, firstName, lastName
- `role` - Filter by role: `user`, `admin`, `moderator`
- `isActive` - Filter by active status: `true` or `false`

**What to do:**
- Call this endpoint to show a list of all users in your admin panel
- Use pagination to load more users
- Use search to find specific users
- Use filters to show only active/inactive users or specific roles

**Response includes:**
- Array of users (passwords are never included)
- Pagination info (total, current page, total pages)

---

### 2. Get Single User Details

**Endpoint:** `GET /api/admin/users/:id`

**What to do:**
- Call this when admin clicks on a user to see full details
- Replace `:id` with the actual user ID

**Response includes:**
- Full user information
- Statistics:
  - Number of interviews
  - Number of memories
  - Number of voice clones
  - Number of avatars
  - **Subscription info** (plan type, status)
  - Whether user has active subscription

**Use this to:**
- Show user profile page in admin panel
- Display user statistics
- Show subscription status

---

### 3. Create New User

**Endpoint:** `POST /api/admin/users`

**Body to send:**
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "password123",
  "firstName": "First",
  "lastName": "Last",
  "role": "user",
  "isActive": true,
  "isVerified": false
}
```

**Required fields:**
- `email` - Must be unique
- `username` - Must be unique, 3-30 characters
- `password` - Minimum 6 characters

**Optional fields:**
- `firstName`, `lastName`
- `role` - `user`, `admin`, or `moderator` (default: `user`)
- `isActive` - Boolean (default: `true`)
- `isVerified` - Boolean (default: `false`)

**What to do:**
- Use this in your "Create User" form in admin panel
- Send POST request with user data
- Password will be automatically hashed by backend

---

### 4. Update User

**Endpoint:** `PUT /api/admin/users/:id`

**Body to send (all fields optional):**
```json
{
  "email": "newemail@example.com",
  "username": "newusername",
  "password": "newpassword",
  "firstName": "Updated",
  "lastName": "Name",
  "role": "admin",
  "isActive": false,
  "isVerified": true
}
```

**What to do:**
- Use this in your "Edit User" form
- Only send fields you want to update
- If you send password, it will be automatically hashed
- You can change user role (make them admin, etc.)

**Restrictions:**
- Admin cannot remove their own admin role
- Email/username must be unique

---

### 5. Delete User

**Endpoint:** `DELETE /api/admin/users/:id`

**What to do:**
- Call this when admin clicks "Delete User"
- **WARNING:** Show confirmation dialog first!
- This deletes EVERYTHING (interviews, memories, files, subscriptions, etc.)

**Response shows:**
- What was deleted (counts of each type)
- Confirmation that user is deleted

**Restrictions:**
- Admin cannot delete themselves

---

## Subscription Information

**Note:** Subscription information is included in the "Get Single User" endpoint response.

**What you'll see:**
```json
{
  "statistics": {
    "hasSubscription": true,
    "subscription": {
      "plan": "premium",
      "status": "active",
      "current_period_start": "2025-01-01T00:00:00Z",
      "current_period_end": "2025-02-01T00:00:00Z",
      "cancel_at_period_end": false,
      "stripe_subscription_id": "sub_xxxxx"
    }
  }
}
```

**Subscription Status Values:**
- `active` - User has active subscription
- `trialing` - User is in trial period
- `incomplete` - Payment pending
- `canceled` - Subscription canceled
- `past_due` - Payment failed

**Plan Types:**
- `personal` - Personal plan
- `premium` - Premium plan
- `ultimate` - Ultimate plan

**Important:** Admins can **view** subscription info but **cannot change** subscriptions. Subscription management is handled through Stripe.

---

## Frontend UI Suggestions

### User List Page
- Table showing: Email, Username, Role, Status, Subscription, Actions
- Search bar at top
- Filters for role and active status
- Pagination at bottom
- "Create User" button

### User Detail Page
- User information form (editable)
- Statistics cards (interviews, memories, etc.)
- Subscription info card (read-only, shows plan and status)
- "Delete User" button (with confirmation)

### Create/Edit User Form
- Email input
- Username input
- Password input (for create, optional for edit)
- First Name, Last Name
- Role dropdown (user/admin/moderator)
- Active checkbox
- Verified checkbox
- Save button

---

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
  "error": "Access denied: Admin privileges required"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "User not found"
}
```

### 400 Bad Request
```json
{
  "success": false,
  "error": "Email already exists"
}
```

---

## Security Notes

1. **Passwords are never returned** - Even admins cannot see user passwords
2. **Self-protection** - Admins cannot delete themselves or remove their own admin role
3. **Cascade delete** - Deleting a user removes ALL their data (interviews, memories, files, etc.)
4. **File cleanup** - Physical files are deleted from disk when user is deleted
5. **ChromaDB cleanup** - Vector database entries are also deleted

---

## What Gets Deleted on User Deletion

When you delete a user, the following are **completely removed**:

1. **Interviews** - All interview sessions + ChromaDB entries
2. **Memories** - All memory nodes + ChromaDB entries
3. **Voice Clones** - All custom voices
4. **Generated Audio** - All generated speech files
5. **Avatars** - All 3D avatars + model files
6. **Multimedia** - All uploaded files + database records
7. **Subscriptions** - All subscription records
8. **Usage Records** - All feature usage tracking
9. **Profile Picture** - User's avatar file
10. **User Account** - The user record itself

**⚠️ This action is IRREVERSIBLE!**

