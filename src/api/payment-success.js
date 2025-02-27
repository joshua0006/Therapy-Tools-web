// This file contains handlers for verifying payment status
// In a production environment, these should be implemented on your secure backend server

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const axios = require('axios');

// PayPal API URLs
const PAYPAL_API_URL = process.env.NODE_ENV === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

// Generate PayPal access token
async function generatePayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  try {
    const response = await axios({
      method: 'post',
      url: `${PAYPAL_API_URL}/v1/oauth2/token`,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: 'grant_type=client_credentials',
    });

    return response.data.access_token;
  } catch (error) {
    console.error('Failed to generate PayPal access token:', error);
    throw error;
  }
}

/**
 * Verifies the status of a payment
 * 
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
exports.verifyPaymentStatus = async (req, res) => {
  try {
    const { paymentId, paymentType } = req.body;
    
    if (!paymentId || !paymentType) {
      return res.status(400).json({ error: 'Payment ID and type are required' });
    }

    let paymentStatus;

    // Verify with the appropriate payment processor
    if (paymentType === 'stripe') {
      paymentStatus = await verifyStripePayment(paymentId);
    } else if (paymentType === 'paypal') {
      paymentStatus = await verifyPayPalPayment(paymentId);
    } else {
      return res.status(400).json({ error: 'Invalid payment type' });
    }

    if (paymentStatus.success) {
      // Activate user's membership or provide access to purchased product
      // This would typically involve updating a database
      await activateMembership(paymentStatus.customerId, paymentStatus.productId);
      
      res.status(200).json({
        success: true,
        message: 'Payment verified and membership activated',
        data: paymentStatus
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Payment verification failed',
        error: paymentStatus.error
      });
    }
  } catch (error) {
    console.error('Error verifying payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying payment status',
      error: error.message
    });
  }
};

/**
 * Verifies a Stripe payment
 * 
 * @param {string} paymentIntentId - The ID of the payment intent
 * @returns {Promise<Object>} The verification result
 */
async function verifyStripePayment(paymentIntentId) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status === 'succeeded') {
      return {
        success: true,
        paymentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        customerId: paymentIntent.customer,
        productId: paymentIntent.metadata.productId || null,
        status: paymentIntent.status
      };
    } else {
      return {
        success: false,
        error: `Payment not successful. Status: ${paymentIntent.status}`
      };
    }
  } catch (error) {
    console.error('Error verifying Stripe payment:', error);
    return {
      success: false,
      error: 'Failed to verify payment with Stripe'
    };
  }
}

/**
 * Verifies a PayPal payment
 * 
 * @param {string} orderId - The ID of the PayPal order
 * @returns {Promise<Object>} The verification result
 */
async function verifyPayPalPayment(orderId) {
  try {
    const accessToken = await generatePayPalAccessToken();
    
    const response = await axios({
      method: 'get',
      url: `${PAYPAL_API_URL}/v2/checkout/orders/${orderId}`,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const order = response.data;
    
    if (order.status === 'COMPLETED') {
      const purchaseUnit = order.purchase_units[0];
      const amount = purchaseUnit.amount;
      
      return {
        success: true,
        paymentId: order.id,
        amount: parseFloat(amount.value) * 100, // Convert to cents for consistency
        currency: amount.currency_code,
        customerId: order.payer.payer_id,
        productId: purchaseUnit.custom_id || null,
        status: order.status
      };
    } else {
      return {
        success: false,
        error: `Payment not completed. Status: ${order.status}`
      };
    }
  } catch (error) {
    console.error('Error verifying PayPal payment:', error);
    return {
      success: false,
      error: 'Failed to verify payment with PayPal'
    };
  }
}

/**
 * Activates a user's membership based on payment
 * 
 * @param {string} customerId - The ID of the customer
 * @param {string} productId - The ID of the product purchased
 * @returns {Promise<boolean>} Success status
 */
async function activateMembership(customerId, productId) {
  // In a real application, this would update the user's membership in your database
  // This is just a placeholder function
  console.log(`Activating membership for customer ${customerId}, product ${productId}`);
  
  // Example implementation:
  // 1. Lookup user by customer ID
  // 2. Update their membership status and expiration date
  // 3. Send confirmation email
  
  return true;
} 