import React from 'react';
import { Check, Pencil, Trash2, MapPin } from 'lucide-react';
import { ShippingAddress } from '../context/AuthContext';

interface ShippingAddressCardProps {
  address: ShippingAddress;
  isSelected?: boolean;
  isSelectable?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onSetDefault?: () => void;
}

const ShippingAddressCard: React.FC<ShippingAddressCardProps> = ({
  address,
  isSelected = false,
  isSelectable = false,
  onSelect,
  onEdit,
  onDelete,
  onSetDefault
}) => {
  return (
    <div 
      className={`border rounded-lg p-4 relative transition-all ${
        isSelected 
          ? 'border-[#2bcd82] bg-[#f0fdf4]' 
          : 'border-gray-200 hover:border-gray-300 bg-white'
      } ${isSelectable ? 'cursor-pointer' : ''}`}
      onClick={isSelectable ? onSelect : undefined}
    >
      {/* Default Badge */}
      {address.isDefault && (
        <div className="absolute -top-2 -right-2 bg-[#2bcd82] text-white text-xs px-2 py-1 rounded-full flex items-center">
          <Check className="w-3 h-3 mr-1" />
          Default
        </div>
      )}
      
      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-3 left-3 w-5 h-5 bg-[#2bcd82] rounded-full flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}
      
      <div className={`${isSelected ? 'pl-5' : ''}`}>
        {/* Name and Info */}
        <div className="flex items-start mb-2">
          <MapPin className="w-4 h-4 text-gray-500 mt-1 mr-2 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-medium text-gray-800">
              {address.firstName} {address.lastName}
            </h3>
            {address.company && (
              <p className="text-sm text-gray-600">{address.company}</p>
            )}
          </div>
        </div>
        
        {/* Address Details */}
        <div className="ml-6 text-sm text-gray-600 space-y-1">
          <p>{address.streetAddress}</p>
          {address.apartment && <p>{address.apartment}</p>}
          <p>
            {address.city}, {address.state} {address.postcode}
          </p>
          <p>{address.country}</p>
          <p className="pt-1">{address.phoneCountryCode} {address.phone}</p>
        </div>
      </div>
      
      {/* Actions */}
      {(onEdit || onDelete || onSetDefault) && (
        <div className="flex mt-4 pt-3 border-t border-gray-100 gap-2">
          {onEdit && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="text-xs flex items-center text-gray-600 hover:text-blue-600 py-1 px-2 rounded bg-gray-50 hover:bg-gray-100"
            >
              <Pencil className="w-3 h-3 mr-1" />
              Edit
            </button>
          )}
          
          {onDelete && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-xs flex items-center text-gray-600 hover:text-red-600 py-1 px-2 rounded bg-gray-50 hover:bg-gray-100"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Remove
            </button>
          )}
          
          {onSetDefault && !address.isDefault && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onSetDefault();
              }}
              className="text-xs flex items-center text-gray-600 hover:text-green-600 py-1 px-2 rounded bg-gray-50 hover:bg-gray-100 ml-auto"
            >
              <Check className="w-3 h-3 mr-1" />
              Set as Default
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ShippingAddressCard; 