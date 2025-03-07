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
    <div className="bg-[#2bcd82] py-10">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
          {title}
        </h2>
        <p className="text-white mb-6 max-w-3xl mx-auto">
          {description}
        </p>
        
        {success ? (
          <div className="max-w-md mx-auto bg-white bg-opacity-20 rounded-lg p-6">
            <div className="text-white font-medium">
              <div className="mb-2">
                <svg className="h-12 w-12 text-white mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Thank you! Your download is on its way to your inbox.
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row max-w-2xl mx-auto gap-2 justify-center">
            <input
              type="text"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="px-4 py-3 rounded-md flex-grow bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-white"
              required
            />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-4 py-3 rounded-md flex-grow bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-white"
              required
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#f0fdf4] text-gray-700 hover:bg-white font-medium px-6 py-3 rounded-md transition-colors"
            >
              {isSubmitting ? 'Submitting...' : buttonText}
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