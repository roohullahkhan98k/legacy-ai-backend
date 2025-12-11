const stripeService = require('../services/stripeService');

class SubscriptionController {
  /**
   * Create checkout session
   * POST /api/subscription/checkout
   */
  async createCheckout(req, res) {
    try {
      const { planType } = req.body;
      const userId = req.user.id; // From auth middleware

      console.log(`💳 [CHECKOUT] User ${userId} requesting checkout for plan: ${planType}`);

      if (!planType || !['personal', 'premium', 'ultimate'].includes(planType)) {
        console.error(`❌ [CHECKOUT] Invalid plan type: ${planType}`);
        return res.status(400).json({
          success: false,
          error: 'Invalid plan type. Must be: personal, premium, or ultimate'
        });
      }

      console.log(`🔄 [CHECKOUT] Creating checkout session for user ${userId}, plan ${planType}`);
      const result = await stripeService.createCheckoutSession(userId, planType);
      console.log(`✅ [CHECKOUT] Checkout session created: ${result.sessionId} for user ${userId}`);

      res.json({
        success: true,
        sessionId: result.sessionId,
        url: result.url
      });
    } catch (error) {
      console.error(`❌ [CHECKOUT] Error for user ${req.user.id}:`, error.message);
      console.error('Stack:', error.stack);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get subscription status
   * GET /api/subscription/status
   */
  async getStatus(req, res) {
    try {
      const userId = req.user.id;
      console.log(`📊 [STATUS] Getting subscription status for user ${userId}`);
      
      const status = await stripeService.getSubscriptionStatus(userId);
      console.log(`✅ [STATUS] Status retrieved for user ${userId}:`, JSON.stringify(status, null, 2));

      res.json({
        success: true,
        subscription: status
      });
    } catch (error) {
      console.error(`❌ [STATUS] Error for user ${req.user.id}:`, error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Cancel subscription
   * POST /api/subscription/cancel
   */
  async cancel(req, res) {
    try {
      const userId = req.user.id;
      console.log(`🚫 [CANCEL] User ${userId} requesting subscription cancellation`);
      
      const result = await stripeService.cancelSubscription(userId);
      console.log(`✅ [CANCEL] Subscription cancelled for user ${userId}: ${result.message}`);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error(`❌ [CANCEL] Error for user ${req.user.id}:`, error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Change subscription plan (upgrade/downgrade)
   * POST /api/subscription/change-plan
   */
  async changePlan(req, res) {
    try {
      const { planType } = req.body;
      const userId = req.user.id;

      console.log(`🔄 [CHANGE_PLAN] User ${userId} requesting plan change to: ${planType}`);

      if (!planType || !['personal', 'premium', 'ultimate'].includes(planType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid plan type. Must be: personal, premium, or ultimate'
        });
      }

      const result = await stripeService.changePlan(userId, planType);
      console.log(`✅ [CHANGE_PLAN] Plan changed for user ${userId}`);

      res.json(result);
    } catch (error) {
      console.error(`❌ [CHANGE_PLAN] Error for user ${req.user.id}:`, error.message);
      
      // Check if error is a downgrade block error
      try {
        const errorData = JSON.parse(error.message);
        if (errorData.error === 'Downgrade not allowed') {
          return res.status(403).json({
            success: false,
            error: errorData.error,
            message: errorData.message,
            warnings: errorData.warnings,
            blockedFeatures: errorData.blockedFeatures
          });
        }
      } catch (parseError) {
        // Not a JSON error, continue with normal error handling
      }
      
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Resume canceled subscription
   * POST /api/subscription/resume
   */
  async resume(req, res) {
    try {
      const userId = req.user.id;
      console.log(`▶️  [RESUME] User ${userId} requesting to resume subscription`);
      
      const result = await stripeService.resumeSubscription(userId);
      console.log(`✅ [RESUME] Subscription resumed for user ${userId}`);

      res.json(result);
    } catch (error) {
      console.error(`❌ [RESUME] Error for user ${req.user.id}:`, error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get billing dashboard
   * GET /api/subscription/billing
   */
  async getBilling(req, res) {
    try {
      const userId = req.user.id;
      console.log(`📊 [BILLING] Getting billing dashboard for user ${userId}`);
      
      const dashboard = await stripeService.getBillingDashboard(userId);
      console.log(`✅ [BILLING] Dashboard retrieved for user ${userId}`);

      res.json({
        success: true,
        ...dashboard
      });
    } catch (error) {
      console.error(`❌ [BILLING] Error for user ${req.user.id}:`, error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Handle Stripe webhook
   * POST /api/subscription/webhook
   */
  async webhook(req, res) {
    try {
      console.log('🔔 Webhook received');
      const sig = req.headers['stripe-signature'];
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!webhookSecret) {
        console.error('❌ Webhook secret not configured');
        return res.status(500).json({ error: 'Webhook secret not configured' });
      }

      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      let event;

      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        console.log(`✅ Webhook verified: ${event.type} (ID: ${event.id})`);
      } catch (err) {
        console.error('❌ Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      // Handle the event
      console.log(`🔄 Processing webhook event: ${event.type}`);
      await stripeService.handleWebhook(event);
      console.log(`✅ Webhook processed successfully: ${event.type}`);

      res.json({ received: true });
    } catch (error) {
      console.error('❌ Webhook error:', error.message);
      console.error('Stack:', error.stack);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get available plans
   * GET /api/subscription/plans
   */
  async getPlans(req, res) {
    try {
      const plans = {
        personal: {
          name: 'Personal',
          price: 9.99,
          currency: 'AUD',
          features: [
            'Basic AI chat + memory',
            'Limited monthly avatar generation (5 per month)',
            'Basic storage package',
            'Standard support'
          ]
        },
        premium: {
          name: 'Premium',
          price: 24.99,
          currency: 'AUD',
          features: [
            'Everything in Personal',
            'Higher avatar generation limit (20 per month)',
            'Full memory graph',
            'Advanced AI features',
            'Priority processing',
            'Larger storage'
          ]
        },
        ultimate: {
          name: 'Ultimate',
          price: 44.99,
          currency: 'AUD',
          features: [
            'Everything in Premium',
            'Unlimited avatar generation',
            'Highest priority GPU queue',
            'Full access to all features',
            'Maximum storage',
            'Future premium modules included'
          ]
        }
      };

      res.json({
        success: true,
        plans
      });
    } catch (error) {
      console.error('Get plans error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new SubscriptionController();

