# 🎛️ Admin Panel Capabilities

## Overview

The admin panel now provides comprehensive management and analytics capabilities for your AI backend system. All endpoints require admin authentication (`/api/admin/*`).

---

## ✅ What You Can Manage

### 1. **Users Management** (`/api/admin/users`)
- ✅ **List all users** with pagination, search, and filters (role, active status)
- ✅ **View user details** with statistics (interviews, memories, voices, avatars, subscriptions)
- ✅ **Create new users**
- ✅ **Update users** (email, username, role, active status, etc.)
- ✅ **Delete users** (with cascade deletion of all related data)

### 2. **Package/Subscription Management** (`/api/admin/subscriptions`)
- ✅ **List all subscriptions** with pagination, filters (status, plan type), and search
- ✅ **View subscription details** by ID
- ✅ **Update subscriptions** (status, plan type, billing periods, cancellation settings)
- ✅ **Delete subscriptions**
- ✅ **Get all subscriptions for a specific user**

### 3. **Feature Limits Management** (`/api/subscription/admin/limits`)
- ✅ **View all feature limits** for all plans (personal, premium, ultimate)
- ✅ **Update feature limits** (individual or bulk)
- ✅ **Reset limits to defaults**

---

## 📊 Analytics & Insights

### 1. **Dashboard Analytics** (`/api/admin/analytics/dashboard`)
Get overall system statistics:
- **Overview Metrics:**
  - Total users, active users, new users
  - Total interviews, completed interviews, new interviews
  - Total memories, voices, avatars, multimedia files
  - Total subscriptions, active subscriptions, new subscriptions

- **Subscription Breakdown:**
  - Subscriptions by plan type (personal, premium, ultimate)
  - Active vs total subscriptions per plan
  - Subscription growth over time (graph data)

- **User Growth Graph:**
  - User signups over time (daily data points)
  - Supports period filters: `7d`, `30d`, `90d`, `1y`, `all`

- **Feature Usage Summary:**
  - Total usage per feature
  - Active users per feature
  - Usage statistics

### 2. **Package Analytics** (`/api/admin/analytics/packages`)
Detailed subscription/purchase analytics:
- **Who Bought What:**
  - List of all subscriptions grouped by plan type
  - User information for each subscription
  - Subscription status, purchase dates, billing periods

- **Statistics:**
  - Total subscriptions by plan
  - Subscriptions by status (active, inactive, canceled, trialing, past_due)
  - Recent purchases (top 10 active subscriptions)

- **Growth Graphs:**
  - Subscription growth over time by plan type
  - Daily data points for each plan (personal, premium, ultimate)

**Query Parameters:**
- `period`: `7d`, `30d`, `90d`, `1y`, `all` (default: `30d`)

### 3. **Usage Analytics** (`/api/admin/analytics/usage`)
Feature usage analytics:
- **By Feature:**
  - Breakdown by feature name (voice_clones, avatar_generations, memory_graph_operations, interview_sessions, multimedia_uploads)
  - Total usage per feature
  - Active users per feature
  - Average usage per user
  - Top 10 users per feature

- **Usage Over Time:**
  - Daily usage trends for each feature
  - Graph-ready data (date, count pairs)

**Query Parameters:**
- `period`: `7d`, `30d`, `90d`, `1y`, `all` (default: `30d`)

### 4. **User Activity Analytics** (`/api/admin/analytics/users-activity`)
Most active users:
- **Top Users By:**
  - Interviews (top 10)
  - Memories (top 10)
  - Voice clones (top 10)
  - Avatars (top 10)

- Each result includes:
  - User information (email, username, name)
  - Activity count
  - Activity type

**Query Parameters:**
- `period`: `7d`, `30d`, `90d`, `1y`, `all` (default: `30d`)

### 5. **Content Analytics** (`/api/admin/analytics/content`)
Content statistics and growth:
- **Interviews:**
  - Total, completed, active, recent counts
  - Growth over time

- **Memories:**
  - Total and recent counts
  - Breakdown by category (with person, with event, with tags, with media)
  - Growth over time

- **Voices:**
  - Total and recent counts
  - Growth over time

- **Avatars:**
  - Total and recent counts
  - Total animations
  - Growth over time

- **Multimedia:**
  - Total and recent counts
  - Breakdown by file type (images, videos, audio, documents)
  - Total file size by type
  - Total nodes and links
  - Growth over time

**Query Parameters:**
- `period`: `7d`, `30d`, `90d`, `1y`, `all` (default: `30d`)

---

## 📈 Graph-Ready Data

All analytics endpoints return data in graph-friendly formats:

### Time Series Data Format:
```json
{
  "date": "2025-01-15",
  "count": 42
}
```

### Available Graphs:
1. **User Growth** - New user signups over time
2. **Subscription Growth** - New subscriptions over time (overall and by plan)
3. **Feature Usage Trends** - Daily usage for each feature
4. **Content Growth** - Creation trends for interviews, memories, voices, avatars, multimedia

---

## 🎯 Use Cases

### Package Analytics - "Who Bought What"
```bash
GET /api/admin/analytics/packages?period=30d
```

Returns:
- All users who purchased each package
- Purchase dates
- Subscription status
- Plan type breakdown
- Growth trends per plan

### Feature Usage Monitoring
```bash
GET /api/admin/analytics/usage?period=7d
```

Returns:
- Which features are most used
- Top users for each feature
- Usage trends (identify popular features)

### User Activity Tracking
```bash
GET /api/admin/analytics/users-activity?period=30d
```

Returns:
- Most active users
- Activity breakdown by type
- Power users identification

### System Health Dashboard
```bash
GET /api/admin/analytics/dashboard?period=30d
```

Returns:
- Overall system metrics
- Growth trends
- Subscription health
- Feature adoption

---

## 🔐 Authentication

All admin endpoints require:
1. **JWT Token** in `Authorization: Bearer <token>` header
2. **Admin Role** - User must have `role: 'admin'` in database

---

## 📝 Summary

### What You Can Manage:
1. ✅ **Users** - Full CRUD operations
2. ✅ **Subscriptions/Packages** - View, update, delete
3. ✅ **Feature Limits** - Configure plan limits

### Analytics Available:
1. ✅ **Dashboard** - Overall system stats and trends
2. ✅ **Package Analytics** - Who bought what, purchase trends
3. ✅ **Usage Analytics** - Feature usage stats and trends
4. ✅ **User Activity** - Most active users
5. ✅ **Content Analytics** - Content statistics and growth

### Graphs & Visualizations:
- ✅ User growth over time
- ✅ Subscription growth by plan
- ✅ Feature usage trends
- ✅ Content creation trends

---

## 🚀 Next Steps

The admin panel is now comprehensive! You can:
- Monitor system health with the dashboard
- Track which packages users are buying
- Analyze feature usage patterns
- Identify power users
- Manage users and subscriptions
- Configure feature limits

All data is graph-ready for frontend visualization! 📊

