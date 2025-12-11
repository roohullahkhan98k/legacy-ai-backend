# Feature Limits System - Frontend Integration Guide

## 📋 Overview

The Feature Limits System automatically restricts users based on their subscription plan. This guide explains all new endpoints, how to integrate usage display in the dashboard, and handle limit errors.

**Note:** Limits are currently set to default values and cannot be changed via API. Admin functionality will be added in the future.

---

## 🎯 Features Tracked

The system tracks usage for 5 main features:

1. **Voice Clones** (`voice_clones`) - Count of voice clones created
2. **Avatar Generations** (`avatar_generations`) - Count of avatars generated
3. **Memory Graph Operations** (`memory_graph_operations`) - Count of memory nodes created
4. **Interview Sessions** (`interview_sessions`) - Count of interviews started
5. **Multimedia Uploads** (`multimedia_uploads`) - Count of memory nodes created (1 per node, regardless of photos linked)

---

## 📊 Default Limits by Plan

### Personal Plan (A$9.99/month)
- Voice Clones: **5 per month**
- Avatar Generations: **5 per month**
- Memory Graph Operations: **50 per month**
- Interview Sessions: **10 per month**
- Multimedia Uploads: **20 nodes per month**

### Premium Plan (A$24.99/month)
- Voice Clones: **20 per month**
- Avatar Generations: **20 per month**
- Memory Graph Operations: **200 per month**
- Interview Sessions: **50 per month**
- Multimedia Uploads: **100 nodes per month**

### Ultimate Plan (A$44.99/month)
- **Unlimited** for all features

---

## 🔌 New API Endpoints

### 1. Get User Usage Stats (Dashboard)

**GET** `/api/subscription/usage`

Get current user's usage statistics for all features.

**Authentication:** Required (Bearer token)

**Response:**
```json
{
  "success": true,
  "plan": "personal",
  "stats": {
    "voice_clones": {
      "limit": 5,
      "currentUsage": 3,
      "remaining": 2,
      "isUnlimited": false,
      "percentage": 60
    },
    "avatar_generations": {
      "limit": 5,
      "currentUsage": 1,
      "remaining": 4,
      "isUnlimited": false,
      "percentage": 20
    },
    "memory_graph_operations": {
      "limit": 50,
      "currentUsage": 12,
      "remaining": 38,
      "isUnlimited": false,
      "percentage": 24
    },
    "interview_sessions": {
      "limit": 10,
      "currentUsage": 0,
      "remaining": 10,
      "isUnlimited": false,
      "percentage": 0
    },
    "multimedia_uploads": {
      "limit": 20,
      "currentUsage": 5,
      "remaining": 15,
      "isUnlimited": false,
      "percentage": 25
    }
  }
}
```

**Example Usage:**
```javascript
const response = await fetch('https://api.legacyai.com.au/api/subscription/usage', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const data = await response.json();
if (data.success) {
  console.log('Plan:', data.plan);
  console.log('Voice clones:', data.stats.voice_clones.currentUsage, '/', data.stats.voice_clones.limit);
}
```

---

## ⚠️ Error Responses

When a user reaches their limit, the API will return a `403 Forbidden` response:

```json
{
  "error": "Limit reached",
  "message": "You have reached your voice cloning limit (5). Upgrade your plan to create more voice clones.",
  "limit": 5,
  "currentUsage": 5,
  "remaining": 0,
  "plan": "personal",
  "upgradeRequired": true
}
```

**Features that return limit errors:**
- Voice cloning (`POST /api/voice-cloning/clone`)
- Avatar generation (`POST /api/avatar/pipeline/image`, `POST /api/avatar/model`)
- Memory graph creation (`POST /api/memory-graph/create`)
- Interview start (`POST /api/interview/start`)
- Multimedia node creation (`POST /api/multimedia/memory-nodes`)

---

## 🎨 Frontend Integration

### 1. Display Usage in Dashboard

Create a usage component to show remaining limits:

