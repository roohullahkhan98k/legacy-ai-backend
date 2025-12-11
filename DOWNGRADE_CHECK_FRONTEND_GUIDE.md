# Downgrade Protection - Frontend Integration Guide

## Overview

When a user tries to downgrade their subscription plan, the backend checks if their current usage exceeds the new plan's limits. If it does, the downgrade is blocked and the frontend receives detailed information about which features need cleanup.

## API Endpoint

**POST** `/api/subscription/change-plan`

### Request
```json
{
  "planType": "personal" | "premium" | "ultimate"
}
```

### Success Response (200)
```json
{
  "success": true,
  "message": "Subscription changed to personal plan",
  "subscription": {
    "plan": "personal",
    "status": "active",
    "currentPeriodEnd": "2026-01-10T13:13:44.000Z"
  }
}
```

### Error Response - Downgrade Blocked (403)
```json
{
  "success": false,
  "error": "Downgrade not allowed",
  "message": "Cannot downgrade: You have 2 feature(s) that exceed the personal plan limits. Please delete items to continue.",
  "warnings": [
    {
      "feature": "voice_clones",
      "currentUsage": 2,
      "newLimit": 1,
      "overage": 1,
      "message": "You have 2 voice clones, but personal plan only allows 1. Please delete 1 item(s) before downgrading."
    },
    {
      "feature": "avatar_generations",
      "currentUsage": 2,
      "newLimit": 1,
      "overage": 1,
      "message": "You have 2 avatar generations, but personal plan only allows 1. Please delete 1 item(s) before downgrading."
    }
  ],
  "blockedFeatures": [
    // Same as warnings array
  ]
}
```

## Frontend Implementation

### 1. Basic Error Handling

```javascript
async function changePlan(planType) {
  try {
    const response = await fetch('/api/subscription/change-plan', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ planType })
    });

    const data = await response.json();

    if (response.status === 403 && data.error === 'Downgrade not allowed') {
      // Show downgrade blocked modal
      showDowngradeBlockedModal(data);
      return;
    }

    if (!response.ok) {
      throw new Error(data.error || 'Failed to change plan');
    }

    // Success - plan changed
    showSuccessMessage(data.message);
    refreshSubscriptionData();
  } catch (error) {
    console.error('Plan change error:', error);
    showErrorMessage(error.message);
  }
}
```

### 2. Show Downgrade Blocked Modal

```javascript
function showDowngradeBlockedModal(errorData) {
  const modal = document.createElement('div');
  modal.className = 'downgrade-blocked-modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h2>⚠️ Cannot Downgrade</h2>
      <p>${errorData.message}</p>
      
      <div class="warnings-list">
        <h3>Features that need cleanup:</h3>
        ${errorData.warnings.map(warning => `
          <div class="warning-item">
            <strong>${formatFeatureName(warning.feature)}</strong>
            <p>Current: ${warning.currentUsage} | New Limit: ${warning.newLimit}</p>
            <p class="overage">You need to delete <strong>${warning.overage}</strong> item(s)</p>
          </div>
        `).join('')}
      </div>
      
      <div class="modal-actions">
        <button onclick="closeModal()">Cancel</button>
        <button onclick="goToCleanup()">Go to Cleanup</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function formatFeatureName(feature) {
  const names = {
    'voice_clones': 'Voice Clones',
    'avatar_generations': 'Avatar Generations',
    'memory_graph_operations': 'Memory Graph Operations',
    'interview_sessions': 'Interview Sessions',
    'multimedia_uploads': 'Multimedia Uploads'
  };
  return names[feature] || feature.replace(/_/g, ' ');
}
```

### 3. React Component Example

