import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, ShippingAddress} from '../context/AuthContext';
import { Eye, EyeOff, AlertCircle, CheckCircle, Save, Plus, MapPin, Edit, Trash } from 'lucide-react';
import Header from './Header';
import Footer from './Footer';
import { toast } from 'react-hot-toast';
import ShippingAddressCard from './ShippingAddressCard';
import { updateUserMembership } from '../lib/firebase/auth';

// Countries for dropdown
const countries = [
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'AU', label: 'Australia' },
  { value: 'UK', label: 'United Kingdom' },
  { value: 'NZ', label: 'New Zealand' },
];

// States/provinces for US and Canada
const regions = {
  US: [
    { value: 'AL', label: 'Alabama' },
    { value: 'AK', label: 'Alaska' },
    { value: 'AZ', label: 'Arizona' },
    { value: 'CA', label: 'California' },
    { value: 'CO', label: 'Colorado' },
    { value: 'NY', label: 'New York' },
    { value: 'TX', label: 'Texas' },
    // Add more states as needed
  ],
  CA: [
    { value: 'AB', label: 'Alberta' },
    { value: 'BC', label: 'British Columbia' },
    { value: 'ON', label: 'Ontario' },
    { value: 'QC', label: 'Quebec' },
    // Add more provinces as needed
  ],
  // Add regions for other countries if needed
};