```javascript
import { useState, useEffect } from 'react';
import { getAuthToken } from './authService';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.legacyai.com.au';

export async function getUserUsage() {
  const token = getAuthToken();
  if (!token) {
    throw new Error('User must be logged in');
  }

  const response = await fetch(`${API_URL}/api/subscription/usage`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch usage');
  }

  return await response.json();
}

// Usage Component
function UsageDashboard() {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserUsage()
      .then(data => {
        setUsage(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching usage:', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!usage) return <div>Error loading usage</div>;

  const features = [
    { key: 'voice_clones', label: 'Voice Clones', icon: '🎤' },
    { key: 'avatar_generations', label: 'Avatar Generations', icon: '👤' },
    { key: 'memory_graph_operations', label: 'Memory Nodes', icon: '🧠' },
    { key: 'interview_sessions', label: 'Interview Sessions', icon: '💬' },
    { key: 'multimedia_uploads', label: 'Multimedia Nodes', icon: '📸' }
  ];

  return (
    <div className="usage-dashboard">
      <h2>Usage Overview - {usage.plan.toUpperCase()} Plan</h2>
      <div className="usage-grid">
        {features.map(feature => {
          const stat = usage.stats[feature.key];
          return (
            <div key={feature.key} className="usage-card">
              <div className="usage-header">
                <span className="icon">{feature.icon}</span>
                <h3>{feature.label}</h3>
              </div>
              <div className="usage-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${stat.percentage}%` }}
                  />
                </div>
                <div className="usage-numbers">
                  <span className="current">{stat.currentUsage}</span>
                  <span className="separator">/</span>
                  <span className={stat.isUnlimited ? 'unlimited' : 'limit'}>
                    {stat.isUnlimited ? '∞' : stat.limit}
                  </span>
                </div>
              </div>
              <div className="usage-remaining">
                {stat.isUnlimited ? (
                  <span className="unlimited-badge">Unlimited</span>
                ) : (
                  <span>
                    {stat.remaining} remaining this month
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### 2. Handle Limit Errors

When making API calls that might hit limits, handle the error response:

```javascript
async function createVoiceClone(audioFile, voiceName) {
  const formData = new FormData();
  formData.append('audio', audioFile);
  formData.append('voiceName', voiceName);

  try {
    const response = await fetch(`${API_URL}/api/voice-cloning/clone`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      
      // Check if it's a limit error
      if (response.status === 403 && error.upgradeRequired) {
        // Show upgrade prompt
        showUpgradeModal({
          message: error.message,
          limit: error.limit,
          currentUsage: error.currentUsage,
          remaining: error.remaining,
          plan: error.plan
        });
        return;
      }
      
      throw new Error(error.message || 'Failed to create voice clone');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating voice clone:', error);
    throw error;
  }
}
```

### 3. Show Upgrade Prompt

Create a modal/component to prompt users to upgrade:

```javascript
function UpgradeModal({ isOpen, onClose, limitInfo }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>Limit Reached</h2>
        <p>{limitInfo.message}</p>
        <div className="limit-details">
          <p>Current Plan: <strong>{limitInfo.plan.toUpperCase()}</strong></p>
          <p>Usage: {limitInfo.currentUsage} / {limitInfo.limit}</p>
          <p>Remaining: {limitInfo.remaining}</p>
        </div>
        <div className="modal-actions">
          <button onClick={onClose}>Maybe Later</button>
          <Link to="/pricing">
            <button className="upgrade-button">Upgrade Plan</button>
          </Link>
        </div>
      </div>
    </div>
  );
}
```

### 4. Pre-check Limits Before Actions

Check limits before allowing users to start expensive operations:

```javascript
async function checkLimitBeforeAction(featureName) {
  const usage = await getUserUsage();
  const stat = usage.stats[featureName];

  if (!stat.isUnlimited && stat.remaining === 0) {
    showUpgradeModal({
      message: `You have reached your ${featureName} limit. Upgrade to continue.`,
      limit: stat.limit,
      currentUsage: stat.currentUsage,
      remaining: stat.remaining,
      plan: usage.plan
    });
    return false;
  }

  return true;
}

// Usage in component
async function handleStartInterview() {
  const canProceed = await checkLimitBeforeAction('interview_sessions');
  if (!canProceed) return;

  // Proceed with interview start
  startInterview();
}
```

---

## 🔄 Plan Change Behavior

When a user switches plans mid-month:

- **Usage is NOT reset** - they keep what they've already used
- **New limits apply immediately** - they get the new plan's limits
- **Remaining = New Limit - Current Usage**
- If they used more than the new plan allows, they can't use more until next month

**Example:**
- User on Personal (5 voice clones) used 3 clones
- Switches to Premium (20 voice clones)
- Remaining = 20 - 3 = **17 clones** (not 20)

---

---

## 🎯 Best Practices

1. **Always check usage before expensive operations** - Don't let users start processes they can't complete
2. **Show usage in dashboard** - Keep users informed about their limits
3. **Handle limit errors gracefully** - Show helpful upgrade prompts
4. **Refresh usage after actions** - Update the dashboard after creating resources
5. **Cache usage data** - Don't fetch on every render, cache for a few seconds

---

---

## 📊 Monthly Reset

Usage limits reset automatically on the 1st of each month. No action required from frontend or backend - the system handles it automatically based on `period_start` and `period_end` dates.

---

## 🐛 Troubleshooting

### "Limit reached" but user hasn't used feature
- Check if user's subscription is active
- Verify the feature name matches exactly
- Check database for usage records

### Usage not updating
- Ensure `recordUsage()` is called after successful creation
- Check that user_id is being passed correctly
- Verify the feature name matches the limit configuration

---

## 📚 Additional Resources

- Subscription API: See `features/subscriptionService/FRONTEND_API_GUIDE.md`
- Feature Limit Service: `features/subscriptionService/services/FeatureLimitService.js`
- Database Models: `features/subscriptionService/models/`

---

## ✅ Summary

The Feature Limits System is now fully integrated. Users will see their usage in the dashboard, get helpful error messages when limits are reached, and admins can manage limits dynamically. All limits reset monthly automatically.

**Key Points:**
- ✅ 5 features tracked with monthly limits
- ✅ Usage displayed in dashboard
- ✅ Limit errors handled gracefully
- ✅ Default limits configured (Personal: 5/5/50/10/20, Premium: 20/20/200/50/100, Ultimate: Unlimited)
- ✅ Plan changes handled correctly (new limit - current usage)
- ✅ Monthly automatic reset

