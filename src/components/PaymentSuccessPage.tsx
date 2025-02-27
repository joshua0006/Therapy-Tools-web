import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import Button from './Button';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface LocationState {
  paymentId?: string;
  productName?: string;
  paymentType?: 'stripe' | 'paypal';
}

const PaymentSuccessPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Extract payment data from location state
  const state = location.state as LocationState;
  const paymentId = state?.paymentId;
  const productName = state?.productName || 'your subscription';
  const paymentType = state?.paymentType || 'stripe'; // Default to stripe
  
  useEffect(() => {
    // If no payment ID is provided, redirect to home
    if (!paymentId) {
      navigate('/');
      return;
    }
    
    // Verify the payment status with the server
    const verifyPayment = async () => {
      try {
        const response = await fetch('/api/verify-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentId,
            paymentType,
          }),
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
          setVerificationStatus('success');
        } else {
          setVerificationStatus('error');
          setErrorMessage(data.error || 'Failed to verify payment');
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
        setVerificationStatus('error');
        setErrorMessage('An error occurred while verifying your payment');
      }
    };
    
    // Simulate verification (in a real app, uncomment the verifyPayment call)
    // verifyPayment();
    
    // For demo purposes, we'll simulate a successful verification after a delay
    const timer = setTimeout(() => {
      setVerificationStatus('success');
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [paymentId, paymentType, navigate]);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
          {verificationStatus === 'loading' && (
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-[#2bcd82] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Verifying Payment</h2>
              <p className="text-gray-600">Please wait while we verify your payment...</p>
            </div>
          )}
          
          {verificationStatus === 'success' && (
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-[#2bcd82] mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h2>
              <p className="text-gray-600 mb-4">
                Thank you for your purchase. Your payment for {productName} has been processed successfully.
              </p>
              {paymentId && (
                <p className="text-sm text-gray-500 mb-6">Payment ID: {paymentId}</p>
              )}
              <div className="border-t border-gray-200 pt-6 mt-6">
                <h3 className="font-bold text-lg mb-4">What's Next?</h3>
                <p className="text-gray-600 mb-6">
                  You now have full access to your subscription benefits. Start exploring our resources or visit your account page to manage your subscription.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    variant="primary" 
                    size="large"
                    onClick={() => navigate('/catalog')}
                  >
                    Browse Resources
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="large"
                    onClick={() => navigate('/account')}
                  >
                    My Account
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {verificationStatus === 'error' && (
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Verification Failed</h2>
              <p className="text-gray-600 mb-4">
                We're sorry, but we couldn't verify your payment.
              </p>
              {errorMessage && (
                <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
                  {errorMessage}
                </div>
              )}
              <div className="border-t border-gray-200 pt-6 mt-6">
                <p className="text-gray-600 mb-6">
                  If you believe this is an error, please contact our support team or try making the payment again.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    variant="primary" 
                    size="large"
                    onClick={() => navigate('/checkout')}
                  >
                    Try Again
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="large"
                    onClick={() => navigate('/contact')}
                  >
                    Contact Support
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default PaymentSuccessPage; 