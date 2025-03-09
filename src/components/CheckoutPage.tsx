import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import Button from './Button';
// import StripePayment from './StripePayment';
import { CreditCard, CircleDollarSign, ShieldCheck, CheckCircle, ArrowLeft, ChevronDown, ChevronUp, Lock } from 'lucide-react';
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

  // Primary Shipping Address state
  const [primaryShippingAddress, setPrimaryShippingAddress] = useState({
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
    termsAgreed: false,
    isDefaultBilling: false
  });

  // Primary Saved Addresses state
  const [primarySavedAddresses, setPrimarySavedAddresses] = useState<ShippingAddress[]>([]);
  const [selectedPrimaryAddressId, setSelectedPrimaryAddressId] = useState<number | null>(null);
  const [showPrimaryAddressForm, setShowPrimaryAddressForm] = useState(true);

  // Add termsAgreed state
  const [termsAgreed, setTermsAgreed] = useState(false);

  // Add a new state for the "set as default" prompt
  const [showSetDefaultPrompt, setShowSetDefaultPrompt] = useState<boolean>(false);
  const [newAddressCompleted, setNewAddressCompleted] = useState<boolean>(false);

  // Handle contact info change
  const handleContactInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setContactInfo(prevInfo => ({
      ...prevInfo,
      [name]: value
    }));
  };

  // Handle Primary Shipping Address change
  const handlePrimaryShippingAddressChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setPrimaryShippingAddress(prevAddress => ({
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
      name: 'Premium Plan',
      description: 'Complete solution for speech pathology professionals',
      amount: priceAmount || 9900, // Use price from URL or default to $99 if missing
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
  const product = !showCartItems && selectedPlan ? {
    id: selectedPlan.id,
    name: selectedPlan.name,
    description: billingCycle === 'yearly' 
      ? `Annual ${selectedPlan.description}` 
      : `Monthly ${selectedPlan.description}`,
    amount: selectedPlan.amount,
    displayPrice: displayPrice || undefined,
    billingCycle: billingCycle,
    imageUrl: selectedPlan.imageUrl
  } : {
    id: productId || 'default-product',
    name: 'Speech Therapy Premium Plan',
    description: 'Subscription to all premium resources',
    amount: 9900, // $99.00 in cents
    imageUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'
  };

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
        
        // Only add shipping address if it's available
        if (primaryShippingAddress.firstName) {
          purchaseData.shipping = { ...primaryShippingAddress };
        }
        
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
          
          // Also save shipping information if new address was entered
          if (showPrimaryAddressForm) {
            await saveShippingInfo({
              ...primaryShippingAddress,
              isDefault: primaryShippingAddress.isDefaultBilling || false
            }, primaryShippingAddress.isDefaultBilling || false);
          }
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
    
    if (showPrimaryAddressForm && !primaryShippingAddress.firstName) {
      alert('Please enter your first name');
      return false;
    }
    
    if (showPrimaryAddressForm && !primaryShippingAddress.lastName) {
      alert('Please enter your last name');
      return false;
    }
    
    if (showPrimaryAddressForm && !primaryShippingAddress.streetAddress) {
      alert('Please enter your street address');
      return false;
    }
    
    if (showPrimaryAddressForm && !primaryShippingAddress.country) {
      alert('Please select your country');
      return false;
    }
    
    // Check for terms agreement
    if (!termsAgreed) {
      alert('You must agree to the Terms of Use to complete your purchase');
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
      // with both card details and shipping address
      // For this demo, we'll simulate a successful payment after a short delay
      setTimeout(() => {
        const paymentData = {
          cardNumber: cardNumber.replace(/\s/g, ''),
          cardExpiry,
          billingAddress: {
            firstName: primaryShippingAddress.firstName,
            lastName: primaryShippingAddress.lastName,
            organization: primaryShippingAddress.organization,
            streetAddress: primaryShippingAddress.streetAddress,
            city: primaryShippingAddress.city,
            postcode: primaryShippingAddress.postcode,
            country: primaryShippingAddress.country,
            state: primaryShippingAddress.state,
            phone: `${primaryShippingAddress.phoneCountryCode} ${primaryShippingAddress.phone}`
          }
        };
        
        console.log('Payment data:', paymentData);
        handlePaymentComplete(true, "card_" + Math.random().toString(36).substring(2, 15));
      }, 1500);
    }
  };

  // Modify the loadShippingInfo function to detect when user has no addresses
  const loadShippingInfo = async () => {
    try {
      if (isLoggedIn && user) {
        const shippingAddresses = await getShippingInfo();
        setPrimarySavedAddresses(shippingAddresses);
        
        // Check if user has no addresses - if so, show the form
        if (!shippingAddresses || shippingAddresses.length === 0) {
          setShowPrimaryAddressForm(true);
          console.log('No shipping addresses found, showing address form');
          return;
        }
        
        // If user has a default shipping address, use it
        const defaultAddress = shippingAddresses.find(addr => addr.isDefault);
        
        if (defaultAddress) {
          setPrimaryShippingAddress({
            firstName: defaultAddress.firstName || '',
            lastName: defaultAddress.lastName || '',
            organization: defaultAddress.organization || '',
            streetAddress: defaultAddress.streetAddress || '',
            city: defaultAddress.city || '',
            postcode: defaultAddress.postcode || '',
            country: defaultAddress.country || '',
            state: defaultAddress.state || '',
            phone: defaultAddress.phone || '',
            phoneCountryCode: defaultAddress.phoneCountryCode || '+61',
            termsAgreed: false,
            isDefaultBilling: true
          });
          
          // If there are saved addresses, don't immediately show the form
            setShowPrimaryAddressForm(false);
            setSelectedPrimaryAddressId(shippingAddresses.findIndex(addr => addr.isDefault));
        } else if (shippingAddresses.length > 0) {
          // If no default but addresses exist, use the first one
          const firstAddress = shippingAddresses[0];
          setPrimaryShippingAddress({
            firstName: firstAddress.firstName || '',
            lastName: firstAddress.lastName || '',
            organization: firstAddress.organization || '',
            streetAddress: firstAddress.streetAddress || '',
            city: firstAddress.city || '',
            postcode: firstAddress.postcode || '',
            country: firstAddress.country || '',
            state: firstAddress.state || '',
            phone: firstAddress.phone || '',
            phoneCountryCode: firstAddress.phoneCountryCode || '+61',
            termsAgreed: false,
            isDefaultBilling: false
          });
          
          setShowPrimaryAddressForm(false);
          setSelectedPrimaryAddressId(0);
        }
      }
    } catch (error) {
      console.error('Error loading shipping information:', error);
    }
  };

  // Add a function to check if the address form is valid
  const isAddressFormValid = (): boolean => {
    return !!(
      primaryShippingAddress.firstName &&
      primaryShippingAddress.lastName &&
      primaryShippingAddress.streetAddress &&
      primaryShippingAddress.city &&
      primaryShippingAddress.postcode &&
      primaryShippingAddress.country
    );
  };

  // Add a function to handle the "Continue to Payment" button
  const handleContinueToPayment = () => {
    if (isAddressFormValid()) {
      // If this is a new address (user had no saved addresses), show set as default prompt
      if (primarySavedAddresses.length === 0) {
        setNewAddressCompleted(true);
        setShowSetDefaultPrompt(true);
      }
      // Otherwise, just proceed with payment
      else {
        // Scroll to payment section
        document.getElementById('payment-section')?.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // Show error for required fields
      alert('Please fill out all required fields in the shipping address form');
    }
  };

  // Add a function to handle the response to the "set as default" prompt
  const handleSetDefaultResponse = async (setAsDefault: boolean) => {
    if (isLoggedIn && user) {
      try {
        // Save the shipping address
        await saveShippingInfo(
          {
            ...primaryShippingAddress,
            createdAt: new Date(),
          },
          setAsDefault // Pass the user's choice about making it default
        );
        
        // Refresh shipping addresses
        const updatedAddresses = await getShippingInfo();
        setPrimarySavedAddresses(updatedAddresses);
        
        // Update UI
        toast.success('Shipping address saved successfully');
      } catch (error) {
        console.error('Error saving shipping address:', error);
        toast.error('Failed to save shipping address');
      }
    }
    
    // Hide the prompt and proceed with payment
    setShowSetDefaultPrompt(false);
    document.getElementById('payment-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Rename handleAddressSelect to handlePrimaryAddressSelect
  const handlePrimaryAddressSelect = (index: number) => {
    if (index >= 0 && index < primarySavedAddresses.length) {
      const selectedAddress = primarySavedAddresses[index];
      setPrimaryShippingAddress({
        firstName: selectedAddress.firstName || '',
        lastName: selectedAddress.lastName || '',
        organization: selectedAddress.organization || '',
        streetAddress: selectedAddress.streetAddress || '',
        city: selectedAddress.city || '',
        postcode: selectedAddress.postcode || '',
        country: selectedAddress.country || '',
        state: selectedAddress.state || '',
        phone: selectedAddress.phone || '',
        phoneCountryCode: selectedAddress.phoneCountryCode || '+61',
        termsAgreed: primaryShippingAddress.termsAgreed,
        isDefaultBilling: !!selectedAddress.isDefault
      });
      setSelectedPrimaryAddressId(index);
    }
  };

  // Rename handleUseNewAddress to handleUsePrimaryNewAddress
  const handleUsePrimaryNewAddress = () => {
    setShowPrimaryAddressForm(true);
    setSelectedPrimaryAddressId(null);
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

    // Load existing shipping information if available
    loadShippingInfo();
  }, [isLoggedIn, user, navigate, location.pathname]);

  return (
    <div className="bg-[#f8f9fa]">
      <Header />
      
      <div className="container mx-auto px-4 py-8 md:py-12">
        <h1 className="text-2xl md:text-3xl font-bold text-center mb-8 text-[#2d3748]">Checkout</h1>
        
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
            {/* Left Column - Order Details */}
            <div className="w-full lg:w-1/2 order-2 lg:order-1">
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4 pb-3 border-b border-gray-100">Your Information</h2>
                
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
                  <p className="mt-1 text-xs text-gray-500">Your receipt and download links will be sent to this email</p>
                </div>
              </div>
              
              {/* Shipping Address Section */}
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4 pb-3 border-b border-gray-100">Shipping Address</h2>
                
                {/* Saved Addresses Section */}
                {primarySavedAddresses.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-3">Your Saved Addresses</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {primarySavedAddresses.map((address, index) => (
                        <ShippingAddressCard
                          key={index}
                          address={address}
                          isSelected={selectedPrimaryAddressId === index}
                          isSelectable={true}
                          onSelect={() => handlePrimaryAddressSelect(index)}
                        />
                      ))}
                    </div>
                      <button
                        type="button"
                        onClick={handleUsePrimaryNewAddress}
                      className="text-sm text-[#2bcd82] hover:text-[#25b975] flex items-center font-medium"
                    >
                      + Use a different address
                      </button>
                  </div>
                )}
                
                {/* Shipping Address Form */}
                {showPrimaryAddressForm && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          First name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="firstName"
                          value={primaryShippingAddress.firstName}
                          onChange={handlePrimaryShippingAddressChange}
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
                          value={primaryShippingAddress.lastName}
                          onChange={handlePrimaryShippingAddressChange}
                          className="w-full p-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-[#2bcd82] focus:border-[#2bcd82] transition-colors"
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Organization
                      </label>
                      <input
                        type="text"
                        name="organization"
                        value={primaryShippingAddress.organization}
                        onChange={handlePrimaryShippingAddressChange}
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-[#2bcd82] focus:border-[#2bcd82] transition-colors"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Street address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="streetAddress"
                        value={primaryShippingAddress.streetAddress}
                        onChange={handlePrimaryShippingAddressChange}
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-[#2bcd82] focus:border-[#2bcd82] transition-colors"
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Town / City
                        </label>
                        <input
                          type="text"
                          name="city"
                          value={primaryShippingAddress.city}
                          onChange={handlePrimaryShippingAddressChange}
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
                          value={primaryShippingAddress.postcode}
                          onChange={handlePrimaryShippingAddressChange}
                          className="w-full p-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-[#2bcd82] focus:border-[#2bcd82] transition-colors"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Country <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="country"
                          value={primaryShippingAddress.country}
                          onChange={handlePrimaryShippingAddressChange}
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
                          value={primaryShippingAddress.state}
                          onChange={handlePrimaryShippingAddressChange}
                          className="w-full p-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-[#2bcd82] focus:border-[#2bcd82] transition-colors"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <div className="flex">
                        <div className="w-20">
                          <select
                            name="phoneCountryCode"
                            value={primaryShippingAddress.phoneCountryCode}
                            onChange={handlePrimaryShippingAddressChange}
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
                          value={primaryShippingAddress.phone}
                          onChange={handlePrimaryShippingAddressChange}
                          className="flex-1 p-3 border border-gray-300 border-l-0 rounded-r-md focus:ring-1 focus:ring-[#2bcd82] focus:border-[#2bcd82] transition-colors"
                          placeholder="Phone number"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Add "Continue to Payment" button when showing the address form */}
              {showPrimaryAddressForm && (
                <div className="mt-6">
                    <button
                    type="button"
                    className="w-full bg-[#2bcd82] hover:bg-[#25b975] text-white font-medium py-3 rounded-full transition-colors"
                    onClick={handleContinueToPayment}
                    disabled={!isAddressFormValid()}
                  >
                    Continue to Payment
                    </button>
                      </div>
                    )}
                    
              {/* Set as Default Prompt */}
              {showSetDefaultPrompt && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                    <h3 className="text-xl font-semibold mb-4">Save Address</h3>
                    <p className="mb-6">Would you like to save this as your default shipping address for future purchases?</p>
                    <div className="flex space-x-4">
                        <button 
                        className="flex-1 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
                        onClick={() => handleSetDefaultResponse(false)}
                      >
                        Don't Save
                        </button>
                          <button 
                        className="flex-1 py-2 bg-[#2bcd82] hover:bg-[#25b975] text-white rounded-md transition-colors"
                        onClick={() => handleSetDefaultResponse(true)}
                      >
                        Save as Default
                          </button>
                        </div>
                      </div>
                  </div>
                )}
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
                      <p className="text-[#fb6a69] font-bold mt-2">
                        {product.displayPrice || `$${(product.amount / 100).toFixed(2)}`}
                        {product.billingCycle && !product.displayPrice && `/${product.billingCycle === 'yearly' ? 'year' : 'month'}`}
                      </p>
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
                  <div className="flex items-center space-x-4">
                    <ShieldCheck className="w-5 h-5 text-[#2bcd82]" />
                    <span className="text-sm text-gray-600">Secure credit card payment</span>
                    <div className="flex items-center space-x-1">
                      <img src="https://cdn.iconscout.com/icon/free/png-256/free-visa-3-226460.png" alt="Visa" className="h-6" />
                      <img src="https://cdn.iconscout.com/icon/free/png-256/free-mastercard-3-226458.png" alt="Mastercard" className="h-6" />
                      <img src="https://cdn.iconscout.com/icon/free/png-256/free-american-express-3-226448.png" alt="Amex" className="h-6" />
                    </div>
                  </div>
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

        {/* Payment Method Section - Add an ID for smooth scrolling */}
        <div id="payment-section" className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4 pb-3 border-b border-gray-100">Payment Method</h2>
          
          <div>
            <div className="mb-5 flex items-center">
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
            </div>
            
            {paymentError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm">
                {paymentError}
              </div>
            )}
            
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
            
            {/* Terms Agreement Checkbox */}
            <div className="mb-6">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="terms-agreement"
                    name="terms-agreement"
                    type="checkbox"
                    checked={termsAgreed}
                    onChange={(e) => setTermsAgreed(e.target.checked)}
                    className="w-4 h-4 text-[#2bcd82] border-gray-300 rounded focus:ring-[#2bcd82]"
                    required
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="terms-agreement" className="font-medium text-gray-700">
                    I have read and agree to the <a href="/terms" className="text-[#2bcd82] hover:underline">Terms of Use</a> <span className="text-red-500">*</span>
                  </label>
                  <p className="text-gray-500 mt-1">
                    By completing this purchase, you agree that all resources are licensed for use by a single user only and are not to be shared or distributed.
                  </p>
                </div>
              </div>
            </div>
            
            <button 
              className={`w-full py-3 bg-[#2bcd82] hover:bg-[#25b975] text-white font-medium rounded-full shadow-lg transition-colors ${
                cardNumber.length < 16 || cardExpiry.length < 5 || cardCvc.length < 3 || !termsAgreed ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              onClick={handleCardPayment}
              disabled={cardNumber.length < 16 || cardExpiry.length < 5 || cardCvc.length < 3 || !termsAgreed}
            >
              {`Complete Payment ($${showCartItems 
                ? getTotalPrice().toFixed(2) 
                : (product.amount / 100).toFixed(2)})`}
            </button>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default CheckoutPage; 