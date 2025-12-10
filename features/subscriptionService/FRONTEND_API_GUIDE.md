# Subscription Service - Frontend Integration Guide

Complete API documentation for integrating Stripe subscriptions into your frontend application.

## Base URL

```
Production: https://api.legacyai.com.au/api/subscription
Development: http://localhost:3000/api/subscription
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```javascript
headers: {
  'Authorization': `Bearer ${userToken}`,
  'Content-Type': 'application/json'
}
```

---

## 📋 Table of Contents

1. [Get Available Plans](#get-available-plans)
2. [Create Checkout Session](#create-checkout-session)
3. [Get Subscription Status](#get-subscription-status)
4. [Get Billing Dashboard](#get-billing-dashboard)
5. [Change Plan (Upgrade/Downgrade)](#change-plan-upgradedowngrade)
6. [Cancel Subscription](#cancel-subscription)
7. [Resume Subscription](#resume-subscription)
8. [Webhook Handling](#webhook-handling)

---

## 1. Get Available Plans

**GET** `/plans`

Public endpoint - no authentication required.

### Response

```json
{
  "success": true,
  "plans": {
    "personal": {
      "name": "Personal",
      "price": 9.99,
      "currency": "AUD",
      "features": [
        "Basic AI chat + memory",
        "Limited monthly avatar generation (5 per month)",
        "Basic storage package",
        "Standard support"
      ]
    },
    "premium": {
      "name": "Premium",
      "price": 24.99,
      "currency": "AUD",
      "features": [
        "Everything in Personal",
        "Higher avatar generation limit (20 per month)",
        "Full memory graph",
        "Advanced AI features",
        "Priority processing",
        "Larger storage"
      ]
    },
    "ultimate": {
      "name": "Ultimate",
      "price": 44.99,
      "currency": "AUD",
      "features": [
        "Everything in Premium",
        "Unlimited avatar generation",
        "Highest priority GPU queue",
        "Full access to all features",
        "Maximum storage",
        "Future premium modules included"
      ]
    }
  }
}
```

### Example Usage

```javascript
const response = await fetch('https://api.legacyai.com.au/api/subscription/plans');
const data = await response.json();
console.log(data.plans);
```

---

## 2. Create Checkout Session

**POST** `/checkout`

Creates a Stripe Checkout Session and returns the URL to redirect the user.

### Request Body

```json
{
  "planType": "personal" | "premium" | "ultimate"
}
```

### Response

```json
{
  "success": true,
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/c/pay/..."
}
```

### Example Usage

```javascript
const response = await fetch('https://api.legacyai.com.au/api/subscription/checkout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    planType: 'premium'
  })
});

const data = await response.json();
if (data.success) {
  // Redirect user to Stripe Checkout
  window.location.href = data.url;
}
```

### Success/Cancel Pages

After payment, Stripe redirects to:
- **Success**: `https://legacyai.com.au/subscription/success?session_id={CHECKOUT_SESSION_ID}`
- **Cancel**: `https://legacyai.com.au/subscription/cancel`

---

## 3. Get Subscription Status

**GET** `/status`

Get the current subscription status for the authenticated user.

### Response

```json
{
  "success": true,
  "subscription": {
    "plan": "premium" | "personal" | "ultimate" | "free",
    "status": "active" | "inactive" | "trialing" | "canceled" | "past_due" | "unpaid",
    "currentPeriodEnd": "2026-01-10T13:13:44.000Z",
    "cancelAtPeriodEnd": false,
    "hasActiveSubscription": true
  }
}
```

### Example Usage

```javascript
const response = await fetch('https://api.legacyai.com.au/api/subscription/status', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const data = await response.json();
if (data.subscription.hasActiveSubscription) {
  console.log(`User has ${data.subscription.plan} plan`);
  console.log(`Subscription ends: ${data.subscription.currentPeriodEnd}`);
}
```

---

## 4. Get Billing Dashboard

**GET** `/billing`

Get complete billing information including payment method, invoices, and upcoming invoice.

### Response

```json
{
  "success": true,
  "hasSubscription": true,
  "subscription": {
    "id": "5295f1c4-e991-4912-b005-dd32aa3fec06",
    "plan": "premium",
    "status": "active",
    "currentPeriodStart": "2025-12-10T13:13:44.000Z",
    "currentPeriodEnd": "2026-01-10T13:13:44.000Z",
    "cancelAtPeriodEnd": false,
    "canceledAt": null
  },
  "paymentMethod": {
    "id": "pm_1...",
    "type": "card",
    "card": {
      "brand": "visa",
      "last4": "4242",
      "expMonth": 12,
      "expYear": 2025
    }
  },
  "invoices": [
    {
      "id": "in_1...",
      "number": "INV-0001",
      "amount": 24.99,
      "currency": "AUD",
      "status": "paid",
      "created": "2025-12-10T13:13:47.000Z",
      "periodStart": "2025-12-10T13:13:44.000Z",
      "periodEnd": "2026-01-10T13:13:44.000Z",
      "hostedInvoiceUrl": "https://invoice.stripe.com/...",
      "invoicePdf": "https://pay.stripe.com/invoice/.../pdf"
    }
  ],
  "upcomingInvoice": {
    "amount": 24.99,
    "currency": "AUD",
    "periodStart": "2026-01-10T13:13:44.000Z",
    "periodEnd": "2026-02-10T13:13:44.000Z",
    "nextPaymentAttempt": "2026-01-10T13:13:44.000Z"
  }
}
```

