import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    paypal?: any;
  }
}

interface PayPalPaymentProps {
  amount: number;
  productName: string;
  onPaymentComplete: (success: boolean, paymentId?: string, error?: string) => void;
}

const PayPalPayment: React.FC<PayPalPaymentProps> = ({ amount, productName, onPaymentComplete }) => {
  const paypalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load the PayPal SDK script
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=YOUR_PAYPAL_CLIENT_ID&currency=USD`;
    script.async = true;

    script.onload = () => {
      if (window.paypal && paypalRef.current) {
        window.paypal
          .Buttons({
            createOrder: async () => {
              try {
                // Create order on your server
                const response = await fetch('/api/create-paypal-order', {
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
                  throw new Error('Failed to create PayPal order');
                }

                const order = await response.json();
                return order.id;
              } catch (error) {
                console.error('Error creating PayPal order:', error);
                onPaymentComplete(false, undefined, 'Failed to create order');
                return null;
              }
            },
            onApprove: async (data: { orderID: string }) => {
              try {
                // Capture the funds on your server
                const response = await fetch(`/api/capture-paypal-order`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    orderID: data.orderID,
                  }),
                });

                if (!response.ok) {
                  throw new Error('Failed to capture PayPal order');
                }

                const orderData = await response.json();
                
                // Check if the capture was successful
                const captureSuccess = 
                  orderData.status === 'COMPLETED' || 
                  orderData.status === 'APPROVED';
                
                if (captureSuccess) {
                  onPaymentComplete(true, data.orderID);
                } else {
                  onPaymentComplete(false, data.orderID, 'Payment not completed');
                }
              } catch (error) {
                console.error('Error capturing PayPal order:', error);
                onPaymentComplete(false, data.orderID, 'Failed to complete payment');
              }
            },
            onError: (err: any) => {
              console.error('PayPal error:', err);
              onPaymentComplete(false, undefined, 'PayPal error occurred');
            },
            onCancel: () => {
              console.log('Payment cancelled');
              onPaymentComplete(false, undefined, 'Payment cancelled by user');
            },
            style: {
              layout: 'vertical',
              color: 'gold',
              shape: 'rect',
              label: 'paypal'
            }
          })
          .render(paypalRef.current);
      }
    };

    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [amount, productName, onPaymentComplete]);

  return (
    <div className="max-w-md mx-auto">
      <h3 className="text-lg font-bold mb-4">Pay with PayPal</h3>
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-600">Amount:</span>
          <span className="font-bold text-[#fb6a69]">${(amount / 100).toFixed(2)}</span>
        </div>
      </div>
      <div ref={paypalRef}></div>
    </div>
  );
};

export default PayPalPayment; 