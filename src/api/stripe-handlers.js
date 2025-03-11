// This file contains handlers for Stripe payment processing
// In a production environment, these should be implemented on your secure backend server

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Creates a payment intent with Stripe
 * 
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
exports.createPaymentIntent = async (req, res) => {
  try {
    const { amount, productName, isSubscription = false, billingCycle = 'yearly' } = req.body;
    
    // Validate the amount
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Validate annual subscription amount
    if (isSubscription && billingCycle === 'yearly' && amount !== 250000) {
      console.warn(`Warning: Annual subscription amount ${amount} doesn't match expected 250000 cents ($2,500.00)`);
      // Continue processing but log the warning
    }

    // Create a payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      metadata: {
        productName,
        isSubscription: isSubscription ? 'true' : 'false',
        billingCycle,
        planType: 'premium',
        priceInDollars: (amount / 100).toFixed(2),
      },
      description: isSubscription 
        ? `Annual Premium Subscription - $${(amount / 100).toFixed(2)}` 
        : productName,
      // You can add automatic payment methods here
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
};

/**
 * Webhook handler for Stripe events
 * 
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
exports.handleWebhookEvent = async (req, res) => {
  const signature = req.headers['stripe-signature'];

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    // Handle the event based on its type
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        
        // Check if this is an annual subscription payment
        const isSubscription = paymentIntent.metadata.isSubscription === 'true';
        const billingCycle = paymentIntent.metadata.billingCycle;
        
        if (isSubscription && billingCycle === 'yearly') {
          console.log(`Processing annual subscription payment: $${paymentIntent.metadata.priceInDollars}`);
          
          // Verify the amount is correct for annual subscription
          if (paymentIntent.amount !== 250000) {
            console.warn(`Payment amount ${paymentIntent.amount} doesn't match expected annual subscription price 250000`);
          }
        }
       
        // Update user membership or deliver digital product here
        await updateUserMembership(paymentIntent);
        break;
      case 'payment_intent.payment_failed':
      
        // Handle failed payment here
        console.error(`Payment failed: ${event.data.object.id}`);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook error' });
  }
};

/**
 * Updates user membership after successful payment
 * 
 * @param {Object} paymentIntent - The payment intent object
 */
async function updateUserMembership(paymentIntent) {
  // In a real application, you would update the user's membership status in your database
  console.log(`Updating membership for payment ${paymentIntent.id}`);

  // Check if this is a subscription payment
  const isSubscription = paymentIntent.metadata.isSubscription === 'true';
  const billingCycle = paymentIntent.metadata.billingCycle;
  
  if (isSubscription) {
    console.log(`Setting up ${billingCycle} subscription`);
    
    // For annual subscription, set expiration date to 1 year from now
    if (billingCycle === 'yearly') {
      const expirationDate = new Date();
      expirationDate.setFullYear(expirationDate.getFullYear() + 1);
      console.log(`Subscription will expire on ${expirationDate.toISOString()}`);
    }
  }

  // Example implementation:
  // 1. Extract user ID from payment intent metadata or customer
  // 2. Update user membership in database with correct expiration date (1 year from now)
  // 3. Send confirmation email to user
  
  return true;
} 