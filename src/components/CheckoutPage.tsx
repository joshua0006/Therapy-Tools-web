import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import Button from './Button';
import { CreditCard } from 'lucide-react';
import { useCart, CartItem } from '../context/CartContext';
import { useAuth, ShippingAddress } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import ShippingAddressCard from './ShippingAddressCard';

interface CheckoutPageProps {
  productId?: string; // Optional product ID from URL
}

const CheckoutPage: React.FC<CheckoutPageProps> = ({ productId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { recordUserPurchase, isLoggedIn, user, saveShippingInfo, getShippingInfo } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState<'stripe'>('stripe');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [isCartLoaded, setIsCartLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
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

  // Add termsAgreed state
  const [termsAgreed, setTermsAgreed] = useState(false);

  // Add a new state for the "set as default" prompt
  const [showSetDefaultPrompt, setShowSetDefaultPrompt] = useState<boolean>(false);
  const [newAddressCompleted, setNewAddressCompleted] = useState<boolean>(false);

  // Use the useAuth hook instead of direct context consumption
  const auth = useAuth();

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
  const billingCycle = queryParams.get('billing') || 'monthly';
  const priceParam = queryParams.get('price');
  const displayPrice = queryParams.get('display_price');

  // If we have a price parameter, use it (convert from string to number)
  const priceAmount = priceParam ? parseFloat(priceParam) * 100 : null; // Convert to cents

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
    },
    {
      id: 'premium',
      name: 'Speech Therapy Premium Access',
      description: 'Subscription to all premium resources',
      amount: priceAmount || 2499, // Default price is $24.99 instead of $99
      imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'
    }
  ];

  // Check if we should use session storage data (in case URL params were lost)
  useEffect(() => {
    if (!priceParam && planId === 'premium') {
      const storedPlan = sessionStorage.getItem('selectedPlan');
      const storedPrice = sessionStorage.getItem('selectedPrice');
      
      if (storedPlan && storedPrice) {
        // Update the premium plan price from session storage
        const premiumPlan = availablePlans.find(p => p.id === 'premium');
        if (premiumPlan) {
          premiumPlan.amount = parseFloat(storedPrice) * 100;
        }
      }
    }
  }, [planId, priceParam]);

  // Select plan based on URL parameter - but NO default if not specified
  const selectedPlan = planId 
    ? availablePlans.find(plan => plan.id === planId) 
    : undefined; // No default plan - only use if explicitly requested
  
  // Determine if we should show plan or cart items
  const showCartItems = cartItems && cartItems.length > 0;
  
  // Use cart total or selected plan for payment amount
  const paymentAmount = showCartItems 
    ? Math.round(getTotalPrice() * 100) // Convert to cents
    : (selectedPlan?.amount || 1999);
  
  // Use selected plan if no cart items
  const product = useMemo(() => {
    return {
      id: planId || 'premium-plan',
      name: planId === 'premium-plan' ? 'Speech Therapy Premium Access' : 'Premium Access',
      description: 'Subscription to all premium resources',
      amount: priceAmount || 2499, // Default price is $24.99 instead of $99
      billingCycle: billingCycle || 'monthly',
      imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'
    };
  }, [planId, priceAmount, billingCycle]);

  const handlePaymentMethodSelect = (method: 'stripe') => {
    setPaymentMethod(method);
    setPaymentError(null);
  };

  const handlePaymentComplete = async (success: boolean, transactionId?: string, error?: string) => {
    if (success) {
      setIsLoading(true); // Show loading animation immediately
      
      try {
        // Prepare the purchase data with proper type checks
        const purchaseItems = cartItems.length > 0 ? cartItems : [{
          id: product.id,
          name: product.name,
          price: `$${(product.amount / 100).toFixed(2)}`,
          quantity: 1,
          image: product.imageUrl
        }];
        
        // Create base purchase data object
        const purchaseData: any = {
          items: purchaseItems,
          paymentMethod: paymentMethod,
          transactionId: transactionId || 'unknown',
          total: showCartItems ? getTotalPrice().toFixed(2) : (product.amount / 100).toFixed(2),
          purchaseDate: new Date().toISOString(),
          status: 'completed',
          email: contactInfo.email,
        };
        
        // Only add subscription data if this is actually a plan purchase with a valid planId
        if (planId && typeof planId === 'string' && planId.trim() !== '') {
          purchaseData.subscription = {
            plan: planId,
            billingCycle: billingCycle || 'monthly',
            price: (product.amount / 100).toFixed(2),
            status: 'active',
            endDate: new Date(new Date().setMonth(
              new Date().getMonth() + (billingCycle === 'yearly' ? 12 : 1)
            )).toISOString()
          };
        } else {
          // Explicitly set subscription to null instead of undefined
          // (Firestore accepts null but not undefined)
          purchaseData.subscription = null;
        }
        
        console.log('Final purchase data being sent:', JSON.stringify(purchaseData, null, 2));
        
        // Save purchase to database
        if (isLoggedIn && user) {
          await recordUserPurchase(purchaseData);
        }
        
        setPaymentId(transactionId || 'TEMP-' + Date.now());
        setPaymentComplete(true);
        
        // Instead of showing completion UI in place, redirect to thank you page
        navigate('/thankyou', { 
          state: { 
            transactionId, 
            amount: getTotalPrice().toFixed(2),
            email: contactInfo.email 
          } 
        });
      } catch (err) {
        console.error('Error recording purchase:', err);
        setPaymentError('Failed to record your purchase. Please contact support.');
        setIsLoading(false);
      }
    } else {
      setPaymentError(error || 'Payment failed. Please try again.');
      setIsLoading(false);
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
  
  // Update validation to check for terms agreement
  const validateCardForm = (): boolean => {
    let isValid = true;
    const errors: {
      number?: string;
      expiry?: string;
      cvc?: string;
    } = {};
    
    // Existing validation
    if (!cardNumber || cardNumber.replace(/\s/g, '').length < 16) {
      errors.number = 'Please enter a valid card number';
      isValid = false;
    }
    
    if (!cardExpiry || !cardExpiry.includes('/')) {
      errors.expiry = 'Please enter a valid expiry date (MM/YY)';
      isValid = false;
    }
    
    if (!cardCvc || cardCvc.length < 3) {
      errors.cvc = 'Please enter a valid CVC code';
      isValid = false;
    }
    
    if (!contactInfo.email) {
      alert('Please enter your email address');
      return false;
    }
    
    if (!termsAgreed) {
      alert('You must agree to the Terms of Use to complete your purchase');
      return false;
    }
    
    setCardError(errors);
    return isValid;
  };
  
  // Handle card payment submission
  const handleCardPayment = () => {
    // Clear any previous payment errors
    setPaymentError(null);
    
    // Run full validation before processing payment
    if (validateCardForm()) {
      setIsProcessing(true);
      
      // In a real application, you would make a request to your payment processor here
      // with both card details and shipping address
      // For this demo, we'll simulate a successful payment after a short delay
      setTimeout(() => {
        const paymentData = {
          cardNumber: cardNumber.replace(/\s/g, ''),
          cardExpiry,
          billingAddress: {
            firstName: '',
            lastName: '',
            organization: '',
            streetAddress: '',
            city: '',
            postcode: '',
            country: '',
            state: '',
            phone: '',
            phoneCountryCode: '+61',
          }
        };
        
        console.log('Payment data:', paymentData);
        handlePaymentComplete(true, "card_" + Math.random().toString(36).substring(2, 15));
      }, 1500);
    } else {
      // If validation fails, display a general error
      if (!contactInfo.email || !termsAgreed) {
        setPaymentError("Please complete all required fields and accept the terms of service.");
      } else {
        setPaymentError("Please check your card details and try again.");
      }
    }
  };

  // Update the useEffect to use loadShippingInfo instead of loadBillingInfo
  // Also remove any references to loadShippingAddresses since we're consolidating
  useEffect(() => {
    // Redirect to sign in if not logged in
    if (!isLoggedIn) {
      navigate('/signin', { 
        state: { 
          redirectUrl: location.pathname,
          message: 'Please sign in to complete your purchase' 
        } 
      });
      return;
    }
  }, [isLoggedIn, navigate, location.pathname]);

  // Update handleContinueToPayment to simply validate the form without calling validateCardForm
  const validateCheckoutForm = (): boolean => {
    // Don't call validateCardForm() here, just check basic conditions
    return !!contactInfo.email && termsAgreed;
  };

  // Create a new function to check if the card data seems valid without updating state
  const isCardDataValid = (): boolean => {
    return (
      !!cardNumber && cardNumber.replace(/\s/g, '').length >= 16 &&
      !!cardExpiry && cardExpiry.includes('/') &&
      !!cardCvc && cardCvc.length >= 3
    );
  };

  // Add a useEffect to preserve checkout parameters in local storage
  useEffect(() => {
    // Save current checkout parameters to localStorage when they change
    if (billingCycle && planId) {
      const checkoutParams = {
        planId,
        billingCycle,
        priceParam,
        displayPrice
      };
      localStorage.setItem('checkoutParams', JSON.stringify(checkoutParams));
    }
  }, [planId, billingCycle, priceParam, displayPrice]);

  // Add a useEffect to restore checkout parameters from localStorage on page load
  useEffect(() => {
    // Only restore from localStorage if URL params are missing
    if (!planId && !location.search.includes('plan=')) {
      const savedParams = localStorage.getItem('checkoutParams');
      if (savedParams) {
        try {
          const params = JSON.parse(savedParams);
          // If we don't have URL params but have saved params, redirect to include them
          if (params.planId) {
            // Construct URL with saved parameters
            const searchParams = new URLSearchParams();
            if (params.planId) searchParams.append('plan', params.planId);
            if (params.billingCycle) searchParams.append('billing', params.billingCycle);
            if (params.priceParam) searchParams.append('price', params.priceParam);
            if (params.displayPrice) searchParams.append('display_price', params.displayPrice);
            
            // Redirect to the same page but with the parameters in URL
            navigate(`${location.pathname}?${searchParams.toString()}`, { replace: true });
          }
        } catch (e) {
          console.error("Error restoring checkout parameters:", e);
          localStorage.removeItem('checkoutParams');
        }
      }
    }
  }, [navigate, location.pathname, planId]);

  // Save the current checkout URL path if user is not logged in
  useEffect(() => {
    if (auth && !auth.isLoggedIn) {
      auth.saveLastVisitedPath(window.location.pathname + window.location.search);
    }
  }, [auth, location.pathname, location.search]);
  
  // Check for redirect after login
  useEffect(() => {
    if (auth && auth.isLoggedIn) {
      const lastPath = auth.getLastVisitedPath();
      if (lastPath && lastPath.includes('/checkout')) {
        navigate(lastPath, { replace: true });
      }
    }
  }, [auth?.isLoggedIn, navigate]);

  return (
    <div className="bg-[#f8f9fa]">
      <Header />
      
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <h1 className="text-2xl md:text-3xl font-bold mb-4 text-[#2d3748]">Subscribe to Premium Access</h1>
          <p className="text-gray-600 mb-6">Join thousands of speech therapy professionals who trust our premium resources</p>
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              Unlimited Downloads
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Cancel Anytime
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              New Resources Monthly
            </span>
          </div>
        </div>
        
        {isLoading && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl text-center max-w-md w-full">
              <div className="animate-spin mx-auto w-12 h-12 border-4 border-[#2bcd82] border-t-transparent rounded-full mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Processing Your Order</h2>
              <p className="text-gray-600">Please wait while we complete your purchase...</p>
            </div>
          </div>
        )}
        
        {paymentComplete ? (
          // This will only show briefly before redirect
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
            {/* Left Column - Your Information and Payment Method */}
            <div className="w-full lg:w-7/12 order-2 lg:order-1">
              {/* Your Information Section */}
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4 pb-3 border-b border-gray-100">Account Details</h2>
                
                <div className="mb-4">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={contactInfo.email}
                    onChange={handleContactInfoChange}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-[#2bcd82] focus:border-[#2bcd82] transition-colors"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">We'll send your receipt, login details, and subscription information to this email</p>
                </div>
                
                {/* Add Subscription Information */}
                <div className="bg-yellow-50 rounded-lg p-4 mb-6">
                  <h3 className="text-sm font-semibold text-yellow-800 mb-2 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    About Your Subscription
                  </h3>
                  <ul className="text-sm text-yellow-700 space-y-2">
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5 text-yellow-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Your subscription will begin immediately after payment is processed</span>
                    </li>
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5 text-yellow-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span>You'll be billed {billingCycle === 'yearly' ? 'annually' : 'monthly'} until you cancel</span>
                    </li>
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5 text-yellow-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                      </svg>
                      <span>You can manage or cancel your subscription anytime from your account dashboard</span>
                    </li>
                  </ul>
                </div>
                
                {/* Add Payment Details section - existing content */}
                <div className="mt-8 mb-6">
                  <h3 className="text-md font-semibold mb-4 pb-2 border-b border-gray-100">Payment Details</h3>
                  
                  <div className="mb-3 flex items-center">
                    <div className="w-8 h-8 rounded-full bg-[#f0fdf4] flex items-center justify-center mr-3">
                      <CreditCard className="w-4 h-4 text-[#2bcd82]" />
                    </div>
                    <div className="flex-1">
                      <span className="font-medium block text-gray-800">Credit/Debit Card</span>
                      <span className="text-xs text-gray-500">Secure payment via Stripe</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <img src="https://cdn.jsdelivr.net/gh/stripe-samples/images@main/visa.svg" alt="Visa" className="h-6" />
                      <img src="https://cdn.jsdelivr.net/gh/stripe-samples/images@main/mastercard.svg" alt="Mastercard" className="h-6" />
                      <img src="https://cdn.jsdelivr.net/gh/stripe-samples/images@main/amex.svg" alt="Amex" className="h-6" />
                    </div>
                  </div>
                  
                  {paymentError && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm">
                      {paymentError}
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    {/* Card Number Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="1234 5678 9012 3456"
                          value={cardNumber}
                          onChange={handleCardNumberChange}
                          className={`w-full p-3 pr-10 border ${cardError.number ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-1 focus:ring-[#2bcd82] focus:border-[#2bcd82] transition-colors`}
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <CreditCard className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                      {cardError.number && <p className="mt-1 text-xs text-red-500">{cardError.number}</p>}
                    </div>
                    
                    {/* Card Expiration and CVC Fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Expiration Date</label>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          value={cardExpiry}
                          onChange={handleCardExpiryChange}
                          className={`w-full p-3 border ${cardError.expiry ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-1 focus:ring-[#2bcd82] focus:border-[#2bcd82] transition-colors`}
                        />
                        {cardError.expiry && <p className="mt-1 text-xs text-red-500">{cardError.expiry}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">CVC</label>
                        <input
                          type="text"
                          placeholder="123"
                          value={cardCvc}
                          onChange={handleCardCvcChange}
                          className={`w-full p-3 border ${cardError.cvc ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-1 focus:ring-[#2bcd82] focus:border-[#2bcd82] transition-colors`}
                        />
                        {cardError.cvc && <p className="mt-1 text-xs text-red-500">{cardError.cvc}</p>}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Terms and Privacy Agreement */}
                <div className="mb-4">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="terms"
                        name="terms"
                        type="checkbox"
                        checked={termsAgreed}
                        onChange={() => setTermsAgreed(!termsAgreed)}
                        className="h-4 w-4 text-[#2bcd82] focus:ring-[#2bcd82] border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="terms" className="font-medium text-gray-700">
                        I agree to the <a href="/terms" className="text-[#2bcd82] hover:underline" target="_blank" rel="noopener noreferrer">Terms of Service</a>, <a href="/privacy" className="text-[#2bcd82] hover:underline" target="_blank" rel="noopener noreferrer">Privacy Policy</a>, and Subscription Terms
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6">
                  <button
                    type="button"
                    className={`w-full py-3 px-4 flex justify-center items-center rounded-md ${
                      !validateCheckoutForm() || !isCardDataValid() || isProcessing
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-[#2bcd82] hover:bg-[#25b975]'
                    } text-white font-medium transition-colors`}
                    disabled={!validateCheckoutForm() || !isCardDataValid() || isProcessing}
                    onClick={handleCardPayment}
                  >
                    {isProcessing ? (
                      <span className="inline-flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      <>
                        Complete Payment
                        <span className="ml-1 text-white">
                          {showCartItems 
                            ? `($${getTotalPrice().toFixed(2)})` 
                            : displayPrice 
                              ? `(${displayPrice})` 
                              : `($${(product.amount / 100).toFixed(2)}${product.billingCycle === 'monthly' ? '/monthly' : '/yearly'})`
                          }
                        </span>
                      </>
                    )}
                  </button>
                  <p className="mt-3 text-xs text-center text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 inline mr-1">
                      <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                    </svg>
                    Secured by 256-bit SSL encryption
                  </p>
                </div>
              </div>
              
              {/* Add Testimonials Section */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-md font-semibold mb-4 text-center">Trusted by Speech Therapy Professionals</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center mb-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3 text-blue-600 font-bold">
                        JD
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">Jennifer D.</p>
                        <p className="text-xs text-gray-500">Speech-Language Pathologist</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 italic">"The premium resources have transformed my practice. My clients are more engaged and I save hours every week on preparation."</p>
                    <div className="flex mt-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center mb-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mr-3 text-purple-600 font-bold">
                        MT
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">Michael T.</p>
                        <p className="text-xs text-gray-500">Clinic Director</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 italic">"Our entire team uses these resources daily. The subscription has paid for itself many times over in time saved and client satisfaction."</p>
                    <div className="flex mt-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-500">Join over 2,000 professionals who trust our resources</p>
                </div>
              </div>
            </div>
            
            {/* Right Column - Order Summary */}
            <div className="w-full lg:w-5/12 order-1 lg:order-2">
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6 sticky top-4">
                <h2 className="text-xl font-semibold mb-4 pb-3 border-b border-gray-100">Your Subscription</h2>
                
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
                  <>
                    <div className="flex items-center mb-6">
                      <div className="w-20 h-20 rounded-md overflow-hidden mr-4 bg-gray-50 flex items-center justify-center">
                        <img 
                          src={product.imageUrl} 
                          alt={product.name} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800">{product.name}</h3>
                        <p className="text-gray-600 text-sm">{product.description}</p>
                        <div className="flex items-center mt-2">
                          <p className="text-[#fb6a69] font-bold">
                            {displayPrice ? displayPrice : `$${(product.amount / 100).toFixed(2)}`}
                            {billingCycle && !displayPrice && <span className="text-gray-500 font-normal text-sm">/{billingCycle}</span>}
                          </p>
                          {billingCycle === 'monthly' && (
                            <span className="ml-2 text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                              Most flexible
                            </span>
                          )}
                          {billingCycle === 'yearly' && (
                            <span className="ml-2 text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">
                              Best value
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Subscription Benefits Box */}
                    <div className="bg-[#f8f9ff] p-4 rounded-lg mb-6">
                      <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        What's included:
                      </h4>
                      <ul className="space-y-2">
                        <li className="flex text-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-gray-700">Access to 200+ premium resources</span>
                        </li>
                        <li className="flex text-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-gray-700">20+ new resources added monthly</span>
                        </li>
                        <li className="flex text-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-gray-700">Unlimited downloads & printable PDFs</span>
                        </li>
                        <li className="flex text-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-gray-700">Priority access to new materials</span>
                        </li>
                      </ul>
                    </div>
                  </>
                )}
                
                <div className="border-t border-b border-gray-100 py-4 my-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">
                      {showCartItems 
                        ? `$${getTotalPrice().toFixed(2)}` 
                        : displayPrice 
                          ? displayPrice.replace(/\/.*$/, '') // Remove any "/monthly" or "/yearly" suffix
                          : `$${(product.amount / 100).toFixed(2)}`
                      }
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Tax</span>
                    <span className="font-medium">$0.00</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-gray-800">Total</span>
                  <span className="font-bold text-xl">
                    {showCartItems 
                      ? `$${getTotalPrice().toFixed(2)}` 
                      : displayPrice 
                        ? displayPrice.replace(/\/.*$/, '') // Remove any "/monthly" or "/yearly" suffix
                        : `$${(product.amount / 100).toFixed(2)}`
                    }
                  </span>
                </div>
                
                <div className="bg-[#f0fdf4] p-3 rounded-md text-sm text-[#166534] mb-4">
                  <div className="flex">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[#2bcd82]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <div>
                      <p className="font-medium">Your subscription begins immediately</p>
                      <p className="text-xs mt-1 text-[#166534]/80">Cancel anytime before your next billing period</p>
                    </div>
                  </div>
                </div>
                
                {/* Add Satisfaction Guarantee */}
                <div className="flex items-center text-xs text-gray-500 justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  100% Satisfaction Guarantee • 14-Day Money Back
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