import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ShippingAddress } from '../context/AuthContext';
import ShippingAddressCard from './ShippingAddressCard';
import { MapPin, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface UserProfileShippingInfoProps {
  onAddNewClick?: () => void;
  compact?: boolean;
}

const UserProfileShippingInfo: React.FC<UserProfileShippingInfoProps> = ({ 
  onAddNewClick,
  compact = false
}) => {
  const { user, getShippingInfo } = useAuth();
  const navigate = useNavigate();
  const [shippingAddresses, setShippingAddresses] = useState<ShippingAddress[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  useEffect(() => {
    loadShippingAddresses();
  }, [user]);
  
  const loadShippingAddresses = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const addresses = await getShippingInfo();
      setShippingAddresses(addresses);
    } catch (error) {
      console.error('Error loading shipping addresses', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleEditAddress = (address: ShippingAddress) => {
    navigate('/account/settings', { state: { activeTab: 'shipping', editAddress: address } });
  };
  
  const handleSetAsDefault = async (address: ShippingAddress) => {
    try {
      if (!user) return;
      
      // Update the address with isDefault flag
      const { saveShippingInfo } = useAuth();
      await saveShippingInfo({
        ...address,
        updatedAt: new Date()
      }, true);
      
      // Refresh the shipping addresses
      await loadShippingAddresses();
      
      // Show success message
      toast.success('Default shipping address updated successfully');
    } catch (error) {
      console.error('Error setting default address:', error);
      toast.error('Failed to update default address');
    }
  };

  const getDefaultAddress = () => {
    return shippingAddresses.find(addr => addr.isDefault) || 
      (shippingAddresses.length > 0 ? shippingAddresses[0] : null);
  };

  const defaultAddress = getDefaultAddress();
  
  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg animate-pulse">
        <div className="h-4 bg-gray-200 rounded-md w-1/3 mb-3"></div>
        <div className="h-4 bg-gray-200 rounded-md w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded-md w-2/3 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded-md w-1/3"></div>
      </div>
    );
  }
  
  if (compact) {
    // Compact mode shows just the default address or a message to add one
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-md font-medium text-gray-800">Shipping Address</h3>
          {defaultAddress && (
            <button
              onClick={() => navigate('/account/settings', { state: { activeTab: 'shipping' } })}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Manage
            </button>
          )}
        </div>
        
        {defaultAddress ? (
          <div className="text-sm">
            <div className="font-medium">{defaultAddress.firstName} {defaultAddress.lastName}</div>
            <div className="text-gray-600">{defaultAddress.streetAddress}</div>
            {defaultAddress.apartment && <div className="text-gray-600">{defaultAddress.apartment}</div>}
            <div className="text-gray-600">
              {defaultAddress.city}, {defaultAddress.state} {defaultAddress.postcode}
            </div>
            <div className="text-gray-600">{defaultAddress.country}</div>
          </div>
        ) : (
          <div
            onClick={onAddNewClick || (() => navigate('/account/settings', { state: { activeTab: 'shipping' } }))}
            className="flex items-center justify-center p-4 border border-dashed border-gray-300 rounded-md bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
          >
            <div className="text-center">
              <MapPin className="mx-auto h-6 w-6 text-gray-400 mb-1" />
              <p className="text-sm font-medium text-gray-900">Add shipping address</p>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  // Full mode shows all addresses with management options
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-800">Your Shipping Addresses</h3>
        
        <button
          onClick={onAddNewClick || (() => navigate('/account/settings', { state: { activeTab: 'shipping' } }))}
          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#2bcd82] hover:bg-[#25b975] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2bcd82]"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add New
        </button>
      </div>
      
      {shippingAddresses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {shippingAddresses.map((address, index) => (
            <ShippingAddressCard
              key={index}
              address={address}
              onEdit={() => handleEditAddress(address)}
              onSetDefault={() => handleSetAsDefault(address)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 px-4 border border-dashed border-gray-300 rounded-md">
          <MapPin className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No shipping addresses</h3>
          <p className="mt-1 text-sm text-gray-500">
            Add a shipping address to make checkout faster.
          </p>
        </div>
      )}
    </div>
  );
};

export default UserProfileShippingInfo; 