# Subscription & Limit Check - Frontend Integration Guide

## 📋 Overview

The backend now checks **subscription status** before allowing any feature usage. This guide explains how to handle the different error responses and redirect users appropriately.

---

## 🔒 How It Works

When users try to use any of the 5 features, the backend checks:

1. **Does user have an active subscription?**
   - If NO → Block access, show subscription required message
   - If YES → Continue to step 2

2. **Has user reached their limit?**
   - If YES → Block access, show limit reached message, redirect to pricing
   - If NO → Allow the action

---

## ⚠️ Error Response Types

The backend returns **403 Forbidden** with different error types:

### 1. Subscription Required (No Subscription)

**When:** User tries to use a feature but has no active subscription

**Response:**
```json
{
  "error": "Subscription required",
  "message": "You need an active subscription to use [feature]. Please subscribe to continue.",
  "hasSubscription": false,
  "needsSubscription": true,
  "redirectToPricing": true
}
```

**Frontend Action:**
- Show a modal/alert explaining subscription is required
- Redirect to `/pricing` or `/subscription` page
- Optionally show a "Subscribe Now" button

---

### 2. Limit Reached (Has Subscription, But Limit Full)

**When:** User has subscription but reached their monthly limit

**Response:**
```json
{
  "error": "Limit reached",
  "message": "You have reached your [feature] limit (X). Upgrade your plan to continue.",
  "limit": 5,
  "currentUsage": 5,
  "remaining": 0,
  "plan": "personal",
  "hasSubscription": true,
  "limitReached": true,
  "redirectToPricing": true
}
```

**Frontend Action:**
- Show a modal/alert with current usage and limit
- Show upgrade options (if on Personal, show Premium/Ultimate)
- Redirect to `/pricing` page with upgrade prompt
- Highlight the plan they should upgrade to

---

## 🎯 Features That Check Subscription

All 5 features now check subscription before allowing usage:

1. **Voice Cloning** - `POST /api/voice-cloning/clone`
2. **Avatar Generation** - `POST /api/avatar/pipeline/image` or `POST /api/avatar/model`
3. **Memory Graph** - `POST /api/memory-graph/create`
4. **Interview Engine** - `POST /api/interview/start`
5. **Multimedia Upload** - `POST /api/multimedia/memory-nodes`

---

## 💻 Frontend Implementation

### 1. Create Error Handler Utility

```javascript
// utils/featureErrorHandler.js
import { useNavigate } from 'react-router-dom';

export function handleFeatureError(error, featureName) {
  const navigate = useNavigate();
  
  // Check if it's a subscription/limit error
  if (error.response?.status === 403) {
    const errorData = error.response.data;
    
    // No subscription
    if (errorData.needsSubscription) {
      showSubscriptionRequiredModal(errorData, () => {
        navigate('/pricing');
      });
      return;
    }
    
    // Limit reached
    if (errorData.limitReached) {
      showLimitReachedModal(errorData, () => {
        navigate('/pricing', { 
          state: { 
            upgradeFrom: errorData.plan,
            feature: featureName 
          } 
        });
      });
      return;
    }
  }
  
  // Other errors
  console.error('Feature error:', error);
  alert(error.response?.data?.message || 'An error occurred');
}

function showSubscriptionRequiredModal(errorData, onRedirect) {
  // Show modal with subscription required message
  const confirmed = confirm(
    `${errorData.message}\n\nWould you like to view our plans?`
  );
  
  if (confirmed) {
    onRedirect();
  }
}

function showLimitReachedModal(errorData, onRedirect) {
  // Show modal with limit details
  const message = `
${errorData.message}

Current Usage: ${errorData.currentUsage} / ${errorData.limit}
Plan: ${errorData.plan.toUpperCase()}
Remaining: ${errorData.remaining}

Would you like to upgrade your plan?
  `;
  
  const confirmed = confirm(message);
  
  if (confirmed) {
    onRedirect();
  }
}
```

---

### 2. Update Feature API Calls

Wrap all feature API calls with error handling:

