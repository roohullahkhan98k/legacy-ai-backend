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
      console.log(`🔄 [STRIPE] Creating checkout session - User: ${userId}, Plan: ${planType}`);
      
      const user = await User.findByPk(userId);
      if (!user) {
        console.error(`❌ [STRIPE] User not found: ${userId}`);
        throw new Error('User not found');
      }

      console.log(`✅ [STRIPE] User found: ${user.email} (${userId})`);

      if (!this.priceIds[planType]) {
        console.error(`❌ [STRIPE] Invalid plan type: ${planType}`);
        throw new Error(`Invalid plan type: ${planType}`);
      }

      console.log(`💰 [STRIPE] Price ID for ${planType}: ${this.priceIds[planType]}`);

      // Get or create Stripe customer
      let customerId = user.stripe_customer_id;

      if (!customerId) {
        console.log(`🆕 [STRIPE] Creating new Stripe customer for ${user.email}`);
        // Create new Stripe customer
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            userId: userId.toString()
          }
        });
        customerId = customer.id;
        console.log(`✅ [STRIPE] Stripe customer created: ${customerId}`);

        // Save customer ID to user
        await user.update({ stripe_customer_id: customerId });
        console.log(`💾 [STRIPE] Saved customer ID to user ${userId}`);
      } else {
        console.log(`👤 [STRIPE] Using existing Stripe customer: ${customerId}`);
      }

      // Create checkout session
      console.log(`🔄 [STRIPE] Creating Stripe checkout session...`);
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

      console.log(`✅ [STRIPE] Checkout session created: ${session.id}`);
      console.log(`🔗 [STRIPE] Checkout URL: ${session.url}`);

      return {
        success: true,
        sessionId: session.id,
        url: session.url
      };
    } catch (error) {
      console.error(`❌ [STRIPE] Checkout session error for user ${userId}:`, error.message);
      console.error('Stack:', error.stack);
      throw new Error(`Failed to create checkout session: ${error.message}`);
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(event) {
    try {
      console.log(`🔄 [WEBHOOK] Handling event type: ${event.type}`);
      console.log(`📦 [WEBHOOK] Event ID: ${event.id}, Created: ${new Date(event.created * 1000).toISOString()}`);
      
      switch (event.type) {
        case 'checkout.session.completed':
          console.log(`🛒 [WEBHOOK] Processing checkout.session.completed`);
          await this.handleCheckoutCompleted(event.data.object);
          break;
        
        case 'customer.subscription.created':
          console.log(`🆕 [WEBHOOK] Processing customer.subscription.created`);
          await this.handleSubscriptionUpdated(event.data.object);
          break;
        
        case 'customer.subscription.updated':
          console.log(`🔄 [WEBHOOK] Processing customer.subscription.updated`);
          await this.handleSubscriptionUpdated(event.data.object);
          break;
        
        case 'customer.subscription.deleted':
          console.log(`🗑️  [WEBHOOK] Processing customer.subscription.deleted`);
          await this.handleSubscriptionDeleted(event.data.object);
          break;
        
        case 'invoice.payment_succeeded':
          console.log(`💵 [WEBHOOK] Processing invoice.payment_succeeded`);
          await this.handlePaymentSucceeded(event.data.object);
          break;
        
        case 'invoice.payment_failed':
          console.log(`❌ [WEBHOOK] Processing invoice.payment_failed`);
          await this.handlePaymentFailed(event.data.object);
          break;
        
        default:
          console.log(`⚠️  [WEBHOOK] Unhandled event type: ${event.type}`);
      }

      console.log(`✅ [WEBHOOK] Successfully processed event: ${event.type}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ [WEBHOOK] Error handling event ${event.type}:`, error.message);
      console.error('Stack:', error.stack);
      throw error;
    }
  }

  /**
   * Handle checkout session completed
   */
  async handleCheckoutCompleted(session) {
    console.log(`🛒 [CHECKOUT] Processing checkout completion - Session: ${session.id}`);
    const userId = session.metadata?.userId;
    const planType = session.metadata?.planType;

    console.log(`📋 [CHECKOUT] Metadata - UserId: ${userId}, PlanType: ${planType}`);

    if (!userId || !planType) {
      console.error(`❌ [CHECKOUT] Missing metadata - userId: ${userId}, planType: ${planType}`);
      throw new Error('Missing userId or planType in session metadata');
    }

    // Get subscription from Stripe
    console.log(`🔄 [CHECKOUT] Retrieving subscription from Stripe: ${session.subscription}`);
    const subscription = await stripe.subscriptions.retrieve(session.subscription);
    console.log(`✅ [CHECKOUT] Subscription retrieved - Status: ${subscription.status}, Plan: ${subscription.items.data[0]?.price.id}`);

    // Create or update subscription record
    console.log(`💾 [CHECKOUT] Creating/updating subscription in database`);
    await this.createOrUpdateSubscription(userId, subscription, planType);
    console.log(`✅ [CHECKOUT] Subscription saved to database`);
  }

  /**
   * Handle subscription updated
   */
  async handleSubscriptionUpdated(stripeSubscription) {
    console.log(`🔄 [SUBSCRIPTION] Processing subscription update - ID: ${stripeSubscription.id}`);
    console.log(`📊 [SUBSCRIPTION] Status: ${stripeSubscription.status}, Customer: ${stripeSubscription.customer}`);
    
    const customer = await stripe.customers.retrieve(stripeSubscription.customer);
    console.log(`👤 [SUBSCRIPTION] Customer retrieved: ${customer.email}`);
    
    let userId = customer.metadata?.userId;

    if (!userId) {
      console.log(`🔍 [SUBSCRIPTION] UserId not in metadata, searching by stripe_customer_id`);
      // Try to find user by stripe_customer_id
      const user = await User.findOne({
        where: { stripe_customer_id: stripeSubscription.customer }
      });
      if (!user) {
        console.error(`❌ [SUBSCRIPTION] User not found for customer: ${stripeSubscription.customer}`);
        throw new Error('User not found for subscription');
      }
      userId = user.id;
      console.log(`✅ [SUBSCRIPTION] User found: ${userId}`);
    } else {
      console.log(`✅ [SUBSCRIPTION] UserId from metadata: ${userId}`);
    }

    // Determine plan type from price ID
    const priceId = stripeSubscription.items.data[0]?.price.id;
    console.log(`💰 [SUBSCRIPTION] Price ID: ${priceId}`);
    const planType = this.getPlanTypeFromPriceId(priceId);
    console.log(`📦 [SUBSCRIPTION] Plan type determined: ${planType}`);

    await this.createOrUpdateSubscription(userId, stripeSubscription, planType);
    console.log(`✅ [SUBSCRIPTION] Subscription updated in database`);
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
    console.log(`💾 [DB] Creating/updating subscription - User: ${userId}, Stripe Sub: ${stripeSubscription.id}, Plan: ${planType}`);
    
    // Safely convert Unix timestamps to Date objects
    const periodStart = stripeSubscription.current_period_start 
      ? new Date(stripeSubscription.current_period_start * 1000)
      : null;
    const periodEnd = stripeSubscription.current_period_end 
      ? new Date(stripeSubscription.current_period_end * 1000)
      : null;
    
    console.log(`📅 [DB] Period: ${periodStart ? periodStart.toISOString() : 'null'} to ${periodEnd ? periodEnd.toISOString() : 'null'}`);
    
    // Map Stripe status to our ENUM values
    let status = stripeSubscription.status || 'inactive';
    if (!['active', 'inactive', 'trialing', 'canceled', 'past_due', 'unpaid', 'incomplete', 'incomplete_expired'].includes(status)) {
      console.log(`⚠️  [DB] Unknown status "${status}", defaulting to "inactive"`);
      status = 'inactive';
    }
    console.log(`📊 [DB] Status: ${status}`);
    
    // Update or create subscription
    const [subscription, created] = await Subscription.findOrCreate({
      where: { stripe_subscription_id: stripeSubscription.id },
      defaults: {
        user_id: userId,
        stripe_customer_id: stripeSubscription.customer,
        stripe_subscription_id: stripeSubscription.id,
        plan_type: planType,
        status: status,
        current_period_start: periodStart,
        current_period_end: periodEnd,
        cancel_at_period_end: stripeSubscription.cancel_at_period_end || false,
        metadata: stripeSubscription
      }
    });

    if (created) {
      console.log(`✅ [DB] Subscription CREATED - ID: ${subscription.id}, User: ${userId}, Plan: ${planType}, Status: ${status}`);
    } else {
      console.log(`🔄 [DB] Subscription EXISTS - Updating - ID: ${subscription.id}`);
      await subscription.update({
        plan_type: planType,
        status: status,
        current_period_start: periodStart,
        current_period_end: periodEnd,
        cancel_at_period_end: stripeSubscription.cancel_at_period_end || false,
        metadata: stripeSubscription
      });
      console.log(`✅ [DB] Subscription UPDATED - ID: ${subscription.id}, Plan: ${planType}, Status: ${status}`);
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
      console.log(`🚫 [CANCEL] User ${userId} requesting cancellation`);
      
      const subscription = await Subscription.findOne({
        where: { user_id: userId, status: 'active' }
      });

      if (!subscription) {
        console.error(`❌ [CANCEL] No active subscription found for user ${userId}`);
        throw new Error('No active subscription found');
      }

      console.log(`✅ [CANCEL] Found subscription ${subscription.id} (Stripe: ${subscription.stripe_subscription_id})`);
      console.log(`🔄 [CANCEL] Updating Stripe subscription to cancel at period end`);

      // Cancel at period end
      const canceledSubscription = await stripe.subscriptions.update(
        subscription.stripe_subscription_id,
        { cancel_at_period_end: true }
      );

      console.log(`✅ [CANCEL] Stripe subscription updated - Status: ${canceledSubscription.status}`);

      await subscription.update({
        cancel_at_period_end: true,
        status: canceledSubscription.status
      });

      console.log(`✅ [CANCEL] Database updated - Subscription will cancel at period end`);
      return { success: true, message: 'Subscription will cancel at period end' };
    } catch (error) {
      console.error(`❌ [CANCEL] Error for user ${userId}:`, error.message);
      throw new Error(`Failed to cancel subscription: ${error.message}`);
    }
  }

  /**
   * Get subscription status for user
   */
  async getSubscriptionStatus(userId) {
    console.log(`📊 [STATUS] Getting subscription status for user ${userId}`);
    
    const subscription = await Subscription.findOne({
      where: { user_id: userId },
      order: [['created_at', 'DESC']]
    });

    if (!subscription) {
      console.log(`ℹ️  [STATUS] No subscription found for user ${userId} - returning free plan`);
      return {
        plan: 'free',
        status: 'inactive',
        hasActiveSubscription: false
      };
    }

    const status = {
      plan: subscription.plan_type,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      hasActiveSubscription: subscription.status === 'active' || subscription.status === 'trialing'
    };
    
    console.log(`✅ [STATUS] Status for user ${userId}:`, JSON.stringify(status, null, 2));
    return status;
  }
}

module.exports = new StripeService();

