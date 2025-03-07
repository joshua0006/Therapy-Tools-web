import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import Button from './Button';
import { CheckCircle, AlertCircle, Box, ShoppingBag, CreditCard } from 'lucide-react';
import { CartItem } from '../context/CartContext';

interface LocationState {
  paymentId?: string;
  amount?: string;
  items?: CartItem[];
  purchaseType?: 'cart_items' | 'plan' | 'unknown';
}

const PaymentSuccessPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error'>('loading');
  
  // Extract payment data from location state
  const state = location.state as LocationState;
  const paymentId = state?.paymentId || 'unknown';
  const purchaseAmount = state?.amount || '0.00';
  const purchasedItems = state?.items || [];
  const purchaseType = state?.purchaseType || 'unknown';
  
  useEffect(() => {
    // If no payment ID is provided, redirect to home
    if (paymentId === 'unknown') {
      navigate('/');
      return;
    }
    
    // Simulate verification for demo purposes
    const verifyPayment = async () => {
      // Wait a moment to simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setVerificationStatus('success');
    };
    
    verifyPayment();
  }, [paymentId, navigate]);
  
  // Helper function to get product name for display
  const getPurchaseDescription = (): string => {
    if (purchaseType === 'plan' && purchasedItems.length > 0) {
      return purchasedItems[0].title;
    } else if (purchaseType === 'cart_items' && purchasedItems.length > 0) {
      return purchasedItems.length === 1 
        ? purchasedItems[0].title 
        : `${purchasedItems.length} items`;
    } else {
      return 'your purchase';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm p-8">
          {verificationStatus === 'loading' && (
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-[#2bcd82] border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Verifying Payment</h2>
              <p className="text-gray-600">Please wait while we confirm your payment...</p>
            </div>
          )}
          
          {verificationStatus === 'error' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Verification Failed</h2>
              <p className="text-gray-600 mb-8">We couldn't verify your payment. Please contact our support team for assistance.</p>
              <Button 
                variant="primary" 
                size="large"
                onClick={() => navigate('/contact')}
              >
                Contact Support
              </Button>
            </div>
          )}
          
          {verificationStatus === 'success' && (
            <div>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Thank You for Your Purchase!</h2>
                <p className="text-gray-600">
                  Your payment for {getPurchaseDescription()} has been successfully processed.
                </p>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-lg mb-8">
                <h3 className="font-semibold text-gray-800 mb-4">Order Details</h3>
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
                  <div className="flex items-center">
                    <ShoppingBag className="w-5 h-5 text-gray-500 mr-2" />
                    <span className="text-gray-700">Order Number</span>
                  </div>
                  <span className="font-medium text-gray-800">{paymentId.substring(0, 10)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <CreditCard className="w-5 h-5 text-gray-500 mr-2" />
                    <span className="text-gray-700">Total Amount</span>
                  </div>
                  <span className="font-medium text-[#2bcd82]">${purchaseAmount}</span>
                </div>
              </div>
              
              {/* Purchased Items Summary */}
              {purchasedItems.length > 0 && (
                <div className="mb-8">
                  <h3 className="font-semibold text-gray-800 mb-4">Purchased Items</h3>
                  <div className="space-y-4">
                    {purchasedItems.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-12 h-12 bg-gray-200 rounded overflow-hidden mr-4">
                            {item.imageUrl ? (
                              <img 
                                src={item.imageUrl} 
                                alt={item.title} 
                                className="w-full h-full object-cover" 
                              />
                            ) : (
                              <Box className="w-6 h-6 text-gray-400 m-3" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{item.title}</p>
                            <p className="text-sm text-gray-500">
                              {item.category || 'Resource'} {item.quantity > 1 ? `x ${item.quantity}` : ''}
                            </p>
                          </div>
                        </div>
                        <span className="font-medium text-gray-700">{item.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  variant="primary" 
                  size="large"
                  onClick={() => navigate('/dashboard')}
                >
                  Go to Dashboard
                </Button>
                <Button 
                  variant="secondary" 
                  size="large"
                  onClick={() => navigate('/catalog')}
                >
                  Continue Shopping
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default PaymentSuccessPage; 