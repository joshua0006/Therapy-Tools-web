import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import Button from './Button';
import { Check, Star, Shield, Zap, FileText, Headphones, Award, Calendar, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface PlanFeature {
  text: string;
  icon: React.ReactNode;
  highlight?: boolean;
}

const PlansPage: React.FC = () => {
  const navigate = useNavigate();
  const { isLoggedIn, user, isSubscriptionActive, getSubscriptionRemainingDays } = useAuth();
  const [hasActiveSubscription, setHasActiveSubscription] = useState<boolean>(false);
  const [daysRemaining, setDaysRemaining] = useState<number>(0);

  // Define plan price as a constant to ensure consistency
  const YEARLY_PRICE = 2500.00;

  // Check if user has active subscription
  useEffect(() => {
    if (isLoggedIn && user && user.subscription) {
      const isActive = isSubscriptionActive();
      setHasActiveSubscription(isActive);
      
      if (isActive) {
        setDaysRemaining(getSubscriptionRemainingDays());
      }
    }
  }, [isLoggedIn, user, isSubscriptionActive, getSubscriptionRemainingDays]);

  const premiumFeatures: PlanFeature[] = [
    { 
      text: "Unlimited access to all therapy resources", 
      icon: <FileText className="w-5 h-5 text-[#2bcd82]" />,
      highlight: true
    },
    { 
      text: "Premium assessment tools & materials", 
      icon: <Award className="w-5 h-5 text-[#2bcd82]" />,
      highlight: true
    },
    { 
      text: "Unlimited downloads every month", 
      icon: <Zap className="w-5 h-5 text-[#2bcd82]" />,
      highlight: true
    },
    { 
      text: "Priority 24/7 customer support", 
      icon: <Headphones className="w-5 h-5 text-[#2bcd82]" /> 
    },
    { 
      text: "Community forum access for collaboration", 
      icon: <Star className="w-5 h-5 text-[#2bcd82]" /> 
    },
    { 
      text: "Exclusive monthly webinars and training", 
      icon: <Shield className="w-5 h-5 text-[#2bcd82]" /> 
    }
  ];

  const handleGetStarted = () => {
    // Include full pricing details in the URL for the checkout page to use
    navigate(`/checkout?plan=premium&billing=yearly&price=${YEARLY_PRICE}&display_price=$${YEARLY_PRICE.toFixed(2)}/year`);
    
    // Also set session storage to persist the price selection in case the URL parameters get lost
    sessionStorage.setItem('selectedPlan', 'yearly');
    sessionStorage.setItem('selectedPrice', YEARLY_PRICE.toString());
    sessionStorage.setItem('displayPrice', `$${YEARLY_PRICE.toFixed(2)}/year`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-6">
        <div className="text-center mb-6 bg-white rounded-2xl p-6 shadow-sm">
          <h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-[#2bcd82] to-[#25b975]">Premium Membership</h1>
          <p className="text-md text-gray-600 max-w-3xl mx-auto">
            Unlock your full potential with our all-inclusive annual membership
          </p>
          <div className="mt-3 max-w-sm mx-auto h-1 bg-gradient-to-r from-[#2bcd82] to-transparent rounded-full"></div>
        </div>

        {/* Display subscription status for existing members */}
        {isLoggedIn && hasActiveSubscription && (
          <div className="max-w-4xl mx-auto mb-4 bg-green-50 rounded-xl p-4 border border-green-100">
            <div className="flex items-center">
              <div className="bg-green-100 p-2 rounded-full mr-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-800">Active Subscription</h3>
                <p className="text-sm text-gray-600">
                  You have an active yearly subscription to our {user?.subscription?.plan || 'premium'} plan.
                </p>
                <div className="flex items-center mt-1">
                  <Calendar className="w-4 h-4 text-green-600 mr-1" />
                  <p className="text-xs text-gray-500">
                    Your subscription will renew in <span className="font-medium text-green-600">{daysRemaining} days</span>
                    {user?.subscription?.endDate && ` (${new Date(user.subscription.endDate).toLocaleDateString()})`}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Button 
                variant="secondary" 
                size="small" 
                className="text-xs"
                onClick={() => navigate('/settings?tab=subscription')}
              >
                Manage Subscription
              </Button>
            </div>
          </div>
        )}

        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden transform transition-all hover:shadow-xl">
            {/* Decorative gradient header */}
            <div className="h-6 bg-gradient-to-r from-[#2bcd82] to-[#25b975]"></div>
            
            <div className="p-6">
              {/* Premium plan badge */}
              <div className="inline-block bg-gradient-to-r from-[#2bcd82] to-[#25b975] text-white px-3 py-1 rounded-full font-bold text-xs mb-3">
                ANNUAL PLAN
              </div>
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-1">Premium Plan</h2>
                  <p className="text-gray-600">Complete solution for speech pathology professionals</p>
                </div>
                
                {/* Pricing Display */}
                <div className="mt-4 md:mt-0 flex flex-col items-end">
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold text-[#fb6a69]">${YEARLY_PRICE.toFixed(2)}</span>
                    <span className="text-gray-500 ml-2">per year</span>
                  </div>
                  <div className="text-xs text-green-600 font-medium">Premium Annual Subscription</div>
                </div>
              </div>
              
              {/* Features section - more compact */}
              <h3 className="text-lg font-semibold mb-3 text-gray-700">Everything you need to excel:</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 mb-4">
                {premiumFeatures.map((feature, index) => (
                  <div 
                    key={index} 
                    className={`flex items-start p-2 rounded-lg ${
                      feature.highlight 
                        ? 'bg-green-50 border border-green-100' 
                        : ''
                    }`}
                  >
                    <div className="mr-2 mt-0.5">
                      {feature.icon}
                    </div>
                    <div>
                      <span className="text-gray-800 text-sm font-medium">
                        {feature.text}
                      </span>
                    </div>
                  </div>
                ))}
              </div>              
                
              <div className="mt-4">
                <Button 
                  variant="primary" 
                  size="large" 
                  className="py-3 shadow-lg w-full"
                  onClick={() => handleGetStarted()}
                >
                  <span className="flex flex-col items-center">
                    <span>Get Yearly Plan</span>
                    <span className="text-xs font-normal">${YEARLY_PRICE.toFixed(2)}/year</span>
                  </span>
                </Button>
              </div>
              
              <p className="text-center text-gray-500 text-xs mt-2">No credit card required for free trial. Cancel anytime.</p>
            </div>
          </div>
          
          {/* Condensed testimonials and FAQ */}
          <div className="mt-4 flex flex-col md:flex-row gap-4">
            {/* Testimonial section - more compact */}
            <div className="bg-white rounded-xl shadow-md p-4 flex-1">
              <h2 className="text-lg font-bold text-gray-800 mb-3">What Our Members Say</h2>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex text-[#fb6a69] mb-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 text-sm italic mb-2">"This membership has completely transformed my practice. The resources have saved me countless hours of preparation time."</p>
                <div className="font-medium text-sm text-gray-800">Sarah T. - Speech Pathologist</div>
              </div>
            </div>
            
            {/* FAQ section - more compact */}
            <div className="bg-white rounded-xl shadow-md p-4 flex-1">
              <h2 className="text-lg font-bold text-gray-800 mb-3">FAQ</h2>
              <div>
                <div className="mb-2">
                  <h3 className="text-sm font-medium text-gray-800">Can I cancel anytime?</h3>
                  <p className="text-xs text-gray-600">Yes, cancel anytime. Your access continues until the end of your billing cycle.</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-800">Is there a monthly option?</h3>
                  <p className="text-xs text-gray-600">We currently only offer an annual plan at $2,500/year for the best value.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PlansPage; 