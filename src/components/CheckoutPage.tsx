import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import Button from './Button';
// import StripePayment from './StripePayment';
import PayPalPayment from './PayPalPayment';
import { CreditCard, CircleDollarSign, ShieldCheck, Lock, CheckCircle2 } from 'lucide-react';
import { useCart, CartItem } from '../context/CartContext';

interface CheckoutPageProps {
  productId?: string; // Optional product ID from URL
}

const CheckoutPage: React.FC<CheckoutPageProps> = ({ productId }) => {
  const navigate = useNavigate();
  const location = useLocation();
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

  const handlePaymentComplete = (success: boolean, id?: string, error?: string) => {
    setIsProcessing(false);
    
    if (success && id) {
      setPaymentComplete(true);
      setPaymentId(id);
      
      // In a real application, you would make a request to your server
      // to verify the payment was completed and update the user's membership
      
      // Redirect to success page after a short delay
      setTimeout(() => {
        navigate('/payment-success', { 
          state: { 
            paymentId: id,
            productName: showCartItems ? 'Your Cart Items' : product.name 
          } 
        });
      }, 2000);
    } else {
      setPaymentError(error || 'An unknown error occurred');
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
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-center mb-8">Secure Checkout</h1>
        
        {paymentComplete ? (
          <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
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
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Contact Information - Left Column */}
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">Contact Information</h2>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address*</label>
                  <input
                    type="email"
                    name="email"
                    value={contactInfo.email}
                    onChange={handleContactInfoChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#2bcd82] focus:border-transparent"
                    placeholder="your@email.com"
                    required
                  />
                  <p className="mt-1 text-sm text-gray-500">Your receipt and download links will be sent to this email</p>
                </div>
              </div>
              
              {/* Payment Method Section */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">Payment Method</h2>
                
                {!paymentMethod ? (
                  <div className="space-y-4">
                    <button
                      onClick={() => handlePaymentMethodSelect('stripe')}
                      className="w-full p-4 border border-gray-300 rounded-lg flex items-center hover:border-[#2bcd82] transition-colors"
                    >
                      <CreditCard className="w-6 h-6 text-[#2bcd82] mr-3" />
                      <span className="font-medium">Credit/Debit Card</span>
                    </button>
                    
                    <button
                      onClick={() => handlePaymentMethodSelect('paypal')}
                      className="w-full p-4 border border-gray-300 rounded-lg flex items-center hover:border-[#2bcd82] transition-colors"
                    >
                      <CircleDollarSign className="w-6 h-6 text-[#2bcd82] mr-3" />
                      <span className="font-medium">PayPal</span>
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="mb-6">
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
                      <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">
                        {paymentError}
                      </div>
                    )}
                    
                    {paymentMethod === 'stripe' && (
                      <div>
                        <h3 className="text-lg font-medium mb-4">Payment Details</h3>
                        
                        <div className="mb-6 space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
                            <input
                              type="text"
                              placeholder="1234 5678 9012 3456"
                              className={`w-full p-2 border ${cardError.number ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-[#2bcd82] focus:border-transparent`}
                              maxLength={19}
                              value={cardNumber}
                              onChange={handleCardNumberChange}
                            />
                            {cardError.number && (
                              <p className="mt-1 text-sm text-red-600">{cardError.number}</p>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date (MM/YY)</label>
                              <input
                                type="text"
                                placeholder="MM/YY"
                                className={`w-full p-2 border ${cardError.expiry ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-[#2bcd82] focus:border-transparent`}
                                maxLength={5}
                                value={cardExpiry}
                                onChange={handleCardExpiryChange}
                              />
                              {cardError.expiry && (
                                <p className="mt-1 text-sm text-red-600">{cardError.expiry}</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">CVC</label>
                              <input
                                type="text"
                                placeholder="123"
                                className={`w-full p-2 border ${cardError.cvc ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-[#2bcd82] focus:border-transparent`}
                                maxLength={3}
                                value={cardCvc}
                                onChange={handleCardCvcChange}
                              />
                              {cardError.cvc && (
                                <p className="mt-1 text-sm text-red-600">{cardError.cvc}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center mb-6">
                          <span className="text-gray-700 font-medium">Amount:</span>
                          <span className="text-[#fb6a69] font-bold">
                            ${showCartItems 
                              ? getTotalPrice().toFixed(2) 
                              : (product.amount / 100).toFixed(2)}
                          </span>
                        </div>
                        
                        <button 
                          className={`w-full ${isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#2bcd82] hover:bg-[#25b975]'} text-white font-medium py-3 px-4 rounded-full transition-colors flex justify-center items-center`}
                          onClick={handleCardPayment}
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
                            `Pay $${showCartItems ? getTotalPrice().toFixed(2) : (product.amount / 100).toFixed(2)}`
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
                
                {/* Trust Indicators - Moved to separate section */}
                <div className="mt-8 border-t border-gray-200 pt-6">
                  <div className="flex justify-center items-center mb-4 bg-gray-50 py-3 rounded-lg">
                    <ShieldCheck className="h-6 w-6 text-green-600 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-800">Guaranteed Safe Checkout</h3>
                  </div>
                  
                  <div className="flex justify-center space-x-8 mb-4">
                    <div className="flex items-center">
                      <Lock className="h-5 w-5 text-gray-600 mr-2" />
                      <span className="text-sm text-gray-600">Secure SSL Encryption</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle2 className="h-5 w-5 text-gray-600 mr-2" />
                      <span className="text-sm text-gray-600">Money-Back Guarantee</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-center space-x-6 mt-4">
                    <img src="https://cdn.pixabay.com/photo/2015/05/26/09/37/paypal-784404_1280.png" alt="PayPal" className="h-8" />
                    <img src="https://cdn.pixabay.com/photo/2021/12/08/05/16/visa-6854848_1280.png" alt="Visa" className="h-8" />
                    <img src="https://cdn.pixabay.com/photo/2022/01/17/09/26/mastercard-6944458_1280.png" alt="Mastercard" className="h-8" />
                    <img src="https://cdn.pixabay.com/photo/2015/12/10/20/18/credit-card-1086741_1280.png" alt="Amex" className="h-8" />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Order Summary - Right Column */}
            <div className="lg:col-span-2">
              <div className="bg-white p-6 rounded-lg shadow-md sticky top-24">
                <h2 className="text-xl font-bold mb-4">Order Summary</h2>
                
                {showCartItems ? (
                  <div>
                    <div className="max-h-60 overflow-y-auto mb-4">
                      {cartItems.map((item) => (
                        <div key={item.id} className="flex items-start py-3 border-b border-gray-200 last:border-b-0">
                          <div className="w-16 h-16 rounded-md overflow-hidden mr-3 flex-shrink-0">
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
                    <div className="w-24 h-24 rounded-md overflow-hidden mr-4">
                      <img 
                        src={product.imageUrl} 
                        alt={product.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{product.name}</h3>
                      <p className="text-gray-600 text-sm">{product.description}</p>
                      <p className="text-[#fb6a69] font-bold mt-2">${(product.amount / 100).toFixed(2)}</p>
                    </div>
                  </div>
                )}
                
                <div className="border-t border-gray-200 pt-4 mb-4">
                  <div className="flex justify-between mb-2">
                    <span>Subtotal</span>
                    <span>
                      ${showCartItems 
                        ? getTotalPrice().toFixed(2) 
                        : (product.amount / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span>Tax</span>
                    <span>$0.00</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span className="text-[#fb6a69]">
                      ${showCartItems 
                        ? getTotalPrice().toFixed(2) 
                        : (product.amount / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
                
                {!paymentMethod && (
                  <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600 mb-2">
                      By completing your purchase you agree to our
                    </p>
                    <div className="flex justify-center space-x-2 text-sm text-[#2bcd82]">
                      <a href="#" className="hover:underline">Terms of Service</a>
                      <span>•</span>
                      <a href="#" className="hover:underline">Privacy Policy</a>
                    </div>
                  </div>
                )}
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