```javascript
// services/voiceCloningService.js
import { handleFeatureError } from '../utils/featureErrorHandler';

export async function cloneVoice(audioFile, voiceName) {
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
      
      // Handle subscription/limit errors
      if (response.status === 403) {
        handleFeatureError({ response: { status: 403, data: error } }, 'voice_clones');
        return null;
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

---

### 3. Create Subscription Required Modal Component

```javascript
// components/SubscriptionRequiredModal.jsx
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

function SubscriptionRequiredModal({ isOpen, onClose, message }) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleSubscribe = () => {
    navigate('/pricing');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Subscription Required</h2>
          <button onClick={onClose} className="close-button">
            <X size={20} />
          </button>
        </div>
        
        <div className="modal-body">
          <div className="icon-wrapper">
            <span className="icon">🔒</span>
          </div>
          <p>{message}</p>
          <p className="sub-text">
            Subscribe to unlock all features and start using our AI-powered tools.
          </p>
        </div>
        
        <div className="modal-actions">
          <button onClick={onClose} className="btn-secondary">
            Maybe Later
          </button>
          <button onClick={handleSubscribe} className="btn-primary">
            View Plans
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

### 4. Create Limit Reached Modal Component

```javascript
// components/LimitReachedModal.jsx
import { useNavigate } from 'react-router-dom';
import { X, TrendingUp } from 'lucide-react';

function LimitReachedModal({ isOpen, onClose, errorData }) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleUpgrade = () => {
    navigate('/pricing', {
      state: {
        upgradeFrom: errorData.plan,
        highlightPlan: getUpgradePlan(errorData.plan)
      }
    });
    onClose();
  };

  const getUpgradePlan = (currentPlan) => {
    if (currentPlan === 'personal') return 'premium';
    if (currentPlan === 'premium') return 'ultimate';
    return 'ultimate';
  };

  const upgradePlan = getUpgradePlan(errorData.plan);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content limit-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Limit Reached</h2>
          <button onClick={onClose} className="close-button">
            <X size={20} />
          </button>
        </div>
        
        <div className="modal-body">
          <div className="icon-wrapper warning">
            <TrendingUp size={32} />
          </div>
          
          <p className="main-message">{errorData.message}</p>
          
          <div className="usage-stats">
            <div className="stat-item">
              <span className="label">Current Plan:</span>
              <span className="value">{errorData.plan.toUpperCase()}</span>
            </div>
            <div className="stat-item">
              <span className="label">Usage:</span>
              <span className="value">{errorData.currentUsage} / {errorData.limit}</span>
            </div>
            <div className="stat-item">
              <span className="label">Remaining:</span>
              <span className="value">{errorData.remaining}</span>
            </div>
          </div>
          
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${(errorData.currentUsage / errorData.limit) * 100}%` }}
            />
          </div>
          
          <p className="upgrade-suggestion">
            Upgrade to <strong>{upgradePlan.toUpperCase()}</strong> to get more capacity!
          </p>
        </div>
        
        <div className="modal-actions">
          <button onClick={onClose} className="btn-secondary">
            Maybe Later
          </button>
          <button onClick={handleUpgrade} className="btn-primary">
            Upgrade Plan
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

### 5. Global Error Handler (Axios/Fetch Interceptor)

If you're using Axios, set up an interceptor:

```javascript
// utils/axiosConfig.js
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://api.legacyai.com.au'
});

// Request interceptor - add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle subscription/limit errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      const errorData = error.response.data;
      
      // Check if it's a subscription/limit error
      if (errorData.needsSubscription || errorData.limitReached) {
        // Store error for modal to pick up
        window.dispatchEvent(new CustomEvent('feature-error', {
          detail: errorData
        }));
        
        // Prevent default error handling
        return Promise.reject({
          ...error,
          handled: true
        });
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
```

Then listen for the event in your app:

```javascript
// App.jsx or main component
useEffect(() => {
  const handleFeatureError = (event) => {
    const errorData = event.detail;
    
    if (errorData.needsSubscription) {
      setShowSubscriptionModal(true);
      setSubscriptionMessage(errorData.message);
    } else if (errorData.limitReached) {
      setShowLimitModal(true);
      setLimitErrorData(errorData);
    }
  };

  window.addEventListener('feature-error', handleFeatureError);
  
  return () => {
    window.removeEventListener('feature-error', handleFeatureError);
  };
}, []);
```