### Example Usage

```javascript
const response = await fetch('https://api.legacyai.com.au/api/subscription/billing', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const data = await response.json();

// Display payment method
if (data.paymentMethod) {
  console.log(`Card: ${data.paymentMethod.card.brand} ****${data.paymentMethod.card.last4}`);
}

// Display invoices
data.invoices.forEach(invoice => {
  console.log(`Invoice ${invoice.number}: $${invoice.amount} ${invoice.currency} - ${invoice.status}`);
  // Link to download: invoice.invoicePdf
});

// Display upcoming invoice
if (data.upcomingInvoice) {
  console.log(`Next payment: $${data.upcomingInvoice.amount} on ${data.upcomingInvoice.nextPaymentAttempt}`);
}
```

---

## 5. Change Plan (Upgrade/Downgrade)

**POST** `/change-plan`

Upgrade or downgrade subscription with automatic proration.

### Request Body

```json
{
  "planType": "personal" | "premium" | "ultimate"
}
```

### Response

```json
{
  "success": true,
  "message": "Subscription changed to premium plan",
  "subscription": {
    "plan": "premium",
    "status": "active",
    "currentPeriodEnd": "2026-01-10T13:13:44.000Z"
  }
}
```

### Example Usage

```javascript
const response = await fetch('https://api.legacyai.com.au/api/subscription/change-plan', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    planType: 'ultimate'
  })
});

const data = await response.json();
if (data.success) {
  console.log('Plan upgraded! Proration handled automatically by Stripe');
}
```

### Important Notes

- **Proration**: Stripe automatically calculates and charges/credits the difference
- **Immediate Effect**: Plan change takes effect immediately
- **Billing Cycle**: Billing cycle anchor is set to 'now' for immediate changes

---

## 6. Cancel Subscription

**POST** `/cancel`

Cancel subscription at the end of the current billing period (no refund).

### Response

```json
{
  "success": true,
  "message": "Subscription will cancel at period end"
}
```

### Example Usage

```javascript
const response = await fetch('https://api.legacyai.com.au/api/subscription/cancel', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const data = await response.json();
if (data.success) {
  // Show message to user
  alert('Your subscription will remain active until the end of your billing period. You can resume anytime before then.');
}
```

### Important Notes

- **No Refund**: User keeps access until period end
- **Can Resume**: User can resume before period ends (see Resume endpoint)
- **Status**: Subscription status remains 'active' until period end

---

## 7. Resume Subscription

**POST** `/resume`

Resume a canceled subscription before the period ends.

### Response

```json
{
  "success": true,
  "message": "Subscription resumed successfully",
  "subscription": {
    "plan": "premium",
    "status": "active",
    "cancelAtPeriodEnd": false
  }
}
```

### Example Usage

```javascript
const response = await fetch('https://api.legacyai.com.au/api/subscription/resume', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const data = await response.json();
if (data.success) {
  console.log('Subscription resumed!');
}
```

### Important Notes

- **Only works if**: Subscription is set to cancel at period end
- **Effect**: Cancellation is removed, subscription continues normally

---

## 8. Webhook Handling

Webhooks are handled automatically by the backend. No frontend action required.

### Webhook Events Processed

- `checkout.session.completed` - Payment successful
- `customer.subscription.created` - New subscription
- `customer.subscription.updated` - Subscription changed
- `customer.subscription.deleted` - Subscription canceled
- `invoice.payment_succeeded` - Payment processed
- `invoice.payment_failed` - Payment failed

### Frontend Actions

After successful checkout, poll the status endpoint or wait for webhook processing:

```javascript
// After redirect from Stripe success page
async function checkSubscriptionStatus() {
  const response = await fetch('https://api.legacyai.com.au/api/subscription/status', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  if (data.subscription.hasActiveSubscription) {
    // Subscription is active!
    console.log('Welcome to', data.subscription.plan, 'plan!');
  } else {
    // Wait a bit and check again (webhook might still be processing)
    setTimeout(checkSubscriptionStatus, 2000);
  }
}
```

---

## 🎨 Frontend Implementation Examples

### React Example - Subscription Component

