import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  CardElement,
  Elements,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import Button from './Button';

// Replace with your actual Stripe publishable key
const stripePromise = loadStripe('pk_test_your_stripe_publishable_key');

interface PaymentFormProps {
  amount: number;
  productName: string;
  onSuccess: (paymentId: string) => void;
  onError: (error: string) => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ amount, productName, onSuccess, onError }) => {
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

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      // Create payment intent on your server
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

      // Confirm card payment
      const result = await stripe.confirmCardPayment(data.clientSecret, {
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
        <div className="border border-gray-300 rounded-lg p-4">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#9e2146',
                },
              },
            }}
          />
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
        onClick={() => {}}
      >
        {loading ? 'Processing...' : `Pay $${(amount / 100).toFixed(2)}`}
      </Button>
    </form>
  );
};

const StripePayment: React.FC<Omit<PaymentFormProps, 'onSuccess' | 'onError'> & {
  onPaymentComplete: (success: boolean, paymentId?: string, error?: string) => void;
}> = ({ amount, productName, onPaymentComplete }) => {
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
      />
    </Elements>
  );
};

export default StripePayment; 