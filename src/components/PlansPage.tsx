import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import Button from './Button';
import { Check } from 'lucide-react';

interface PlanFeature {
  text: string;
  included: boolean;
}

interface PricingPlan {
  id: number;
  name: string;
  price: string;
  period: string;
  description: string;
  features: PlanFeature[];
  popular?: boolean;
}

const PlansPage: React.FC = () => {
  const navigate = useNavigate();

  const plans: PricingPlan[] = [
    {
      id: 1,
      name: "Basic",
      price: "$9.99",
      period: "per month",
      description: "Essential resources for individual speech pathologists",
      features: [
        { text: "Access to basic worksheets", included: true },
        { text: "5 downloads per month", included: true },
        { text: "Basic assessment tools", included: true },
        { text: "Email support", included: true },
        { text: "Community forum access", included: false },
        { text: "Exclusive webinars", included: false },
        { text: "Custom materials creation", included: false },
      ]
    },
    {
      id: 2,
      name: "Professional",
      price: "$19.99",
      period: "per month",
      description: "Complete toolkit for practicing professionals",
      features: [
        { text: "Unlimited worksheets access", included: true },
        { text: "25 downloads per month", included: true },
        { text: "Complete assessment library", included: true },
        { text: "Priority email support", included: true },
        { text: "Community forum access", included: true },
        { text: "Exclusive webinars", included: true },
        { text: "Custom materials creation", included: false },
      ],
      popular: true
    },
    {
      id: 3,
      name: "Clinic",
      price: "$49.99",
      period: "per month",
      description: "For clinics and multi-therapist practices",
      features: [
        { text: "Unlimited full library access", included: true },
        { text: "Unlimited downloads", included: true },
        { text: "Complete assessment library", included: true },
        { text: "24/7 priority support", included: true },
        { text: "Community forum access", included: true },
        { text: "Exclusive webinars", included: true },
        { text: "Custom materials creation", included: true },
      ]
    }
  ];

  const handleGetStarted = (planId: number) => {
    navigate(`/checkout?plan=${planId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Membership Plans</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Choose the perfect plan to access our comprehensive speech pathology resources
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div 
              key={plan.id} 
              className={`bg-white rounded-xl shadow-md overflow-hidden transition-transform hover:scale-105 ${
                plan.popular ? 'border-4 border-[#2bcd82] relative' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-[#2bcd82] text-white px-4 py-1 rounded-bl-lg font-medium">
                  Popular
                </div>
              )}
              <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-[#fb6a69]">{plan.price}</span>
                  <span className="text-gray-500"> {plan.period}</span>
                </div>
                <p className="text-gray-600 mb-6">{plan.description}</p>
                
                <Button 
                  variant="primary" 
                  size="large" 
                  className="w-full mb-8"
                  onClick={() => handleGetStarted(plan.id)}
                >
                  Get Started
                </Button>
                
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <div className={`mt-1 mr-3 ${feature.included ? 'text-[#2bcd82]' : 'text-gray-300'}`}>
                        <Check className="w-5 h-5" />
                      </div>
                      <span className={feature.included ? 'text-gray-700' : 'text-gray-400'}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 bg-white rounded-xl shadow-md p-8 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Frequently Asked Questions</h2>
          <div className="divide-y">
            {[
              {
                question: "Can I cancel my subscription at any time?",
                answer: "Yes, you can cancel your subscription at any time. Your access will continue until the end of your current billing cycle."
              },
              {
                question: "Is there a discount for annual subscriptions?",
                answer: "Yes, we offer a 20% discount when you choose annual billing for any of our plans."
              },
              {
                question: "How many users can use a Clinic plan?",
                answer: "The Clinic plan includes access for up to 5 therapists. Additional users can be added for a small fee."
              },
              {
                question: "Are the resources printable or digital only?",
                answer: "All our resources are available in both printable PDF formats and digital formats that can be used with tablets and computers."
              }
            ].map((faq, index) => (
              <div key={index} className="py-4">
                <h3 className="text-lg font-medium text-gray-800 mb-2">{faq.question}</h3>
                <p className="text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PlansPage; 