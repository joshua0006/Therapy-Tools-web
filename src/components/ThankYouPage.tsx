import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import Button from './Button';

interface ThankYouPageState {
  transactionId?: string;
  amount?: string;
  email?: string;
}

const ThankYouPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as ThankYouPageState;
  
  // If someone navigates directly to thank you page without state, redirect to home
  useEffect(() => {
    if (!state || !state.transactionId) {
      navigate('/');
    }
  }, [state, navigate]);
  
  // If no state is available, show loading until redirect happens
  if (!state || !state.transactionId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8f9fa]">
        <div className="animate-spin w-12 h-12 border-4 border-[#2bcd82] border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  return (
    <div className="bg-[#f8f9fa] min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm p-8 md:p-12">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h1 className="text-3xl font-bold text-gray-800 mb-3">Thank You!</h1>
            <p className="text-xl text-gray-600">Your annual subscription has been activated successfully.</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Subscription Details</h2>
            
            <div className="space-y-4">
              <div className="flex justify-between border-b border-gray-200 pb-3">
                <span className="text-gray-600">Order Number:</span>
                <span className="font-medium">{state.transactionId}</span>
              </div>
              
              <div className="flex justify-between border-b border-gray-200 pb-3">
                <span className="text-gray-600">Amount:</span>
                <span className="font-medium">${state.amount}</span>
              </div>
              
              <div className="flex justify-between border-b border-gray-200 pb-3">
                <span className="text-gray-600">Plan:</span>
                <span className="font-medium">Annual Premium Subscription</span>
              </div>
              
              {state.email && (
                <div className="flex justify-between pb-2">
                  <span className="text-gray-600">Confirmation Email:</span>
                  <span className="font-medium">{state.email}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-blue-700 mb-3">What's Next?</h2>
            <ul className="list-disc list-inside space-y-2 text-blue-700">
              <li>A confirmation email has been sent to your email address.</li>
              <li>Your annual subscription is now active and will be valid for one year.</li>
              <li>You now have unlimited access to all premium resources.</li>
              <li>For any questions, contact our support team.</li>
            </ul>
          </div>
          
          <div className="flex justify-center">
            <Button
              variant="primary"
              size="large"
              onClick={() => navigate('/catalog')}
            >
              Browse Catalogs
            </Button>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ThankYouPage; 