// This file contains handlers for PayPal payment processing
// In a production environment, these should be implemented on your secure backend server

const axios = require('axios');

// PayPal API URLs
const PAYPAL_API_URL = process.env.NODE_ENV === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

/**
 * Generates an access token for PayPal API
 * 
 * @returns {Promise<string>} The access token
 */
async function generateAccessToken() {
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
 * Creates a PayPal order
 * 
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
exports.createOrder = async (req, res) => {
  try {
    const { amount, productName } = req.body;
    
    // Validate the amount
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Convert cent amount to dollars for PayPal
    const value = (amount / 100).toFixed(2);

    const accessToken = await generateAccessToken();
    
    const response = await axios({
      method: 'post',
      url: `${PAYPAL_API_URL}/v2/checkout/orders`,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        intent: 'CAPTURE',
        purchase_units: [
          {
            description: productName,
            amount: {
              currency_code: 'USD',
              value,
            },
          },
        ],
      },
    });

    res.status(200).json({
      id: response.data.id,
    });
  } catch (error) {
    console.error('Error creating PayPal order:', error);
    res.status(500).json({ error: 'Failed to create PayPal order' });
  }
};

/**
 * Captures a PayPal order (finalizes the payment)
 * 
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
exports.captureOrder = async (req, res) => {
  try {
    const { orderID } = req.body;
    
    if (!orderID) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    const accessToken = await generateAccessToken();
    
    const response = await axios({
      method: 'post',
      url: `${PAYPAL_API_URL}/v2/checkout/orders/${orderID}/capture`,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const captureData = response.data;
    
    // Check if the capture was successful
    if (captureData.status === 'COMPLETED') {
      // Update user membership or deliver digital product
      await updateUserMembership(captureData);
    }

    res.status(200).json(captureData);
  } catch (error) {
    console.error('Error capturing PayPal order:', error);
    res.status(500).json({ error: 'Failed to capture PayPal order' });
  }
};

/**
 * Updates user membership after successful payment
 * 
 * @param {Object} captureData - The PayPal capture data
 */