```jsx
import { useState, useEffect } from 'react';

function SubscriptionDashboard() {
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBilling();
  }, []);

  const fetchBilling = async () => {
    try {
      const response = await fetch('https://api.legacyai.com.au/api/subscription/billing', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setBilling(data);
    } catch (error) {
      console.error('Error fetching billing:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (newPlan) => {
    try {
      const response = await fetch('https://api.legacyai.com.au/api/subscription/change-plan', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ planType: newPlan })
      });
      const data = await response.json();
      if (data.success) {
        alert('Plan upgraded successfully!');
        fetchBilling(); // Refresh
      }
    } catch (error) {
      console.error('Error upgrading plan:', error);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Your subscription will remain active until the end of your billing period. Continue?')) {
      return;
    }
    
    try {
      const response = await fetch('https://api.legacyai.com.au/api/subscription/cancel', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        alert('Subscription will cancel at period end. You can resume anytime before then.');
        fetchBilling(); // Refresh
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!billing?.hasSubscription) return <div>No active subscription</div>;

  return (
    <div>
      <h2>Billing Dashboard</h2>
      
      {/* Current Plan */}
      <div>
        <h3>Current Plan: {billing.subscription.plan}</h3>
        <p>Status: {billing.subscription.status}</p>
        <p>Period End: {new Date(billing.subscription.currentPeriodEnd).toLocaleDateString()}</p>
        {billing.subscription.cancelAtPeriodEnd && (
          <p style={{ color: 'orange' }}>Will cancel at period end</p>
        )}
      </div>

      {/* Payment Method */}
      {billing.paymentMethod && (
        <div>
          <h3>Payment Method</h3>
          <p>
            {billing.paymentMethod.card.brand.toUpperCase()} 
            ****{billing.paymentMethod.card.last4}
          </p>
          <p>Expires: {billing.paymentMethod.card.expMonth}/{billing.paymentMethod.card.expYear}</p>
        </div>
      )}

      {/* Upcoming Invoice */}
      {billing.upcomingInvoice && (
        <div>
          <h3>Upcoming Invoice</h3>
          <p>Amount: ${billing.upcomingInvoice.amount} {billing.upcomingInvoice.currency}</p>
          <p>Due: {new Date(billing.upcomingInvoice.nextPaymentAttempt).toLocaleDateString()}</p>
        </div>
      )}

      {/* Invoices */}
      <div>
        <h3>Invoice History</h3>
        {billing.invoices.map(invoice => (
          <div key={invoice.id}>
            <p>
              {invoice.number} - ${invoice.amount} {invoice.currency} 
              ({invoice.status})
            </p>
            <a href={invoice.invoicePdf} target="_blank" rel="noopener noreferrer">
              Download PDF
            </a>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div>
        <button onClick={() => handleUpgrade('premium')}>Upgrade to Premium</button>
        <button onClick={() => handleUpgrade('ultimate')}>Upgrade to Ultimate</button>
        {billing.subscription.cancelAtPeriodEnd ? (
          <button onClick={async () => {
            const response = await fetch('https://api.legacyai.com.au/api/subscription/resume', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });
            const data = await response.json();
            if (data.success) {
              alert('Subscription resumed!');
              fetchBilling();
            }
          }}>
            Resume Subscription
          </button>
        ) : (
          <button onClick={handleCancel}>Cancel Subscription</button>
        )}
      </div>
    </div>
  );
}
```

---

## 📝 Error Handling

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

### Common Error Codes

- `400` - Bad Request (invalid plan type, missing parameters)
- `401` - Unauthorized (invalid or missing token)
- `404` - Not Found (no subscription found)
- `500` - Server Error (Stripe error, database error)

### Example Error Handling

```javascript
try {
  const response = await fetch('https://api.legacyai.com.au/api/subscription/change-plan', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ planType: 'premium' })
  });

  const data = await response.json();
  
  if (!data.success) {
    // Handle error
    console.error('Error:', data.error);
    alert(data.error);
    return;
  }

  // Success
  console.log('Plan changed successfully!');
} catch (error) {
  console.error('Network error:', error);
  alert('Network error. Please try again.');
}
```

---

## 🔐 Security Notes

1. **Never expose Stripe keys** - All Stripe operations happen on the backend
2. **Always validate tokens** - Check JWT token on every request
3. **HTTPS only** - Always use HTTPS in production
4. **Webhook security** - Webhooks are verified by signature (handled by backend)

---

## 📞 Support

For issues or questions:
- Check backend logs: `docker logs ai-prototype-backend -f | grep -E "\[CHECKOUT\]|\[STRIPE\]|\[WEBHOOK\]"`
- Verify webhook configuration in Stripe Dashboard
- Check subscription status in database

---

## ✅ Testing Checklist

- [ ] Can fetch available plans
- [ ] Can create checkout session
- [ ] Can complete payment on Stripe
- [ ] Subscription status updates after payment
- [ ] Can view billing dashboard
- [ ] Can upgrade/downgrade plan (with proration)
- [ ] Can cancel subscription (no refund, access until period end)
- [ ] Can resume canceled subscription
- [ ] Can download invoices
- [ ] Upcoming invoice displays correctly

---

**Last Updated**: December 2025
**API Version**: 1.0.0

