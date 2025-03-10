import React, { useState } from 'react';

interface LeadCaptureProps {
  title?: string;
  description?: string;
  buttonText?: string;
  onSubmit?: (name: string, email: string) => void;
}

const LeadCapture: React.FC<LeadCaptureProps> = ({
  title = "Need free 100 Practices for Speech sheets?",
  description = "If you treat children with speech sound disorders and are looking for a quick way to get 100 practices, you will LOVE this 25-page freebie! Get your copy now!",
  buttonText = "Let's go!",
  onSubmit
}) => {
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName.trim() || !email.trim()) {
      setError('Please fill in all fields');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      // If onSubmit is provided, call it with the form data
      if (onSubmit) {
        onSubmit(firstName, email);
      }
      
      // In a real implementation, you would send this data to your API
      // For demo purposes, simulate a successful submission
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess(true);
      setFirstName('');
      setEmail('');
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-[#20bc74] to-[#2bcd82] py-12">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
          {title}
        </h2>
        <p className="text-white mb-6 max-w-3xl mx-auto">
          {description}
        </p>
        
        {success ? (
          <div className="max-w-xl mx-auto bg-white rounded-lg p-8 shadow-lg">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#2bcd82] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Thank You!</h3>
              <p className="text-gray-600 mb-4">
                Your copy of "100 Practices for Speech Sheets" is on its way to your inbox! 
              </p>
              <div className="bg-gray-50 p-4 rounded-lg mb-4 text-left">
                <h4 className="font-medium text-gray-800 mb-2">What to expect next:</h4>
                <ul className="text-gray-600 space-y-2">
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-[#2bcd82] mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Check your email inbox (and spam folder) for your download link</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-[#2bcd82] mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Your 25-page PDF includes 100 practical speech exercises ready to use</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-[#2bcd82] mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Feel free to explore our other resources while you wait!</span>
                  </li>
                </ul>
              </div>
              <button 
                onClick={() => setSuccess(false)} 
                className="text-[#2bcd82] hover:text-[#25b975] transition-colors font-medium"
              >
                Request another copy
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row max-w-2xl mx-auto gap-3 justify-center">
            <input
              type="text"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="px-4 py-3 rounded-md flex-grow bg-white shadow-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-white"
              required
            />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-4 py-3 rounded-md flex-grow bg-white shadow-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-white"
              required
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#f0fdf4] hover:bg-white text-gray-700 font-medium px-6 py-3 rounded-md transition-colors shadow-sm"
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </div>
              ) : buttonText}
            </button>
          </form>
        )}
        
        {error && (
          <div className="text-red-800 bg-red-100 max-w-md mx-auto mt-3 p-2 rounded">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadCapture; 