interface UserSettingsFormData {
  firstName: string;
  lastName: string;
  email: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  phone: string;
  phoneCountryCode: string;
  street: string;
  apartment: string;
  company: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

// Define MembershipFormData interface
interface MembershipFormData {
  status: string;
  plan: string;
  billingCycle: 'monthly' | 'yearly';
  joinDate: string;
  expiryDate: string;
  totalPurchases: number;
  renewalCount: number;
  totalSpend: number;
}

const UserSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    user, 
    isLoggedIn, 
    loading, 
    getShippingInfo, 
    saveShippingInfo,
    isSubscriptionActive,
    getSubscriptionRemainingDays 
  } = useAuth();
  
  const [formData, setFormData] = useState<UserSettingsFormData>({
    firstName: '',
    lastName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    phone: '',
    phoneCountryCode: '+1',
    street: '',
    apartment: '',
    company: '',
    city: '',
    state: '',
    zip: '',
    country: 'US'
  });
  
  const [shippingAddresses, setShippingAddresses] = useState<ShippingAddress[]>([]);
  const [selectedShippingAddress, setSelectedShippingAddress] = useState<number | null>(null);
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'address' | 'shipping' | 'password' | 'subscription'>('profile');
  
  // Add state for editing membership info
  const [isEditingMembership, setIsEditingMembership] = useState(false);
  const [membershipFormData, setMembershipFormData] = useState<MembershipFormData>({
    status: 'inactive',
    plan: 'none',
    billingCycle: 'monthly',
    joinDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date().toISOString().split('T')[0],
    totalPurchases: 0,
    renewalCount: 0,
    totalSpend: 0
  });
  
  useEffect(() => {
    if (!loading && !isLoggedIn) {
      navigate('/signin');
    }
  }, [isLoggedIn, loading, navigate]);
  
  useEffect(() => {
    if (isLoggedIn && user) {
      loadShippingAddresses();
    }
  }, [isLoggedIn, user]);
  
  // Add useEffect to check URL for tab parameter
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    
    if (tabParam === 'subscription') {
      setActiveTab('subscription');
    }
  }, [location]);
  
  // Add useEffect to initialize membership form data
  useEffect(() => {
    if (user?.membershipInfo) {
      const membershipInfo = user.membershipInfo;
      setMembershipFormData({
        status: user.subscription?.status || 'inactive',
        plan: user.subscription?.plan || 'none',
        billingCycle: user.subscription?.billingCycle || 'monthly',
        joinDate: membershipInfo.joinDate ? new Date(membershipInfo.joinDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        expiryDate: membershipInfo.expiryDate ? new Date(membershipInfo.expiryDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        totalPurchases: membershipInfo.totalPurchases || 0,
        renewalCount: membershipInfo.renewalCount || 0,
        totalSpend: membershipInfo.totalSpend || 0
      });
    }
  }, [user]);
  
  const loadShippingAddresses = async () => {
    try {
      const addresses = await getShippingInfo();
      setShippingAddresses(addresses);
      
      const defaultIndex = addresses.findIndex(addr => addr.isDefault);
      if (defaultIndex >= 0) {
        setSelectedShippingAddress(defaultIndex);
      }
    } catch (error) {
      console.error('Error loading shipping addresses:', error);
      toast.error('Failed to load shipping addresses');
    }
  };
  
  const handleAddNewAddress = () => {
    setIsAddingNewAddress(true);
    setIsEditingAddress(false);
    setSelectedShippingAddress(null);
    
    setFormData(prev => ({
      ...prev,
      street: '',
      apartment: '',
      company: '',
      city: '',
      state: '',
      zip: '',
      country: 'US',
      phone: '',
      phoneCountryCode: '+1'
    }));
  };
  
  const handleEditAddress = (index: number) => {
    if (index >= 0 && index < shippingAddresses.length) {
      const address = shippingAddresses[index];
      setIsEditingAddress(true);
      setIsAddingNewAddress(false);
      setSelectedShippingAddress(index);
      
      setFormData(prev => ({
        ...prev,
        firstName: address.firstName,
        lastName: address.lastName,
        company: address.company || '',
        street: address.streetAddress,
        apartment: address.apartment || '',
        city: address.city,
        state: address.state,
        zip: address.postcode,
        country: address.country,
        phone: address.phone,
        phoneCountryCode: address.phoneCountryCode
      }));
    }
  };
  
  const handleDeleteAddress = async (index: number) => {
    if (window.confirm('Are you sure you want to delete this address?')) {
      try {
        const updatedAddresses = [...shippingAddresses];
        updatedAddresses.splice(index, 1);
        
        if (selectedShippingAddress === index) {
          setSelectedShippingAddress(null);
          setIsEditingAddress(false);
        } else if (selectedShippingAddress !== null && selectedShippingAddress > index) {
          setSelectedShippingAddress(selectedShippingAddress - 1);
        }
        
        setShippingAddresses(updatedAddresses);
        toast.success('Address deleted successfully');
      } catch (error) {
        console.error('Error deleting address:', error);
        toast.error('Failed to delete address');
      }
    }
  };
  
  const handleSaveShippingAddress = async () => {
    const addressErrors: FormErrors = {};
    
    if (!formData.street.trim()) addressErrors.street = 'Street address is required';
    if (!formData.city.trim()) addressErrors.city = 'City is required';
    if (!formData.zip.trim()) addressErrors.zip = 'ZIP/Postal code is required';
    if (!formData.country) addressErrors.country = 'Country is required';
    
    if (Object.keys(addressErrors).length > 0) {
      setErrors(addressErrors);
      return;
    }
    
    try {
      setSubmitting(true);
      
      const shippingData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        company: formData.company,
        streetAddress: formData.street,
        apartment: formData.apartment,
        city: formData.city,
        state: formData.state,
        postcode: formData.zip,
        country: formData.country,
        phone: formData.phone,
        phoneCountryCode: formData.phoneCountryCode
      };
      
      const makeDefault = shippingAddresses.length === 0 || 
        (isEditingAddress && selectedShippingAddress !== null && 
         shippingAddresses[selectedShippingAddress]?.isDefault === true);
      
      await saveShippingInfo(shippingData, makeDefault);
      
      await loadShippingAddresses();
      
      setIsAddingNewAddress(false);
      setIsEditingAddress(false);
      
      toast.success('Shipping address saved successfully');
    } catch (error) {
      console.error('Error saving shipping address:', error);
      toast.error('Failed to save shipping address');
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value
    });
    
    if (errors[name as keyof FormErrors]) {
      setErrors({
        ...errors,
        [name]: undefined
      });
    }
    
    if (name === 'newPassword') {
      calculatePasswordStrength(value);
    }
  };
  
  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    
    setPasswordStrength(strength);
  };
  
  const renderPasswordStrength = () => {
    if (!formData.newPassword) return null;
    
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
  
  const renderTabs = () => {
    return (
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'profile' 
                ? 'border-[#2bcd82] text-[#2bcd82]' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Profile Information
          </button>
          
          <button
            onClick={() => setActiveTab('password')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'password' 
                ? 'border-[#2bcd82] text-[#2bcd82]' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Change Password
          </button>
          
          <button
            onClick={() => setActiveTab('subscription')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'subscription' 
                ? 'border-[#2bcd82] text-[#2bcd82]' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Manage Subscription
          </button>
        </nav>
      </div>
    );
  };
  
  const renderProfileTab = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="firstName" className="block text-gray-700 font-medium mb-2">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
              errors.firstName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-[#2bcd82] focus:border-[#2bcd82]'
            }`}
            required
          />
          {errors.firstName && (
            <p className="mt-1 text-red-500 text-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.firstName}
            </p>
          )}
        </div>
        
        <div>
          <label htmlFor="lastName" className="block text-gray-700 font-medium mb-2">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
              errors.lastName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-[#2bcd82] focus:border-[#2bcd82]'
            }`}
            required
          />
          {errors.lastName && (
            <p className="mt-1 text-red-500 text-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.lastName}
            </p>
          )}
        </div>
        
        <div>
          <label htmlFor="email" className="block text-gray-700 font-medium mb-2">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
              errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-[#2bcd82] focus:border-[#2bcd82]'
            }`}
            required
            disabled
          />
          {errors.email && (
            <p className="mt-1 text-red-500 text-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.email}
            </p>
          )}
          <p className="mt-1 text-sm text-gray-500">Email cannot be changed. Contact support if needed.</p>
        </div>
        
        <div>
          <label htmlFor="phone" className="block text-gray-700 font-medium mb-2">
            Phone Number <span className="text-gray-400">(Optional)</span>
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
              errors.phone ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-[#2bcd82] focus:border-[#2bcd82]'
            }`}
          />
          {errors.phone && (
            <p className="mt-1 text-red-500 text-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.phone}
            </p>
          )}
        </div>
      </div>
    );
  };
  
  const renderShippingTab = () => {
    return (
      <div>
        <div className="mb-6 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Your Shipping Addresses</h3>
          
          {!isAddingNewAddress && (
            <button
              type="button"
              onClick={handleAddNewAddress}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#2bcd82] hover:bg-[#25b975] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2bcd82]"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Address
            </button>
          )}
        </div>
        
        {!isAddingNewAddress && !isEditingAddress && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {shippingAddresses.map((address, index) => (
              <ShippingAddressCard
                key={index}
                address={address}
                onEdit={() => handleEditAddress(index)}
                onDelete={() => handleDeleteAddress(index)}
                onSetDefault={() => handleSetAsDefault(index)}
              />
            ))}
            
            {shippingAddresses.length === 0 && (
              <div className="col-span-2 text-center py-8 px-4 border border-dashed border-gray-300 rounded-md">
                <MapPin className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No shipping addresses</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Add a shipping address to make checkout faster.
                </p>
              </div>
            )}
          </div>
        )}
        
        {(isAddingNewAddress || isEditingAddress) && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {isAddingNewAddress ? 'Add New Shipping Address' : 'Edit Shipping Address'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div>
                <label htmlFor="firstName" className="block text-gray-700 font-medium mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2bcd82] focus:border-[#2bcd82] transition-colors"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="lastName" className="block text-gray-700 font-medium mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2bcd82] focus:border-[#2bcd82] transition-colors"
                  required
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label htmlFor="company" className="block text-gray-700 font-medium mb-2">
                Company (Optional)
              </label>
              <input
                type="text"
                id="company"
                name="company"
                value={formData.company}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2bcd82] focus:border-[#2bcd82] transition-colors"
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="street" className="block text-gray-700 font-medium mb-2">
                Street Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="street"
                name="street"
                value={formData.street}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2bcd82] transition-colors ${
                  errors.street ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-[#2bcd82]'
                }`}
                required
              />
              {errors.street && (
                <p className="mt-1 text-red-500 text-sm">{errors.street}</p>
              )}
            </div>
            
            <div className="mb-4">
              <label htmlFor="apartment" className="block text-gray-700 font-medium mb-2">
                Apartment, suite, etc. (Optional)
              </label>
              <input
                type="text"
                id="apartment"
                name="apartment"
                value={formData.apartment}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2bcd82] focus:border-[#2bcd82] transition-colors"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div>
                <label htmlFor="city" className="block text-gray-700 font-medium mb-2">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2bcd82] transition-colors ${
                    errors.city ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-[#2bcd82]'
                  }`}
                  required
                />
                {errors.city && (
                  <p className="mt-1 text-red-500 text-sm">{errors.city}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="zip" className="block text-gray-700 font-medium mb-2">
                  ZIP / Postal Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="zip"
                  name="zip"
                  value={formData.zip}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2bcd82] transition-colors ${
                    errors.zip ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-[#2bcd82]'
                  }`}
                  required
                />
                {errors.zip && (
                  <p className="mt-1 text-red-500 text-sm">{errors.zip}</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div>
                <label htmlFor="country" className="block text-gray-700 font-medium mb-2">
                  Country <span className="text-red-500">*</span>
                </label>
                <select
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2bcd82] transition-colors ${
                    errors.country ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-[#2bcd82]'
                  }`}
                  required
                >
                  <option value="">Select a country</option>
                  {countries.map(country => (
                    <option key={country.value} value={country.value}>
                      {country.label}
                    </option>
                  ))}
                </select>
                {errors.country && (
                  <p className="mt-1 text-red-500 text-sm">{errors.country}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="state" className="block text-gray-700 font-medium mb-2">
                  State / Province
                </label>
                <select
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2bcd82] focus:border-[#2bcd82] transition-colors"
                >
                  <option value="">Select a state/province</option>
                  {formData.country && regions[formData.country as keyof typeof regions] && 
                    regions[formData.country as keyof typeof regions].map(region => (
                      <option key={region.value} value={region.value}>
                        {region.label}
                      </option>
                    ))
                  }
                </select>
              </div>
            </div>
            
            <div className="mb-6">
              <label htmlFor="phone" className="block text-gray-700 font-medium mb-2">
                Phone Number
              </label>
              <div className="flex">
                <select
                  id="phoneCountryCode"
                  name="phoneCountryCode"
                  value={formData.phoneCountryCode}
                  onChange={handleChange}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-[#2bcd82] focus:border-[#2bcd82] transition-colors"
                >
                  <option value="+1">+1</option>
                  <option value="+44">+44</option>
                  <option value="+61">+61</option>
                  <option value="+64">+64</option>
                </select>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="flex-1 px-4 py-2 border border-gray-300 border-l-0 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-[#2bcd82] focus:border-[#2bcd82] transition-colors"
                  placeholder="Phone number"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setIsAddingNewAddress(false);
                  setIsEditingAddress(false);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveShippingAddress}
                disabled={submitting}
                className="px-4 py-2 bg-[#2bcd82] text-white rounded-md hover:bg-[#25b975] focus:outline-none focus:ring-2 focus:ring-[#2bcd82] focus:ring-offset-2 transition-colors"
              >
                {submitting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </span>
                ) : 'Save Address'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  const renderPasswordTab = () => {
    return (
      <div className="grid grid-cols-1 gap-6">
        <div>
          <label htmlFor="currentPassword" className="block text-gray-700 font-medium mb-2">
            Current Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showCurrentPassword ? 'text' : 'password'}
              id="currentPassword"
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                errors.currentPassword ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-[#2bcd82] focus:border-[#2bcd82]'
              }`}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
            >
              {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.currentPassword && (
            <p className="mt-1 text-red-500 text-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.currentPassword}
            </p>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="newPassword" className="block text-gray-700 font-medium mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                  errors.newPassword ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-[#2bcd82] focus:border-[#2bcd82]'
                }`}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {renderPasswordStrength()}
            {errors.newPassword && (
              <p className="mt-1 text-red-500 text-sm flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.newPassword}
              </p>
            )}
            <p className="mt-1 text-sm text-gray-500">Must be at least 8 characters with lowercase, uppercase, number, and special character</p>
          </div>
          
          <div>
            <label htmlFor="confirmPassword" className="block text-gray-700 font-medium mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                  errors.confirmPassword ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-[#2bcd82] focus:border-[#2bcd82]'
                }`}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-red-500 text-sm flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.confirmPassword}
              </p>
            )}
            {formData.confirmPassword && formData.confirmPassword === formData.newPassword && (
              <p className="mt-1 text-green-500 text-sm flex items-center">
                <CheckCircle className="w-4 h-4 mr-1" />
                Passwords match
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  const handleSetAsDefault = async (index: number) => {
    try {
      if (index >= 0 && index < shippingAddresses.length) {
        // Get the address to set as default
        const addressToUpdate = shippingAddresses[index];
        
        // Update the address with isDefault flag
        await saveShippingInfo({
          ...addressToUpdate,
          updatedAt: new Date()
        }, true);
        
        // Refresh the shipping addresses
        await loadShippingAddresses();
        
        // Show success message
        toast.success('Default shipping address updated successfully');
      }
    } catch (error) {
      console.error('Error setting default address:', error);
      toast.error('Failed to update default address');
    }
  };
  
  const handleCancelSubscription = async () => {
    try {
      setSubmitting(true);
      
      if (!user || !user.id) {
        throw new Error('User not found');
      }
      
      // Confirm the user wants to cancel
      if (!window.confirm('Are you sure you want to cancel your subscription? You will lose access to premium content when your current billing period ends.')) {
        setSubmitting(false);
        return;
      }
      
      // Get the current date for tracking
      const now = new Date();
      
      // Update subscription status in Firebase
      await updateUserMembership(user.id, {
        status: 'canceled',
        plan: user.subscription?.plan || 'none',
        endDate: user.subscription?.endDate || now.toISOString(),
        subscriptionToken: user.subscription?.token || null,
        billingCycle: user.subscription?.billingCycle || 'monthly',
      });
      
      // Show success message
      toast.success('Your subscription has been canceled. You will have access until the end of your billing period.');
      
      // Refresh user data
      await loadUserData();
    } catch (error) {
      console.error('Error canceling subscription:', error);
      toast.error('Failed to cancel subscription. Please try again or contact support.');
    } finally {
      setSubmitting(false);
    }
  };
  
  const loadUserData = async () => {
    // This is just to refresh user data from context
    // The actual data loading is handled in the AuthContext
    if (isLoggedIn && user) {
      // Any additional data loading can go here
    }
  };
  
  // Add membership form change handler
  const handleMembershipChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Convert number fields
    if (['totalPurchases', 'renewalCount', 'totalSpend'].includes(name)) {
      setMembershipFormData({
        ...membershipFormData,
        [name]: parseFloat(value) || 0
      });
    } else {
      setMembershipFormData({
        ...membershipFormData,
        [name]: value
      });
    }
  };
  
  // Add handler to save membership changes
  const handleSaveMembershipChanges = async () => {
    try {
      setSubmitting(true);
      
      if (!user || !user.id) {
        throw new Error('User not found');
      }
      
      // Format join and expiry dates
      const joinDate = new Date(membershipFormData.joinDate);
      const expiryDate = new Date(membershipFormData.expiryDate);
      
      // Update membership info in Firebase
      await updateUserMembership(user.id, {
        status: membershipFormData.status,
        plan: membershipFormData.plan,
        endDate: expiryDate.toISOString(),
        billingCycle: membershipFormData.billingCycle,
        membershipInfo: {
          joinDate: joinDate.toISOString(),
          status: membershipFormData.status,
          expiryDate: expiryDate.toISOString(),
          updatedAt: new Date().toISOString(),
          billingCycle: membershipFormData.billingCycle,
          totalPurchases: membershipFormData.totalPurchases,
          renewalCount: membershipFormData.renewalCount,
          totalSpend: membershipFormData.totalSpend
        }
      });
      
      // Show success message
      toast.success('Membership information updated successfully.');
      
      // Exit edit mode
      setIsEditingMembership(false);
      
      // Refresh user data
      await loadUserData();
    } catch (error) {
      console.error('Error updating membership information:', error);
      toast.error('Failed to update membership information. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  const renderSubscriptionTab = () => {
    // Get user's subscription info
    const subscriptionStatus = user?.subscription?.status || 'inactive';
    const subscriptionPlan = user?.subscription?.plan || 'none';
    const subscriptionEndDate = user?.subscription?.endDate 
      ? new Date(user.subscription.endDate).toLocaleDateString()
      : 'N/A';
    const billingCycle = user?.subscription?.billingCycle || 'monthly';
    const isActive = isSubscriptionActive();
    const daysRemaining = getSubscriptionRemainingDays();
    const stackedCount = user?.subscription?.stackedCount || 0;
    
    // Format price display with plan and billing cycle
    const getFormattedPlan = () => {
      if (!subscriptionPlan || subscriptionPlan === 'none') return 'No active plan';
      
      let planName = subscriptionPlan.charAt(0).toUpperCase() + subscriptionPlan.slice(1);
      return `${planName} (${billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1)})`;
    };

    // Get subscription history with stacking information
    const stackedSubscriptions = user?.subscriptionHistory?.filter(sub => sub.isStacked) || [];
    
    // Calculate total additional time from stacked subscriptions
    const calculateStackedDuration = () => {
      if (!stackedSubscriptions.length) return null;
      
      let baseDate = new Date();
      
      // Calculate what the end date would be without stacking (just one subscription)
      if (user?.subscription?.billingCycle === 'yearly') {
        baseDate.setFullYear(baseDate.getFullYear() + 1);
      } else {
        baseDate.setMonth(baseDate.getMonth() + 1);
      }
      
      // Calculate additional time from stacking
      if (user?.subscription?.endDate) {
        const actualEndDate = new Date(user.subscription.endDate);
        const extraDays = Math.round((actualEndDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (extraDays > 0) {
          const extraMonths = Math.floor(extraDays / 30);
          const remainingDays = extraDays % 30;
          
          if (extraMonths > 0) {
            return `${extraMonths} month${extraMonths !== 1 ? 's' : ''}${remainingDays > 0 ? ` and ${remainingDays} day${remainingDays !== 1 ? 's' : ''}` : ''}`;
          } else {
            return `${extraDays} day${extraDays !== 1 ? 's' : ''}`;
          }
        }
      }
      
      return null;
    };
    
    const stackedDuration = calculateStackedDuration();

    return (
      <div className="space-y-8 py-8">
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-800">Subscription Information</h3>
            
            {/* Add Edit button for admin users */}
            {user?.role === 'admin' && (
              <button
                onClick={() => setIsEditingMembership(!isEditingMembership)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
              >
                {isEditingMembership ? 'Cancel' : 'Edit Membership Info'}
              </button>
            )}
          </div>
          
          {isEditingMembership ? (
            /* Membership Edit Form */
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    name="status"
                    value={membershipFormData.status}
                    onChange={handleMembershipChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#2bcd82] focus:ring-[#2bcd82]"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="canceled">Canceled</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
                
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Plan</label>
                  <select
                    name="plan"
                    value={membershipFormData.plan}
                    onChange={handleMembershipChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#2bcd82] focus:ring-[#2bcd82]"
                  >
                    <option value="none">None</option>
                    <option value="premium">Premium</option>
                    <option value="basic">Basic</option>
                  </select>
                </div>
                
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Billing Cycle</label>
                  <select
                    name="billingCycle"
                    value={membershipFormData.billingCycle}
                    onChange={handleMembershipChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#2bcd82] focus:ring-[#2bcd82]"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Join Date</label>
                  <input
                    type="date"
                    name="joinDate"
                    value={membershipFormData.joinDate}
                    onChange={handleMembershipChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#2bcd82] focus:ring-[#2bcd82]"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Expiry Date</label>
                  <input
                    type="date"
                    name="expiryDate"
                    value={membershipFormData.expiryDate}
                    onChange={handleMembershipChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#2bcd82] focus:ring-[#2bcd82]"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Total Purchases</label>
                  <input
                    type="number"
                    name="totalPurchases"
                    value={membershipFormData.totalPurchases}
                    onChange={handleMembershipChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#2bcd82] focus:ring-[#2bcd82]"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Renewal Count</label>
                  <input
                    type="number"
                    name="renewalCount"
                    value={membershipFormData.renewalCount}
                    onChange={handleMembershipChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#2bcd82] focus:ring-[#2bcd82]"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Total Spend</label>
                  <input
                    type="number"
                    name="totalSpend"
                    value={membershipFormData.totalSpend}
                    onChange={handleMembershipChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#2bcd82] focus:ring-[#2bcd82]"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setIsEditingMembership(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveMembershipChanges}
                  disabled={submitting}
                  className="px-4 py-2 bg-[#2bcd82] text-white rounded-md hover:bg-[#25b975] focus:outline-none focus:ring-2 focus:ring-[#2bcd82] focus:ring-offset-2 transition-colors"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : isActive ? (
            // Active subscription view
            <div className="space-y-6">
              <div className="flex items-center">
                <div className="bg-green-100 rounded-full p-2 mr-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="font-medium text-green-600">Active</p>
                </div>
              </div>
              
              {stackedCount > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-2">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-0.5">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">Stacked Subscription</h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <p>
                          You've stacked {stackedCount} subscription{stackedCount !== 1 ? 's' : ''}, 
                          extending your membership until {subscriptionEndDate}.
                          {stackedDuration && (
                            <span className="block mt-1">
                              Your stacked subscriptions have added <span className="font-semibold">{stackedDuration}</span> of additional access time!
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Plan</p>
                  <p className="font-medium text-gray-800">{getFormattedPlan()}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Next Billing Date</p>
                  <p className="font-medium text-gray-800">{subscriptionEndDate}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Time Remaining</p>
                  <p className="font-medium text-gray-800">{daysRemaining} days</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Billing Cycle</p>
                  <p className="font-medium text-gray-800">
                    {billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1)}
                  </p>
                </div>
              </div>
              
              {stackedSubscriptions.length > 0 && (
                <div className="border-t border-gray-200 pt-4 mt-6">
                  <h4 className="font-medium text-gray-800 mb-3">Stacked Subscription History</h4>
                  <div className="overflow-hidden bg-white border border-gray-200 rounded-md">
                    <ul className="divide-y divide-gray-200">
                      {stackedSubscriptions.map((sub, index) => (
                        <li key={index} className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium text-gray-800">
                                {sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1)} Plan
                              </p>
                              <p className="text-sm text-gray-500">
                                Purchased on {new Date(sub.purchaseDate).toLocaleDateString()}
                              </p>
                              {sub.expiryDate && (
                                <p className="text-xs text-gray-500">
                                  Extended until {new Date(sub.expiryDate).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-800">
                                ${typeof sub.amount === 'number' ? sub.amount.toFixed(2) : '0.00'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {sub.billingCycle.charAt(0).toUpperCase() + sub.billingCycle.slice(1)}
                              </p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={handleCancelSubscription}
                  disabled={submitting}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : 'Cancel Subscription'}
                </button>
              </div>
            </div>
          ) : (
            // Inactive subscription view
            <div className="space-y-6">
              <div className="flex items-center">
                <div className="bg-gray-100 rounded-full p-2 mr-4">
                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="font-medium text-gray-600">
                    {subscriptionStatus === 'canceled' ? 'Canceled' : 'Inactive'}
                  </p>
                </div>
              </div>
              
              {subscriptionStatus === 'canceled' && user?.subscription?.endDate && (
                <div className="rounded-md bg-blue-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3 flex-1 md:flex md:justify-between">
                      <p className="text-sm text-blue-700">
                        Your subscription has been canceled but you'll have access until {subscriptionEndDate}.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {user?.membershipInfo && (
                <div className="border-t border-gray-200 pt-4 mt-6">
                  <h4 className="font-medium text-gray-800 mb-3">Membership Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Join Date</p>
                      <p className="font-medium">
                        {user.membershipInfo.joinDate ? new Date(user.membershipInfo.joinDate).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Total Purchases</p>
                      <p className="font-medium">{user.membershipInfo.totalPurchases || 0}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Renewal Count</p>
                      <p className="font-medium">{user.membershipInfo.renewalCount || 0}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Total Spend</p>
                      <p className="font-medium">
                        ${typeof user.membershipInfo.totalSpend === 'number' 
                          ? user.membershipInfo.totalSpend.toFixed(2) 
                          : '0.00'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => navigate('/plans')}
                  className="px-4 py-2 bg-[#2bcd82] text-white rounded-md hover:bg-[#25b975] focus:outline-none focus:ring-2 focus:ring-[#2bcd82] focus:ring-offset-2 transition-colors"
                >
                  View Subscription Plans
                </button>
              </div>
            </div>
          )}
        </div>
        
        {user?.subscriptionHistory && user.subscriptionHistory.length > 0 && (
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-6">Subscription History</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Billing Cycle</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {user.subscriptionHistory.slice().reverse().map((history, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(history.purchaseDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {history.plan.charAt(0).toUpperCase() + history.plan.slice(1)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {history.billingCycle.charAt(0).toUpperCase() + history.billingCycle.slice(1)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${typeof history.amount === 'number' ? history.amount.toFixed(2) : history.amount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-5xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="bg-white shadow-sm rounded-md overflow-hidden">
            <div className="px-4 py-5 sm:px-6">
              <h2 className="text-lg font-medium text-gray-900">Account Settings</h2>
              <p className="mt-1 text-sm text-gray-500">
                Update your account information and preferences
              </p>
            </div>
            
            {renderTabs()}
            
            <div className="px-4 py-5 sm:p-6">
              {activeTab === 'profile' && renderProfileTab()}
              {activeTab === 'password' && renderPasswordTab()}
              {activeTab === 'subscription' && renderSubscriptionTab()}
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default UserSettingsPage; 