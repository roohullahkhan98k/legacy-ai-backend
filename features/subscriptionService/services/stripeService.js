const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Subscription = require('../models/Subscription');
const User = require('../../../common/models/User');

class StripeService {
  constructor() {
    this.priceIds = {
      personal: process.env.STRIPE_PRICE_PERSONAL,
      premium: process.env.STRIPE_PRICE_PREMIUM,
      ultimate: process.env.STRIPE_PRICE_ULTIMATE
    };
  }

  /**
   * Create Stripe checkout session for subscription
   */
  async createCheckoutSession(userId, planType) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (!this.priceIds[planType]) {
        throw new Error(`Invalid plan type: ${planType}`);
      }

      // Get or create Stripe customer
      let customerId = user.stripe_customer_id;

      if (!customerId) {
        // Create new Stripe customer
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            userId: userId.toString()
          }
        });
        customerId = customer.id;

        // Save customer ID to user
        await user.update({ stripe_customer_id: customerId });
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: this.priceIds[planType],
            quantity: 1
          }
        ],
        mode: 'subscription',
        success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/subscription/cancel`,
        metadata: {
          userId: userId.toString(),
          planType: planType
        }
      });

      return {
        success: true,
        sessionId: session.id,
        url: session.url
      };
    } catch (error) {
      console.error('Stripe checkout session error:', error);
      throw new Error(`Failed to create checkout session: ${error.message}`);
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(event) {
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object);
          break;
        
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;
        
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;
        
        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;
        
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;
        
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Webhook handling error:', error);
      throw error;
    }
  }

  /**
   * Handle checkout session completed
   */
  async handleCheckoutCompleted(session) {
    const userId = session.metadata?.userId;
    const planType = session.metadata?.planType;

    if (!userId || !planType) {
      throw new Error('Missing userId or planType in session metadata');
    }

    // Get subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(session.subscription);

    // Create or update subscription record
    await this.createOrUpdateSubscription(userId, subscription, planType);
  }

  /**
   * Handle subscription updated
   */
  async handleSubscriptionUpdated(stripeSubscription) {
    const customer = await stripe.customers.retrieve(stripeSubscription.customer);
    const userId = customer.metadata?.userId;

    if (!userId) {
      // Try to find user by stripe_customer_id
      const user = await User.findOne({
        where: { stripe_customer_id: stripeSubscription.customer }
      });
      if (!user) {
        throw new Error('User not found for subscription');
      }
      userId = user.id;
    }

    // Determine plan type from price ID
    const planType = this.getPlanTypeFromPriceId(stripeSubscription.items.data[0]?.price.id);

    await this.createOrUpdateSubscription(userId, stripeSubscription, planType);
  }

  /**
   * Handle subscription deleted
   */
  async handleSubscriptionDeleted(stripeSubscription) {
    const subscription = await Subscription.findOne({
      where: { stripe_subscription_id: stripeSubscription.id }
    });

    if (subscription) {
      await subscription.update({
        status: 'canceled',
        canceled_at: new Date(),
        cancel_at_period_end: false
      });
    }
  }

  /**
   * Handle payment succeeded
   */
  async handlePaymentSucceeded(invoice) {
    if (invoice.subscription) {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
      await this.handleSubscriptionUpdated(subscription);
    }
  }

  /**
   * Handle payment failed
   */
  async handlePaymentFailed(invoice) {
    if (invoice.subscription) {
      const subscription = await Subscription.findOne({
        where: { stripe_subscription_id: invoice.subscription }
      });

      if (subscription) {
        await subscription.update({ status: 'past_due' });
      }
    }
  }

  /**
   * Create or update subscription in database
   */
  async createOrUpdateSubscription(userId, stripeSubscription, planType) {
    // Update or create subscription
    const [subscription, created] = await Subscription.findOrCreate({
      where: { stripe_subscription_id: stripeSubscription.id },
      defaults: {
        user_id: userId,
        stripe_customer_id: stripeSubscription.customer,
        stripe_subscription_id: stripeSubscription.id,
        plan_type: planType,
        status: stripeSubscription.status,
        current_period_start: new Date(stripeSubscription.current_period_start * 1000),
        current_period_end: new Date(stripeSubscription.current_period_end * 1000),
        cancel_at_period_end: stripeSubscription.cancel_at_period_end,
        metadata: stripeSubscription
      }
    });

    if (!created) {
      await subscription.update({
        plan_type: planType,
        status: stripeSubscription.status,
        current_period_start: new Date(stripeSubscription.current_period_start * 1000),
        current_period_end: new Date(stripeSubscription.current_period_end * 1000),
        cancel_at_period_end: stripeSubscription.cancel_at_period_end,
        metadata: stripeSubscription
      });
    }

    // Ensure user has stripe_customer_id
    const user = await User.findByPk(userId);
    if (user && !user.stripe_customer_id) {
      await user.update({ stripe_customer_id: stripeSubscription.customer });
    }

    return subscription;
  }

  /**
   * Get plan type from Stripe price ID
   */
  getPlanTypeFromPriceId(priceId) {
    if (priceId === this.priceIds.personal) return 'personal';
    if (priceId === this.priceIds.premium) return 'premium';
    if (priceId === this.priceIds.ultimate) return 'ultimate';
    return 'personal'; // default
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId) {
    try {
      const subscription = await Subscription.findOne({
        where: { user_id: userId, status: 'active' }
      });

      if (!subscription) {
        throw new Error('No active subscription found');
      }

      // Cancel at period end
      const canceledSubscription = await stripe.subscriptions.update(
        subscription.stripe_subscription_id,
        { cancel_at_period_end: true }
      );

      await subscription.update({
        cancel_at_period_end: true,
        status: canceledSubscription.status
      });

      return { success: true, message: 'Subscription will cancel at period end' };
    } catch (error) {
      console.error('Cancel subscription error:', error);
      throw new Error(`Failed to cancel subscription: ${error.message}`);
    }
  }

  /**
   * Get subscription status for user
   */
  async getSubscriptionStatus(userId) {
    const subscription = await Subscription.findOne({
      where: { user_id: userId },
      order: [['created_at', 'DESC']]
    });

    if (!subscription) {
      return {
        plan: 'free',
        status: 'inactive',
        hasActiveSubscription: false
      };
    }

    return {
      plan: subscription.plan_type,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      hasActiveSubscription: subscription.status === 'active'
    };
  }
}

module.exports = new StripeService();

