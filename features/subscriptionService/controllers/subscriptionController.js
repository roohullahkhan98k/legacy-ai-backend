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

      if (!planType || !['personal', 'premium', 'ultimate'].includes(planType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid plan type. Must be: personal, premium, or ultimate'
        });
      }

      const result = await stripeService.createCheckoutSession(userId, planType);

      res.json({
        success: true,
        sessionId: result.sessionId,
        url: result.url
      });
    } catch (error) {
      console.error('Create checkout error:', error);
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
      const status = await stripeService.getSubscriptionStatus(userId);

      res.json({
        success: true,
        subscription: status
      });
    } catch (error) {
      console.error('Get status error:', error);
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
      const result = await stripeService.cancelSubscription(userId);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Cancel subscription error:', error);
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
      const sig = req.headers['stripe-signature'];
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!webhookSecret) {
        return res.status(500).json({ error: 'Webhook secret not configured' });
      }

      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      let event;

      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      // Handle the event
      await stripeService.handleWebhook(event);

      res.json({ received: true });
    } catch (error) {
      console.error('Webhook error:', error);
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

