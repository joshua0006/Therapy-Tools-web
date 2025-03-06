import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import Button from './Button';
// import StripePayment from './StripePayment';
import PayPalPayment from './PayPalPayment';
import { CreditCard, CircleDollarSign, ShieldCheck, Lock } from 'lucide-react';
import { useCart, CartItem } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

interface CheckoutPageProps {
  productId?: string; // Optional product ID from URL
}

const CheckoutPage: React.FC<CheckoutPageProps> = ({ productId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { recordUserPurchase, isLoggedIn, user } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [isCartLoaded, setIsCartLoaded] = useState(false);
  
  // Card payment form state
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardError, setCardError] = useState<{
    number?: string;
    expiry?: string;
    cvc?: string;
  }>({});
  
  // Contact information state
  const [contactInfo, setContactInfo] = useState({
    email: ''
  });

  // Handle contact info change
  const handleContactInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setContactInfo(prevInfo => ({
      ...prevInfo,
      [name]: value
    }));
  };

  // Get cart info with error handling
  let cartItems: CartItem[] = [];
  let getTotalPrice = () => 0;

  try {
    const cart = useCart();
    cartItems = cart.cartItems;
    
    // Calculate total price of all items in cart
    getTotalPrice = () => {
      return cart.cartItems.reduce((total, item) => {
        const price = parseFloat(item.price.replace('$', ''));
        return total + (price * item.quantity);
      }, 0);
    };
    
    if (!isCartLoaded) setIsCartLoaded(true);
  } catch (error) {
    console.error("Failed to load cart in checkout:", error);
  }

  // Get plan ID from URL query parameters
  const queryParams = new URLSearchParams(location.search);
  const planId = queryParams.get('plan');

  // Define available plans
  const availablePlans = [
    {
      id: '1',
      name: 'Basic Plan',
      description: 'Essential resources for individual speech pathologists',
      amount: 999, // $9.99 in cents
      imageUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'
    },
    {
      id: '2',
      name: 'Professional Plan',
      description: 'Complete toolkit for practicing professionals',
      amount: 1999, // $19.99 in cents
      imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'
    },
    {
      id: '3',
      name: 'Clinic Plan',
      description: 'For clinics and multi-therapist practices',
      amount: 4999, // $49.99 in cents
      imageUrl: 'https://images.unsplash.com/photo-1576267423445-b2e0074d68a4?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'
    }
  ];

  // Select plan based on URL parameter or default to the first plan
  const selectedPlan = planId 
    ? availablePlans.find(plan => plan.id === planId) 
    : availablePlans[1]; // Default to Professional Plan

  // Determine if we should show plan or cart items
  const showCartItems = cartItems && cartItems.length > 0;
  
  // Use cart total or selected plan for payment amount
  const paymentAmount = showCartItems 
    ? Math.round(getTotalPrice() * 100) // Convert to cents
    : (selectedPlan?.amount || 1999);
  
  // Use selected plan if no cart items
  const product = !showCartItems && selectedPlan ? {
    id: selectedPlan.id,
    name: selectedPlan.name,
    description: selectedPlan.description,
    amount: selectedPlan.amount,
    imageUrl: selectedPlan.imageUrl
  } : {
    id: productId || 'default-product',
    name: 'Speech Therapy Premium Plan',
    description: 'Annual subscription to all premium resources',
    amount: 9900, // $99.00 in cents
    imageUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'
  };

  const handlePaymentMethodSelect = (method: 'stripe' | 'paypal') => {
    setPaymentMethod(method);
    setPaymentError(null);
  };

  const handlePaymentComplete = async (success: boolean, transactionId?: string, error?: string) => {
    setIsProcessing(false);
    
    if (success && transactionId) {
      setPaymentComplete(true);
      setPaymentId(transactionId);
      
      // Record purchase in Firebase if user is logged in
      if (isLoggedIn && user) {
        try {
          let purchaseItems;
          
          // If buying a plan
          if (selectedPlan) {
            purchaseItems = [{
              id: selectedPlan.id,
              type: 'plan',
              name: selectedPlan.name,
              price: (selectedPlan.amount / 100).toFixed(2),
              quantity: 1
            }];
          } 
          // If checking out cart items
          else if (cartItems.length > 0) {
            purchaseItems = cartItems.map(item => ({
              id: item.id,
              type: 'product',
              name: item.title,
              description: item.description,
              category: item.category,
              price: item.price.replace('$', ''),
              quantity: item.quantity,
              imageUrl: item.imageUrl
            }));
          }
          
          // Record the purchase
          await recordUserPurchase({
            items: purchaseItems,
            total: selectedPlan ? (selectedPlan.amount / 100).toFixed(2) : getTotalPrice().toFixed(2),
            transactionId,
            paymentMethod: paymentMethod || 'unknown',
            purchaseDate: new Date().toISOString()
          });
          
          // Clear cart after successful purchase
          if (cartItems.length > 0) {
            try {
              const cart = useCart();
              cart.clearCart();
            } catch (error) {
              console.error("Failed to clear cart after purchase:", error);
            }
          }
        } catch (error) {
          console.error("Failed to record purchase:", error);
          // Still consider the purchase successful even if recording fails
        }
      }
      
      // Redirect to success page after a short delay
      setTimeout(() => {
        navigate('/payment-success', { 
          state: { 
            paymentId: transactionId,
            productName: showCartItems ? 'Your Cart Items' : product.name 
          } 
        });
      }, 2000);
    } else if (error) {
      setPaymentError(error);
    }
  };

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  // Format card expiry as MM/YY
  const formatCardExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    
    if (v.length > 2) {
      return `${v.substring(0, 2)}/${v.substring(2, 4)}`;
    }
    
    return v;
  };
  
  // Handle card form changes
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatCardNumber(e.target.value);
    setCardNumber(formattedValue);
    
    // Simple validation
    if (formattedValue.replace(/\s+/g, '').length < 16) {
      setCardError(prev => ({ ...prev, number: 'Card number must be 16 digits' }));
    } else {
      setCardError(prev => ({ ...prev, number: undefined }));
    }
  };
  
  const handleCardExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatCardExpiry(e.target.value);
    setCardExpiry(formattedValue);
    
    // Simple validation
    if (formattedValue.length < 5) {
      setCardError(prev => ({ ...prev, expiry: 'Invalid expiry date' }));
    } else {
      setCardError(prev => ({ ...prev, expiry: undefined }));
    }
  };
  
  const handleCardCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/gi, '');
    setCardCvc(value);
    
    // Simple validation
    if (value.length < 3) {
      setCardError(prev => ({ ...prev, cvc: 'CVC must be 3 digits' }));
    } else {
      setCardError(prev => ({ ...prev, cvc: undefined }));
    }
  };
  
  // Validate card form before submission
  const validateCardForm = (): boolean => {
    const errors: {
      number?: string;
      expiry?: string;
      cvc?: string;
    } = {};
    
    if (cardNumber.replace(/\s+/g, '').length < 16) {
      errors.number = 'Card number must be 16 digits';
    }
    
    if (cardExpiry.length < 5) {
      errors.expiry = 'Invalid expiry date';
    }
    
    if (cardCvc.length < 3) {
      errors.cvc = 'CVC must be 3 digits';
    }
    
    setCardError(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Handle card payment submission
  const handleCardPayment = () => {
    if (validateCardForm()) {
      setIsProcessing(true);
      
      // In a real application, you would make a request to your payment processor here
      // For this demo, we'll simulate a successful payment after a short delay
      setTimeout(() => {
        handlePaymentComplete(true, "card_" + Math.random().toString(36).substring(2, 15));
      }, 1500);
    }
  };

  return (
    <div className="bg-[#f8f9fa]">
      <Header />
      
      <div className="container mx-auto px-4 py-8 md:py-12">
        <h1 className="text-2xl md:text-3xl font-bold text-center mb-8 text-[#2d3748]">Checkout</h1>
        
        {paymentComplete ? (
          <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-sm">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h2>
              <p className="text-gray-600 mb-4">Thank you for your purchase. Your payment has been processed successfully.</p>
              <p className="text-sm text-gray-500 mb-6">Payment ID: {paymentId}</p>
              <Button 
                variant="primary" 
                size="large"
                onClick={() => navigate('/catalog')}
              >
                Browse Resources
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Column - Order Details */}
            <div className="w-full lg:w-1/2 order-2 lg:order-1">
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4 pb-3 border-b border-gray-100">Your Information</h2>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address*</label>
                  <input
                    type="email"
                    name="email"
                    value={contactInfo.email}
                    onChange={handleContactInfoChange}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-[#2bcd82] focus:border-[#2bcd82] transition-colors"
                    placeholder="your@email.com"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">Your receipt and download links will be sent to this email</p>
                </div>
              </div>
              
              {/* Payment Method Section */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4 pb-3 border-b border-gray-100">Payment Method</h2>
                
                {!paymentMethod ? (
                  <div className="space-y-3">
                    <button
                      onClick={() => handlePaymentMethodSelect('stripe')}
                      className="w-full p-4 border border-gray-200 rounded-md flex items-center hover:border-[#2bcd82] hover:bg-gray-50 transition-all"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#f0fdf4] flex items-center justify-center mr-3">
                        <CreditCard className="w-5 h-5 text-[#2bcd82]" />
                      </div>
                      <div className="flex-1">
                        <span className="font-medium block text-gray-800">Credit/Debit Card</span>
                        <span className="text-xs text-gray-500">Visa, Mastercard, American Express</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        
                        <img src="https://cdn.iconscout.com/icon/free/png-256/free-american-express-3-226448.png" alt="Amex" className="h-6 w-10" />
                      </div>
                    </button>
                    
                    <button
                      onClick={() => handlePaymentMethodSelect('paypal')}
                      className="w-full p-4 border border-gray-200 rounded-md flex items-center hover:border-[#2bcd82] hover:bg-gray-50 transition-all"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#f0f9ff] flex items-center justify-center mr-3">
                        <CircleDollarSign className="w-5 h-5 text-[#0070ba]" />
                      </div>
                      <div className="flex-1">
                        <span className="font-medium block text-gray-800">PayPal</span>
                        <span className="text-xs text-gray-500">Fast and secure checkout</span>
                      </div>
                      <img src="https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_74x46.jpg" alt="PayPal" className="h-6 w-10" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="mb-4">
                      <button
                        onClick={() => setPaymentMethod(null)}
                        className="text-sm text-[#2bcd82] hover:text-[#25b975] flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Change payment method
                      </button>
                    </div>
                    
                    {paymentError && (
                      <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm">
                        {paymentError}
                      </div>
                    )}
                    
                    {paymentMethod === 'stripe' && (
                      <div>
                        <div className="mb-5 flex items-center">
                          <span className="text-sm font-medium text-gray-600 mr-auto">Secure credit card payment</span>
                          <div className="flex items-center space-x-1">
                            <img src="https://cdn.iconscout.com/icon/free/png-256/free-american-express-3-226448.png" alt="Amex" className="h-6 w-10" />
                          </div>
                        </div>
                        
                        <div className="mb-6 space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="1234 5678 9012 3456"
                                className={`w-full p-3 border ${cardError.number ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-1 focus:ring-[#2bcd82] focus:border-[#2bcd82] pl-10`}
                                maxLength={19}
                                value={cardNumber}
                                onChange={handleCardNumberChange}
                              />
                              <div className="absolute left-0 top-0 h-full flex items-center pl-3">
                                <CreditCard className="w-4 h-4 text-gray-400" />
                              </div>
                            </div>
                            {cardError.number && (
                              <p className="mt-1 text-xs text-red-600">{cardError.number}</p>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date (MM/YY)</label>
                              <input
                                type="text"
                                placeholder="MM/YY"
                                className={`w-full p-3 border ${cardError.expiry ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-1 focus:ring-[#2bcd82] focus:border-[#2bcd82]`}
                                maxLength={5}
                                value={cardExpiry}
                                onChange={handleCardExpiryChange}
                              />
                              {cardError.expiry && (
                                <p className="mt-1 text-xs text-red-600">{cardError.expiry}</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">CVC</label>
                              <input
                                type="text"
                                placeholder="123"
                                className={`w-full p-3 border ${cardError.cvc ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-1 focus:ring-[#2bcd82] focus:border-[#2bcd82]`}
                                maxLength={3}
                                value={cardCvc}
                                onChange={handleCardCvcChange}
                              />
                              {cardError.cvc && (
                                <p className="mt-1 text-xs text-red-600">{cardError.cvc}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center mb-4 text-xs text-gray-600">
                          <Lock className="w-3 h-3 mr-1 text-gray-500" />
                          <p>Your payment information is secured with SSL encryption</p>
                        </div>
                        
                        <button 
                          className={`w-full ${isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#2bcd82] hover:bg-[#25b975]'} text-white font-medium py-3 px-4 rounded-md transition-colors flex justify-center items-center`}
                          onClick={handleCardPayment}
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Processing...
                            </>
                          ) : (
                            <>Complete Purchase</>
                          )}
                        </button>
                      </div>
                    )}
                    
                    {paymentMethod === 'paypal' && (
                      <div>
                        <PayPalPayment
                          amount={paymentAmount}
                          productName={showCartItems ? 'Cart Purchase' : product.name}
                          onPaymentComplete={handlePaymentComplete}
                        />
                        
                        {/* Manual PayPal completion button */}
                        <div className="mt-6">
                          <button 
                            className="w-full bg-[#0070ba] hover:bg-[#003087] text-white font-medium py-3 px-4 rounded-full transition-colors flex justify-center items-center"
                            onClick={() => {
                              setIsProcessing(true);
                              setTimeout(() => {
                                handlePaymentComplete(true, "paypal_" + Math.random().toString(36).substring(2, 15));
                              }, 1500);
                            }}
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processing...
                              </>
                            ) : (
                              `Complete Payment with PayPal ($${showCartItems ? getTotalPrice().toFixed(2) : (product.amount / 100).toFixed(2)})`
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Right Column - Order Summary */}
            <div className="w-full lg:w-1/2 order-1 lg:order-2">
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4 pb-3 border-b border-gray-100">Order Summary</h2>
                
                {showCartItems ? (
                  <div>
                    <div className="max-h-60 overflow-y-auto mb-4">
                      {cartItems.map((item) => (
                        <div key={item.id} className="flex items-start py-3 border-b border-gray-100 last:border-b-0">
                          <div className="w-16 h-16 rounded-md overflow-hidden mr-3 flex-shrink-0 bg-gray-50">
                            <img 
                              src={item.imageUrl} 
                              alt={item.title} 
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-grow">
                            <h3 className="font-medium text-gray-800">{item.title}</h3>
                            <p className="text-sm text-gray-500 mb-1">Qty: {item.quantity}</p>
                            <p className="text-[#fb6a69] font-medium">
                              ${(parseFloat(item.price.replace('$', '')) * item.quantity).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center mb-6">
                    <div className="w-20 h-20 rounded-md overflow-hidden mr-4 bg-gray-50">
                      <img 
                        src={product.imageUrl} 
                        alt={product.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">{product.name}</h3>
                      <p className="text-gray-600 text-sm">{product.description}</p>
                      <p className="text-[#fb6a69] font-bold mt-2">${(product.amount / 100).toFixed(2)}</p>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2 py-3 border-t border-gray-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium text-gray-800">
                      ${showCartItems 
                        ? getTotalPrice().toFixed(2) 
                        : (product.amount / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax</span>
                    <span className="font-medium text-gray-800">$0.00</span>
                  </div>
                  <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between">
                    <span className="font-semibold text-gray-800">Total</span>
                    <span className="font-bold text-[#fb6a69]">
                      ${showCartItems 
                        ? getTotalPrice().toFixed(2) 
                        : (product.amount / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <ShieldCheck className="h-5 w-5 text-green-600" />
                  <span className="text-base font-medium text-gray-800">Secure Checkout</span>
                </div>
                
                <div className="flex justify-center mb-4">
                  <img 
                    src="/images/payment-icons.png" 
                    alt="PayPal Secured" 
                    className="h-10" 
                  />
                </div>
                
                <div className="text-center text-xs text-gray-500 space-y-2">
                  <p>Your information is protected by 256-bit SSL encryption</p>
                  <p>
                    By completing your purchase you agree to our{' '}
                    <a href="#" className="text-[#2bcd82] hover:underline">Terms of Service</a>{' '}
                    and{' '}
                    <a href="#" className="text-[#2bcd82] hover:underline">Privacy Policy</a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  );
};

export default CheckoutPage; 