---

### 6. Pre-check Before Showing UI

Check subscription status before showing feature buttons:

```javascript
// hooks/useFeatureAccess.js
import { useState, useEffect } from 'react';
import { getSubscriptionStatus } from '../services/subscriptionService';
import { getUserUsage } from '../services/subscriptionService';

export function useFeatureAccess(featureName) {
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    checkAccess();
  }, []);

  async function checkAccess() {
    try {
      // Check subscription status
      const subscription = await getSubscriptionStatus();
      
      if (!subscription.hasActiveSubscription) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      // Check usage
      const usageData = await getUserUsage();
      const featureUsage = usageData.stats[featureName];
      
      setUsage(featureUsage);
      setHasAccess(!featureUsage.isUnlimited && featureUsage.remaining > 0 || featureUsage.isUnlimited);
    } catch (error) {
      console.error('Error checking feature access:', error);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  }

  return { hasAccess, loading, usage, refresh: checkAccess };
}
```

Usage in component:

```javascript
function VoiceCloningPage() {
  const { hasAccess, loading, usage } = useFeatureAccess('voice_clones');
  
  if (loading) return <div>Loading...</div>;
  
  if (!hasAccess) {
    return (
      <div className="feature-locked">
        <h2>Voice Cloning</h2>
        <p>You need an active subscription to use this feature.</p>
        <Link to="/pricing">
          <button>View Plans</button>
        </Link>
      </div>
    );
  }
  
  return (
    <div>
      {usage && (
        <div className="usage-banner">
          {usage.remaining} voice clones remaining this month
        </div>
      )}
      {/* Voice cloning UI */}
    </div>
  );
}
```

---

## 📝 Summary Checklist

**Frontend Must Implement:**

- [ ] Handle `needsSubscription: true` errors → Show subscription modal → Redirect to pricing
- [ ] Handle `limitReached: true` errors → Show limit modal with usage stats → Redirect to pricing with upgrade prompt
- [ ] Check `redirectToPricing: true` flag and redirect accordingly
- [ ] Show appropriate modals/alerts for each error type
- [ ] Pre-check subscription before showing feature UI (optional but recommended)
- [ ] Update all 5 feature API calls with error handling

**Error Response Fields to Use:**

- `needsSubscription` - User has no subscription
- `limitReached` - User has subscription but limit is full
- `redirectToPricing` - Should redirect to pricing page
- `hasSubscription` - Whether user has active subscription
- `plan` - Current plan name
- `limit`, `currentUsage`, `remaining` - Usage statistics

---

## 🎨 UI/UX Recommendations

1. **Subscription Required:**
   - Use a lock icon 🔒
   - Clear message: "This feature requires a subscription"
   - Prominent "View Plans" button
   - Show benefits of subscribing

2. **Limit Reached:**
   - Use trending up icon 📈
   - Show usage progress bar
   - Display current plan and usage stats
   - Suggest specific upgrade plan
   - Show what they'll get with upgrade

3. **Pricing Page Integration:**
   - When redirected with `upgradeFrom` state, highlight the recommended plan
   - Show comparison: "You're on Personal, upgrade to Premium for 4x more!"
   - Pre-select the upgrade plan

---

## ✅ Testing

Test these scenarios:

1. **No Subscription User:**
   - Try to create voice clone → Should show subscription required
   - Try to generate avatar → Should show subscription required
   - Try to create memory → Should show subscription required

2. **Personal Plan User (Limit Reached):**
   - Use all 5 voice clones → Try 6th → Should show limit reached
   - Should suggest Premium plan upgrade

3. **Premium Plan User (Limit Reached):**
   - Use all 20 avatars → Try 21st → Should show limit reached
   - Should suggest Ultimate plan upgrade

4. **Ultimate Plan User:**
   - Should never hit limits (unlimited)
   - All features should work without restrictions

---

The backend is ready! Now implement the frontend error handling and modals as described above.

