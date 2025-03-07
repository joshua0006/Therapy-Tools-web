import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import Button from './Button';
// import StripePayment from './StripePayment';
import PayPalPayment from './PayPalPayment';
import { CreditCard, CircleDollarSign, ShieldCheck, Lock, Check } from 'lucide-react';
import { useCart, CartItem } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

interface CheckoutPageProps {
  productId?: string; // Optional product ID from URL
}

const CheckoutPage: React.FC<CheckoutPageProps> = ({ productId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { recordUserPurchase, isLoggedIn, user } = useAuth();
  const { clearCart } = useCart();
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

  // Billing address state
  const [billingAddress, setBillingAddress] = useState({
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
    termsAgreed: false
  });

  // Handle contact info change
  const handleContactInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setContactInfo(prevInfo => ({
      ...prevInfo,
      [name]: value
    }));
  };

  // Handle billing address change
  const handleBillingAddressChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setBillingAddress(prevAddress => ({
      ...prevAddress,
      [name]: type === 'checkbox' ? checked : value
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
      // Capture cart items before setting payment complete (which might trigger UI changes)
      const currentCartItems = [...cartItems]; 
      
      setPaymentComplete(true);
      setPaymentId(transactionId);
      
      // Record purchase in Firebase if user is logged in
      if (isLoggedIn && user) {
        try {
          // Define type for purchase items
          interface PurchaseItem {
            id: number | string;
            type: 'product' | 'plan';
            name: string;
            description?: string;
            category?: string;
            price: string;
            quantity: number;
            imageUrl?: string;
          }
          
          let purchaseItems: PurchaseItem[] = [];
          
          // If buying a plan
          if (selectedPlan) {
            purchaseItems = [{
              id: selectedPlan.id,
              type: 'plan',
              name: selectedPlan.name,
              price: (selectedPlan.amount / 100).toFixed(2),
              quantity: 1,
              imageUrl: selectedPlan.imageUrl || ''
            }];
          } 
          // If checking out cart items
          else if (currentCartItems.length > 0) {
            purchaseItems = currentCartItems.map(item => ({
              id: parseInt(item.id.toString()), // Ensure consistent ID format
              type: 'product' as const,
              name: item.title,
              description: item.description || '',
              category: item.category || 'Resource',
              price: item.price.replace(/[^\d.-]/g, ''), // Remove any currency symbols
              quantity: item.quantity || 1,
              imageUrl: item.imageUrl || ''
            }));
            
            // Add console log for debugging
            console.log('Processing purchase items:', purchaseItems);
            
            // Clear cart after successfully creating the purchase items array
            clearCart();
          } else {
            console.error('No items found in cart during payment completion');
          }
          
          // Record the purchase with standardized data format
          const purchaseData = {
            items: purchaseItems,
            total: selectedPlan ? (selectedPlan.amount / 100).toFixed(2) : getTotalPrice().toFixed(2),
            transactionId,
            paymentMethod: paymentMethod || 'unknown',
            purchaseDate: new Date().toISOString(),
            status: 'completed',
            billingInfo: {
              firstName: billingAddress.firstName || '',
              lastName: billingAddress.lastName || '',
              email: contactInfo.email || ''
            }
          };
          
          // Add debug logging
          console.log('Sending purchase data to Firebase:', purchaseData);
          
          // Use a try-catch specifically for the recordUserPurchase call
          try {
            const purchaseResult = await recordUserPurchase(purchaseData);
            console.log('Purchase recorded successfully:', purchaseResult);
          } catch (recordError) {
            console.error('Failed to record purchase in Firebase:', recordError);
          }
          
        } catch (error) {
          console.error("Failed to process purchase data:", error);
          // Still consider the purchase successful even if recording fails
        }
      }
      
      // Redirect to success page after a short delay
      setTimeout(() => {
        // Build a proper items array for the success page state
        let successItems: CartItem[] = [];
        let purchaseType: 'cart_items' | 'plan' | 'unknown';
        
        if (currentCartItems.length > 0) {
          successItems = currentCartItems;
          purchaseType = 'cart_items';
        } else if (selectedPlan) {
          successItems = [{
            id: parseInt(selectedPlan.id),
            title: selectedPlan.name,
            description: selectedPlan.description,
            price: `$${(selectedPlan.amount / 100).toFixed(2)}`,
            quantity: 1,
            imageUrl: selectedPlan.imageUrl || '',
            category: 'Subscription Plan'
          }];
          purchaseType = 'plan';
        } else {
          // Fallback - should never happen if validation is working
          successItems = [];
          purchaseType = 'unknown';
        }
        
        navigate('/payment-success', { 
          state: { 
            paymentId: transactionId,
            amount: selectedPlan ? (selectedPlan.amount / 100).toFixed(2) : getTotalPrice().toFixed(2),
            items: successItems,
            purchaseType: purchaseType
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
    let isValid = true;
    const errors: {
      number?: string;
      expiry?: string;
      cvc?: string;
    } = {};
    
    // Validate card number
    if (!cardNumber || cardNumber.replace(/\s/g, '').length < 16) {
      errors.number = 'Please enter a valid card number';
      isValid = false;
    }
    
    // Validate expiry date
    if (!cardExpiry || cardExpiry.length < 5) {
      errors.expiry = 'Please enter a valid expiry date';
      isValid = false;
    } else {
      const [month, year] = cardExpiry.split('/');
      const currentYear = new Date().getFullYear() % 100;
      const currentMonth = new Date().getMonth() + 1;
      
      if (parseInt(year) < currentYear || (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
        errors.expiry = 'Card expired';
        isValid = false;
      }
    }
    
    // Validate CVC
    if (!cardCvc || cardCvc.length < 3) {
      errors.cvc = 'Please enter a valid security code';
      isValid = false;
    }
    
    // Validate required billing address fields
    if (!billingAddress.firstName) {
      alert('Please enter your first name');
      return false;
    }
    
    if (!billingAddress.lastName) {
      alert('Please enter your last name');
      return false;
    }
    
    if (!billingAddress.streetAddress) {
      alert('Please enter your street address');
      return false;
    }
    
    if (!billingAddress.country) {
      alert('Please select your country');
      return false;
    }
    
    if (!billingAddress.termsAgreed) {
      alert('You must agree to the Terms of Use');
      return false;
    }
    
    setCardError(errors);
    return isValid;
  };
  
  // Handle card payment submission
  const handleCardPayment = () => {
    if (validateCardForm()) {
      setIsProcessing(true);
      
      // In a real application, you would make a request to your payment processor here
      // with both card details and billing address
      // For this demo, we'll simulate a successful payment after a short delay
      setTimeout(() => {
        const paymentData = {
          cardNumber: cardNumber.replace(/\s/g, ''),
          cardExpiry,
          billingAddress: {
            firstName: billingAddress.firstName,
            lastName: billingAddress.lastName,
            organization: billingAddress.organization,
            streetAddress: billingAddress.streetAddress,
            city: billingAddress.city,
            postcode: billingAddress.postcode,
            country: billingAddress.country,
            state: billingAddress.state,
            phone: `${billingAddress.phoneCountryCode} ${billingAddress.phone}`
          }
        };
        
        console.log('Payment data:', paymentData);
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
              
              {/* Billing Address Section */}
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4 pb-3 border-b border-gray-100">Billing Address</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={billingAddress.firstName}
                      onChange={handleBillingAddressChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-[#2bcd82] focus:border-[#2bcd82] transition-colors"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={billingAddress.lastName}
                      onChange={handleBillingAddressChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-[#2bcd82] focus:border-[#2bcd82] transition-colors"
                      required
                    />
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organization
                  </label>
                  <input
                    type="text"
                    name="organization"
                    value={billingAddress.organization}
                    onChange={handleBillingAddressChange}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-[#2bcd82] focus:border-[#2bcd82] transition-colors"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="streetAddress"
                    value={billingAddress.streetAddress}
                    onChange={handleBillingAddressChange}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-[#2bcd82] focus:border-[#2bcd82] transition-colors"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Town / City
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={billingAddress.city}
                      onChange={handleBillingAddressChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-[#2bcd82] focus:border-[#2bcd82] transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Postcode / ZIP
                    </label>
                    <input
                      type="text"
                      name="postcode"
                      value={billingAddress.postcode}
                      onChange={handleBillingAddressChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-[#2bcd82] focus:border-[#2bcd82] transition-colors"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="country"
                      value={billingAddress.country}
                      onChange={handleBillingAddressChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-[#2bcd82] focus:border-[#2bcd82] transition-colors"
                      required
                    >
                      <option value="">Select a country</option>
                      <option value="AU">Australia</option>
                      <option value="US">United States</option>
                      <option value="GB">United Kingdom</option>
                      <option value="CA">Canada</option>
                      <option value="NZ">New Zealand</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State / County
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={billingAddress.state}
                      onChange={handleBillingAddressChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-[#2bcd82] focus:border-[#2bcd82] transition-colors"
                    />
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <div className="flex">
                    <div className="w-20">
                      <select
                        name="phoneCountryCode"
                        value={billingAddress.phoneCountryCode}
                        onChange={handleBillingAddressChange}
                        className="w-full p-3 border border-gray-300 rounded-l-md focus:ring-1 focus:ring-[#2bcd82] focus:border-[#2bcd82] transition-colors"
                      >
                        <option value="+61">🇦🇺 +61</option>
                        <option value="+1">🇺🇸 +1</option>
                        <option value="+44">🇬🇧 +44</option>
                        <option value="+64">🇳🇿 +64</option>
                        <option value="+1">🇨🇦 +1</option>
                      </select>
                    </div>
                    <input
                      type="tel"
                      name="phone"
                      value={billingAddress.phone}
                      onChange={handleBillingAddressChange}
                      className="flex-1 p-3 border border-gray-300 border-l-0 rounded-r-md focus:ring-1 focus:ring-[#2bcd82] focus:border-[#2bcd82] transition-colors"
                      placeholder="Phone number"
                    />
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="terms"
                        name="termsAgreed"
                        type="checkbox"
                        checked={billingAddress.termsAgreed}
                        onChange={handleBillingAddressChange}
                        className="w-4 h-4 text-[#2bcd82] border-gray-300 rounded focus:ring-[#2bcd82]"
                        required
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="terms" className="font-medium text-gray-700">
                        I have read and agree to the <a href="/terms" className="text-[#2bcd82] hover:underline">Terms of Use</a> <span className="text-red-500">*</span>
                      </label>
                      <p className="text-gray-500 mt-1">
                        and acknowledge that all resources are licensed for use by a single user only and are not to be shared or distributed. For multi-user licensing options, <a href="/contact" className="text-[#2bcd82] hover:underline">click here</a>
                      </p>
                    </div>
                  </div>
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