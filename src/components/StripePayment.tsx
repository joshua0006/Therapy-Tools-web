import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  CardElement,
  Elements,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import Button from './Button';

// Load Stripe publishable key from environment variables
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

// Mock payment intent for development
const createMockPaymentIntent = async (amount: number) => {
  console.log(`Creating mock payment intent for $${(amount / 100).toFixed(2)}`);
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 700));
  return {
    clientSecret: 'mock_client_secret_' + Math.random().toString(36).substring(2),
  };
};

interface PaymentFormProps {
  amount: number;
  productName: string;
  onSuccess: (paymentId: string) => void;
  onError: (error: string) => void;
  validateCheckout?: () => boolean;
  highlightTermsIfNeeded?: () => boolean;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ amount, productName, onSuccess, onError, validateCheckout, highlightTermsIfNeeded }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js has not loaded yet
      return;
    }

    // First check and highlight terms if needed
    if (highlightTermsIfNeeded && !highlightTermsIfNeeded()) {
      // If terms need highlighting, stop here - we've shown the highlight
      // This ensures we don't proceed with payment until terms are checked
      return;
    }

    // Then run the general validation
    if (validateCheckout && !validateCheckout()) {
      // If general validation fails, stop here
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      let clientSecret;
      
      // Check if we're in development environment
      if (import.meta.env.DEV) {
        // Use mock payment intent in development
        const mockData = await createMockPaymentIntent(amount);
        clientSecret = mockData.clientSecret;
        
        // Simulate a successful payment and skip actual Stripe API calls in development
        console.log('Development mode: Simulating successful payment');
        await new Promise(resolve => setTimeout(resolve, 1000));
        const mockPaymentId = 'dev_payment_' + Math.random().toString(36).substring(2);
        onSuccess(mockPaymentId);
        setLoading(false);
        return;
      } else {
        // In production, use the real API
        const response = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount,
            productName,
          }),
        });

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const data = await response.json();
        clientSecret = data.clientSecret;
      }

      // Confirm card payment
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: 'Customer Name', // Ideally this would come from a form field
          },
        },
      });

      if (result.error) {
        setErrorMessage(result.error.message || 'Payment failed');
        onError(result.error.message || 'Payment failed');
      } else if (result.paymentIntent?.status === 'succeeded') {
        onSuccess(result.paymentIntent.id);
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      setErrorMessage('Error processing payment. Please try again.');
      onError('Error processing payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto">
      <div className="mb-6">
        <h3 className="text-lg font-bold mb-2">Payment Details</h3>
        <div className="border border-gray-300 rounded-lg p-4 bg-white shadow-sm">
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Card Information</label>
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                    padding: '10px 0',
                  },
                  invalid: {
                    color: '#9e2146',
                  },
                },
                hidePostalCode: true,
              }}
              className="p-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-[#2bcd82] focus:border-[#2bcd82]"
            />
          </div>
          
  
          
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Name on Card</label>
            <input
              type="text"
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-[#2bcd82] focus:border-[#2bcd82]"
              placeholder="Cardholder Name"
            />
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">
          {errorMessage}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <span className="text-gray-600">Amount:</span>
        <span className="font-bold text-[#fb6a69]">${(amount / 100).toFixed(2)}</span>
      </div>

      <Button
        variant="primary"
        size="large"
        className="w-full"
        disabled={!stripe || loading}
        onClick={() => {
          // If not part of a form submission, trigger terms check directly
          if (highlightTermsIfNeeded) {
            highlightTermsIfNeeded();
          }
        }}
        type="submit"
      >
        {loading ? 'Processing...' : `Pay $${(amount / 100).toFixed(2)}`}
      </Button>
      
      
      <p className="mt-2 text-xs text-center text-gray-500">
        Your payment information is secure and encrypted
      </p>
    </form>
  );
};

const StripePayment: React.FC<Omit<PaymentFormProps, 'onSuccess' | 'onError'> & {
  onPaymentComplete: (success: boolean, paymentId?: string, error?: string) => void;
  validateCheckout?: () => boolean;
  highlightTermsIfNeeded?: () => boolean;
}> = ({ amount, productName, onPaymentComplete, validateCheckout, highlightTermsIfNeeded }) => {
  const handleSuccess = (paymentId: string) => {
    onPaymentComplete(true, paymentId);
  };

  const handleError = (error: string) => {
    onPaymentComplete(false, undefined, error);
  };

  return (
    <Elements stripe={stripePromise}>
      <PaymentForm
        amount={amount}
        productName={productName}
        onSuccess={handleSuccess}
        onError={handleError}
        validateCheckout={validateCheckout}
        highlightTermsIfNeeded={highlightTermsIfNeeded}
      />
    </Elements>
  );
};

export default StripePayment; 