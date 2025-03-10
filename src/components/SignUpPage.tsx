import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Add countries and regions data at the top of the file
// Countries data
const countries = [
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'AU', label: 'Australia' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'NZ', label: 'New Zealand' }
];

// Regions data by country
const regions: Record<string, Array<{ value: string; label: string }>> = {
  'US': [
    { value: 'AL', label: 'Alabama' },
    { value: 'AK', label: 'Alaska' },
    { value: 'AZ', label: 'Arizona' },
    { value: 'AR', label: 'Arkansas' },
    { value: 'CA', label: 'California' },
    { value: 'CO', label: 'Colorado' },
    // Add more US states as needed
  ],
  'CA': [
    { value: 'AB', label: 'Alberta' },
    { value: 'BC', label: 'British Columbia' },
    { value: 'MB', label: 'Manitoba' },
    { value: 'NB', label: 'New Brunswick' },
    { value: 'NL', label: 'Newfoundland and Labrador' },
    { value: 'NS', label: 'Nova Scotia' },
    // Add more Canadian provinces as needed
  ],
  'AU': [
    { value: 'ACT', label: 'Australian Capital Territory' },
    { value: 'NSW', label: 'New South Wales' },
    { value: 'NT', label: 'Northern Territory' },
    { value: 'QLD', label: 'Queensland' },
    { value: 'SA', label: 'South Australia' },
    { value: 'TAS', label: 'Tasmania' },
    { value: 'VIC', label: 'Victoria' },
    { value: 'WA', label: 'Western Australia' }
  ],
  'GB': [
    { value: 'ENG', label: 'England' },
    { value: 'NIR', label: 'Northern Ireland' },
    { value: 'SCT', label: 'Scotland' },
    { value: 'WLS', label: 'Wales' }
  ]
};

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  phoneCountryCode: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  phone?: string;
}

const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { register, isLoggedIn, loading } = useAuth();
  
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    phoneCountryCode: '+61',
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  
  // Extract any redirect information from location state
  const redirectUrl = location.state?.redirectUrl || '/dashboard';
  const redirectMessage = location.state?.message;
  
  // Redirect if already logged in
  useEffect(() => {
    if (isLoggedIn) {
      navigate(redirectUrl);
    }
  }, [isLoggedIn, navigate, redirectUrl]);
  
  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error for this field when user types
    if (errors[name as keyof FormErrors]) {
      setErrors({
        ...errors,
        [name]: undefined
      });
    }
    
    // Check password strength
    if (name === 'password') {
      calculatePasswordStrength(value);
    }
  };
  
  // Calculate password strength (0-3)
  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    
    setPasswordStrength(strength);
  };
  
  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    // Required fields
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    
    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    // Confirm password
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    // Phone validation (optional but validate format if provided)
    if (formData.phone && !/^\+?[0-9\s\-()]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number format';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      setSubmitting(true);
      try {
        // Register the user
        await register(formData.email, formData.password, `${formData.firstName} ${formData.lastName}`, undefined);
        
        // Navigate to the redirect URL instead of always going to the dashboard
        navigate(redirectUrl);
      } catch (error) {
        console.error('Registration error:', error);
        setErrors({
          ...errors,
          email: 'Registration failed. This email might already be in use.'
        });
      } finally {
        setSubmitting(false);
      }
    }
  };
  
  // Render password strength indicator
  const renderPasswordStrength = () => {
    if (!formData.password) return null;
    
    const getLabel = () => {
      if (passwordStrength === 0) return 'Very weak';
      if (passwordStrength === 1) return 'Weak';
      if (passwordStrength === 2) return 'Medium';
      if (passwordStrength === 3) return 'Strong';
      return 'Very strong';
    };
    
    const getColor = () => {
      if (passwordStrength <= 1) return 'bg-red-500';
      if (passwordStrength === 2) return 'bg-yellow-500';
      return 'bg-green-500';
    };
    
    return (
      <div className="mt-1">
        <div className="flex items-center gap-1">
          {[...Array(4)].map((_, i) => (
            <div 
              key={i} 
              className={`h-1 w-full rounded-full ${i < passwordStrength ? getColor() : 'bg-gray-200'}`}
            ></div>
          ))}
        </div>
        <span className="text-xs text-gray-500 mt-1">{getLabel()}</span>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-xl shadow-lg">
        <h2 className="text-3xl font-bold text-center mb-4">Create Account</h2>
        
        {/* Show redirect message if any */}
        {redirectMessage && (
          <div className="bg-blue-50 text-blue-800 p-3 rounded-md mb-6 text-center text-sm">
            {redirectMessage}
          </div>
        )}
        
        <p className="text-center text-gray-600 mb-6">Enter your information below to create your account.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information Section */}
          <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Personal Information</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-[#2bcd82] focus:border-[#2bcd82] ${errors.firstName ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.firstName && <p className="mt-1 text-red-500 text-sm">{errors.firstName}</p>}
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-[#2bcd82] focus:border-[#2bcd82] ${errors.lastName ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.lastName && <p className="mt-1 text-red-500 text-sm">{errors.lastName}</p>}
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-[#2bcd82] focus:border-[#2bcd82] ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.email && <p className="mt-1 text-red-500 text-sm">{errors.email}</p>}
              </div>
            </div>
          </div>

          {/* Account Security Section */}
          <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Account Security</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-[#2bcd82] focus:border-[#2bcd82] ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {renderPasswordStrength()}
                {errors.password && <p className="mt-1 text-red-500 text-sm">{errors.password}</p>}
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-[#2bcd82] focus:border-[#2bcd82] ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                  >
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {errors.confirmPassword && <p className="mt-1 text-red-500 text-sm">{errors.confirmPassword}</p>}
              </div>
            </div>
          </div>

          {/* Form ends after password section */}
          <div className="flex justify-end mt-8">
            <button
              type="button"
              onClick={() => navigate('/signin')}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2bcd82] mr-4"
            >
              Back to Login
            </button>
            <button
              type="submit"
              className="bg-[#2bcd82] py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-[#25b975] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2bcd82]"
            >
              Create Account
            </button>
          </div>
        </form>

        <p className="mt-4 text-center text-gray-600">
          Already have an account? <Link to="/signin" className="text-[#2bcd82] hover:underline">Sign in here</Link>
        </p>
      </div>
    </div>
  );
};

export default SignUpPage; 