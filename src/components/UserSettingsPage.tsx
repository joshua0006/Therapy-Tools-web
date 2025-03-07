import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ShippingAddress} from '../context/AuthContext';
import { Eye, EyeOff, AlertCircle, CheckCircle, Save, Plus, MapPin, Edit, Trash } from 'lucide-react';
import Header from './Header';
import Footer from './Footer';
import { toast } from 'react-hot-toast';

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

const UserSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoggedIn, loading, getShippingInfo, saveShippingInfo } = useAuth();
  
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
  const [activeTab, setActiveTab] = useState<'profile' | 'address' | 'shipping' | 'password'>('profile');
  
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
      <div className="border-b border-gray-200 mb-8">
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
            onClick={() => setActiveTab('shipping')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'shipping' 
                ? 'border-[#2bcd82] text-[#2bcd82]' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Shipping Addresses
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
              <div 
                key={index}
                className={`border p-4 rounded-md relative ${
                  selectedShippingAddress === index ? 'border-[#2bcd82] bg-green-50' : 'border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium">{address.firstName} {address.lastName}</div>
                  {address.isDefault && (
                    <span className="text-xs bg-[#2bcd82] text-white px-2 py-1 rounded-full">Default</span>
                  )}
                </div>
                
                {address.company && <div className="text-gray-600 text-sm">{address.company}</div>}
                <div className="text-gray-600 text-sm">
                  {address.streetAddress}
                  {address.apartment && `, ${address.apartment}`}
                </div>
                <div className="text-gray-600 text-sm">
                  {address.city}{address.city && address.state ? ', ' : ''}{address.state} {address.postcode}
                </div>
                <div className="text-gray-600 text-sm">{address.country}</div>
                <div className="text-gray-600 text-sm mt-1">
                  {address.phoneCountryCode} {address.phone}
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEditAddress(index)}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    <Edit className="h-3 w-3 mr-1" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteAddress(index)}
                    className="text-sm text-red-600 hover:text-red-800 flex items-center"
                  >
                    <Trash className="h-3 w-3 mr-1" /> Delete
                  </button>
                </div>
              </div>
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
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2bcd82]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveShippingAddress}
                disabled={submitting}
                className="px-4 py-2 bg-[#2bcd82] hover:bg-[#25b975] text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2bcd82] disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Address
                  </>
                )}
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
  
  return (
    <>
      <Header />
      
      <main className="container mx-auto py-12 px-4 max-w-6xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Account Settings</h1>
        
        {renderTabs()}
        
        {activeTab === 'profile' && renderProfileTab()}
        {activeTab === 'shipping' && renderShippingTab()}
        {activeTab === 'password' && renderPasswordTab()}
      </main>
      
      <Footer />
    </>
  );
};

export default UserSettingsPage; 