```jsx
import React, { useState } from 'react';

function ChangePlanButton({ currentPlan, targetPlan, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [blockedFeatures, setBlockedFeatures] = useState(null);

  const handleChangePlan = async () => {
    setLoading(true);
    setError(null);
    setBlockedFeatures(null);

    try {
      const response = await fetch('/api/subscription/change-plan', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ planType: targetPlan })
      });

      const data = await response.json();

      if (response.status === 403 && data.error === 'Downgrade not allowed') {
        setBlockedFeatures(data.warnings);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change plan');
      }

      // Success
      onSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button onClick={handleChangePlan} disabled={loading}>
        {loading ? 'Changing...' : `Switch to ${targetPlan}`}
      </button>

      {error && (
        <div className="error-message">{error}</div>
      )}

      {blockedFeatures && (
        <DowngradeBlockedModal
          warnings={blockedFeatures}
          onClose={() => setBlockedFeatures(null)}
        />
      )}
    </>
  );
}

function DowngradeBlockedModal({ warnings, onClose }) {
  const featureNames = {
    'voice_clones': 'Voice Clones',
    'avatar_generations': 'Avatar Generations',
    'memory_graph_operations': 'Memory Graph Operations',
    'interview_sessions': 'Interview Sessions',
    'multimedia_uploads': 'Multimedia Uploads'
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>⚠️ Cannot Downgrade</h2>
        <p>You need to delete some items before downgrading.</p>
        
        <div className="warnings-list">
          {warnings.map((warning, index) => (
            <div key={index} className="warning-item">
              <h4>{featureNames[warning.feature] || warning.feature}</h4>
              <p>
                You have <strong>{warning.currentUsage}</strong> items, 
                but the new plan only allows <strong>{warning.newLimit}</strong>
              </p>
              <p className="overage">
                Delete <strong>{warning.overage}</strong> item(s) to continue
              </p>
            </div>
          ))}
        </div>

        <div className="modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button onClick={() => {
            // Navigate to cleanup page or show cleanup UI
            window.location.href = '/dashboard/cleanup';
          }}>
            Go to Cleanup
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 4. Vue Component Example

```vue
<template>
  <div>
    <button @click="changePlan" :disabled="loading">
      {{ loading ? 'Changing...' : `Switch to ${targetPlan}` }}
    </button>

    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="blockedFeatures" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <h2>⚠️ Cannot Downgrade</h2>
        <p>You need to delete some items before downgrading.</p>
        
        <div v-for="(warning, index) in blockedFeatures" :key="index" class="warning-item">
          <h4>{{ formatFeatureName(warning.feature) }}</h4>
          <p>
            You have <strong>{{ warning.currentUsage }}</strong> items, 
            but the new plan only allows <strong>{{ warning.newLimit }}</strong>
          </p>
          <p class="overage">
            Delete <strong>{{ warning.overage }}</strong> item(s) to continue
          </p>
        </div>

        <div class="modal-actions">
          <button @click="closeModal">Cancel</button>
          <button @click="goToCleanup">Go to Cleanup</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      loading: false,
      error: null,
      blockedFeatures: null
    };
  },
  methods: {
    async changePlan() {
      this.loading = true;
      this.error = null;
      this.blockedFeatures = null;

      try {
        const response = await fetch('/api/subscription/change-plan', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ planType: this.targetPlan })
        });

        const data = await response.json();

        if (response.status === 403 && data.error === 'Downgrade not allowed') {
          this.blockedFeatures = data.warnings;
          return;
        }

        if (!response.ok) {
          throw new Error(data.error || 'Failed to change plan');
        }

        // Success
        this.$emit('success', data);
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },
    formatFeatureName(feature) {
      const names = {
        'voice_clones': 'Voice Clones',
        'avatar_generations': 'Avatar Generations',
        'memory_graph_operations': 'Memory Graph Operations',
        'interview_sessions': 'Interview Sessions',
        'multimedia_uploads': 'Multimedia Uploads'
      };
      return names[feature] || feature.replace(/_/g, ' ');
    },
    closeModal() {
      this.blockedFeatures = null;
    },
    goToCleanup() {
      this.$router.push('/dashboard/cleanup');
    }
  }
};
</script>
```

## Feature Names Mapping

Use this mapping to display user-friendly feature names:

```javascript
const FEATURE_NAMES = {
  'voice_clones': 'Voice Clones',
  'avatar_generations': 'Avatar Generations',
  'memory_graph_operations': 'Memory Graph Operations',
  'interview_sessions': 'Interview Sessions',
  'multimedia_uploads': 'Multimedia Uploads'
};
```

## Warning Object Structure

Each warning in the `warnings` array contains:

- `feature`: Feature name (e.g., "voice_clones")
- `currentUsage`: Current number of items used
- `newLimit`: Limit for the new plan
- `overage`: Number of items that need to be deleted (currentUsage - newLimit)
- `message`: Human-readable message explaining what needs to be done

## User Flow

1. User clicks "Downgrade to Personal" button
2. Frontend calls `/api/subscription/change-plan`
3. If downgrade is blocked:
   - Show modal with list of features that need cleanup
   - Display how many items need to be deleted for each feature
   - Provide "Go to Cleanup" button to navigate to deletion pages
4. User deletes excess items
5. User tries downgrade again
6. Downgrade succeeds if usage is within limits

## Testing

To test the downgrade protection:

1. **Setup**: User on Premium plan (limit: 2 for all features)
2. **Create items**: Create 2 voice clones, 2 avatars, etc.
3. **Try downgrade**: Attempt to downgrade to Personal (limit: 1)
4. **Expected**: Should see modal with warnings for all features
5. **Delete items**: Delete 1 voice clone, 1 avatar, etc.
6. **Try again**: Downgrade should now succeed

## Notes

- **Upgrades**: Always allowed (no checks needed)
- **Same plan**: No-op, returns success
- **Downgrades**: Checked before allowing
- **Error handling**: Always check for `403` status and `error === 'Downgrade not allowed'`
- **Multiple features**: All features that exceed limits are listed in `warnings` array

