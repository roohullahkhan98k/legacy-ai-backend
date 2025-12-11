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

      // Create checkout session with billing cycle anchor and proration
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
        subscription_data: {
          billing_cycle_anchor: 'now',
          metadata: {
            userId: userId.toString(),
            planType: planType
          }
        },
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
      
      // Build update object - only include period dates if they have valid values
      // This prevents overwriting valid dates with null when webhooks don't include them
      const updateData = {
        plan_type: planType,
        status: status,
        cancel_at_period_end: stripeSubscription.cancel_at_period_end || false,
        metadata: stripeSubscription
      };
      
      // Only update period dates if we have valid values from Stripe
      // This preserves existing dates when webhooks don't include them
      if (periodStart) {
        updateData.current_period_start = periodStart;
      }
      if (periodEnd) {
        updateData.current_period_end = periodEnd;
      }
      
      await subscription.update(updateData);
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

      // Safely convert Unix timestamps to Date objects
      const periodStart = canceledSubscription.current_period_start 
        ? new Date(canceledSubscription.current_period_start * 1000)
        : subscription.current_period_start;
      const periodEnd = canceledSubscription.current_period_end 
        ? new Date(canceledSubscription.current_period_end * 1000)
        : subscription.current_period_end;

      await subscription.update({
        cancel_at_period_end: true,
        status: canceledSubscription.status,
        current_period_start: periodStart,
        current_period_end: periodEnd
      });

      console.log(`✅ [CANCEL] Database updated - Subscription will cancel at period end`);
      return { success: true, message: 'Subscription will cancel at period end' };
    } catch (error) {
      console.error(`❌ [CANCEL] Error for user ${userId}:`, error.message);
      throw new Error(`Failed to cancel subscription: ${error.message}`);
    }
  }

  /**
   * Upgrade or downgrade subscription with proration
   */
  async changePlan(userId, newPlanType) {
    try {
      console.log(`🔄 [CHANGE_PLAN] User ${userId} requesting plan change to: ${newPlanType}`);
      
      if (!this.priceIds[newPlanType]) {
        console.error(`❌ [CHANGE_PLAN] Invalid plan type: ${newPlanType}`);
        throw new Error(`Invalid plan type: ${newPlanType}`);
      }

      const subscription = await Subscription.findOne({
        where: { user_id: userId, status: 'active' }
      });

      if (!subscription) {
        console.error(`❌ [CHANGE_PLAN] No active subscription found for user ${userId}`);
        throw new Error('No active subscription found');
      }

      console.log(`✅ [CHANGE_PLAN] Found subscription ${subscription.id}, current plan: ${subscription.plan_type}`);
      console.log(`💰 [CHANGE_PLAN] New price ID: ${this.priceIds[newPlanType]}`);

      // Get current subscription from Stripe
      const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
      const currentItemId = stripeSubscription.items.data[0].id;

      console.log(`🔄 [CHANGE_PLAN] Updating subscription with proration...`);

      // Update subscription with proration
      const updatedSubscription = await stripe.subscriptions.update(
        subscription.stripe_subscription_id,
        {
          items: [{
            id: currentItemId,
            price: this.priceIds[newPlanType],
          }],
          proration_behavior: 'create_prorations',
          billing_cycle_anchor: 'now',
          metadata: {
            userId: userId.toString(),
            planType: newPlanType
          }
        }
      );

      console.log(`✅ [CHANGE_PLAN] Stripe subscription updated - New plan: ${newPlanType}`);

      // Get old plan before updating
      const oldPlan = subscription.plan_type;

      // Update database
      await this.createOrUpdateSubscription(userId, updatedSubscription, newPlanType);

      // Handle feature limit adjustments for plan change
      if (oldPlan !== newPlanType) {
        const featureLimitService = require('./FeatureLimitService');
        await featureLimitService.handlePlanChange(userId, oldPlan, newPlanType);
        console.log(`✅ [CHANGE_PLAN] Feature limits adjusted for plan change: ${oldPlan} -> ${newPlanType}`);
      }

      console.log(`✅ [CHANGE_PLAN] Plan changed successfully to ${newPlanType}`);
      return {
        success: true,
        message: `Subscription changed to ${newPlanType} plan`,
        subscription: {
          plan: newPlanType,
          status: updatedSubscription.status,
          currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000)
        }
      };
    } catch (error) {
      console.error(`❌ [CHANGE_PLAN] Error for user ${userId}:`, error.message);
      throw new Error(`Failed to change plan: ${error.message}`);
    }
  }

  /**
   * Resume canceled subscription
   */
  async resumeSubscription(userId) {
    try {
      console.log(`▶️  [RESUME] User ${userId} requesting to resume subscription`);
      
      const subscription = await Subscription.findOne({
        where: { user_id: userId }
      });

      if (!subscription) {
        console.error(`❌ [RESUME] No subscription found for user ${userId}`);
        throw new Error('No subscription found');
      }

      if (subscription.status === 'active' && !subscription.cancel_at_period_end) {
        console.log(`ℹ️  [RESUME] Subscription is already active`);
        return {
          success: true,
          message: 'Subscription is already active'
        };
      }

      console.log(`🔄 [RESUME] Resuming Stripe subscription...`);

      // Resume subscription in Stripe
      const resumedSubscription = await stripe.subscriptions.update(
        subscription.stripe_subscription_id,
        {
          cancel_at_period_end: false
        }
      );

      console.log(`✅ [RESUME] Stripe subscription resumed`);

      // Update database
      await subscription.update({
        cancel_at_period_end: false,
        status: resumedSubscription.status
      });

      console.log(`✅ [RESUME] Subscription resumed successfully`);
      return {
        success: true,
        message: 'Subscription resumed successfully',
        subscription: {
          plan: subscription.plan_type,
          status: resumedSubscription.status,
          cancelAtPeriodEnd: false
        }
      };
    } catch (error) {
      console.error(`❌ [RESUME] Error for user ${userId}:`, error.message);
      throw new Error(`Failed to resume subscription: ${error.message}`);
    }
  }

  /**
   * Get billing dashboard data
   */
  async getBillingDashboard(userId) {
    try {
      console.log(`📊 [BILLING] Getting billing dashboard for user ${userId}`);
      
      const subscription = await Subscription.findOne({
        where: { user_id: userId },
        order: [['created_at', 'DESC']]
      });

      if (!subscription) {
        return {
          hasSubscription: false,
          subscription: null,
          paymentMethod: null,
          invoices: [],
          upcomingInvoice: null
        };
      }

      const user = await User.findByPk(userId);
      if (!user || !user.stripe_customer_id) {
        throw new Error('Stripe customer not found');
      }

      // Get payment methods
      const paymentMethods = await stripe.paymentMethods.list({
        customer: user.stripe_customer_id,
        type: 'card'
      });

      // Get invoices
      const invoices = await stripe.invoices.list({
        customer: user.stripe_customer_id,
        limit: 12
      });

      // Get upcoming invoice
      let upcomingInvoice = null;
      try {
        upcomingInvoice = await stripe.invoices.retrieveUpcoming({
          customer: user.stripe_customer_id,
          subscription: subscription.stripe_subscription_id
        });
      } catch (error) {
        console.log(`ℹ️  [BILLING] No upcoming invoice: ${error.message}`);
      }

      // Fetch fresh subscription data from Stripe if dates are missing
      let currentPeriodStart = subscription.current_period_start;
      let currentPeriodEnd = subscription.current_period_end;
      
      if ((!currentPeriodStart || !currentPeriodEnd) && subscription.stripe_subscription_id) {
        try {
          console.log(`🔄 [BILLING] Fetching fresh subscription data from Stripe`);
          const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
          
          if (stripeSubscription.current_period_start && !currentPeriodStart) {
            currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
          }
          if (stripeSubscription.current_period_end && !currentPeriodEnd) {
            currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
          }
          
          // Update database with fresh dates if we got them
          if (currentPeriodStart && currentPeriodEnd) {
            await subscription.update({
              current_period_start: currentPeriodStart,
              current_period_end: currentPeriodEnd
            });
            console.log(`✅ [BILLING] Updated database with fresh period dates`);
          }
        } catch (error) {
          console.log(`⚠️  [BILLING] Could not fetch fresh subscription data: ${error.message}`);
        }
      }

      console.log(`✅ [BILLING] Dashboard data retrieved`);

      return {
        hasSubscription: true,
        subscription: {
          id: subscription.id,
          plan: subscription.plan_type,
          status: subscription.status,
          currentPeriodStart: currentPeriodStart,
          currentPeriodEnd: currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          canceledAt: subscription.canceled_at
        },
        paymentMethod: paymentMethods.data[0] ? {
          id: paymentMethods.data[0].id,
          type: paymentMethods.data[0].type,
          card: {
            brand: paymentMethods.data[0].card.brand,
            last4: paymentMethods.data[0].card.last4,
            expMonth: paymentMethods.data[0].card.exp_month,
            expYear: paymentMethods.data[0].card.exp_year
          }
        } : null,
        invoices: invoices.data.map(inv => ({
          id: inv.id,
          number: inv.number,
          amount: inv.amount_paid / 100,
          currency: inv.currency.toUpperCase(),
          status: inv.status,
          created: new Date(inv.created * 1000),
          periodStart: inv.period_start ? new Date(inv.period_start * 1000) : null,
          periodEnd: inv.period_end ? new Date(inv.period_end * 1000) : null,
          hostedInvoiceUrl: inv.hosted_invoice_url,
          invoicePdf: inv.invoice_pdf
        })),
        upcomingInvoice: upcomingInvoice ? {
          amount: upcomingInvoice.amount_due / 100,
          currency: upcomingInvoice.currency.toUpperCase(),
          periodStart: new Date(upcomingInvoice.period_start * 1000),
          periodEnd: new Date(upcomingInvoice.period_end * 1000),
          nextPaymentAttempt: upcomingInvoice.next_payment_attempt ? new Date(upcomingInvoice.next_payment_attempt * 1000) : null
        } : null
      };
    } catch (error) {
      console.error(`❌ [BILLING] Error for user ${userId}:`, error.message);
      throw new Error(`Failed to get billing dashboard: ${error.message}`);
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

