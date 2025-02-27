import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Plus, Minus, ShoppingCart } from 'lucide-react';
import { useCart, CartItem } from '../context/CartContext';
import Button from './Button';

interface CartProps {
  className?: string;
}

const Cart: React.FC<CartProps> = ({ className }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const cartRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
  // Use try-catch to handle potential errors when accessing context
  let cartItems: CartItem[] = [];
  let removeFromCart: (id: number) => void = () => {};
  let updateQuantity: (id: number, quantity: number) => void = () => {};
  let clearCart: () => void = () => {};
  let getTotalItems: () => number = () => 0;
  let isCartOpen: boolean = false;
  let setIsCartOpen: (isOpen: boolean) => void = () => {};
  
  try {
    const cart = useCart();
    cartItems = cart.cartItems;
    removeFromCart = cart.removeFromCart;
    updateQuantity = cart.updateQuantity;
    clearCart = cart.clearCart;
    getTotalItems = cart.getTotalItems;
    isCartOpen = cart.isCartOpen;
    setIsCartOpen = cart.setIsCartOpen;
  } catch (error) {
    console.error("Failed to load cart:", error);
  }
  
  // Use effect to mark component as loaded after initial render
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // Handle click outside to close cart
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cartRef.current && !cartRef.current.contains(event.target as Node)) {
        closeCart();
      }
    };

    if (isCartOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCartOpen]);

  // Handle animation when cart opens/closes
  useEffect(() => {
    if (isLoaded) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 500); // Increased duration for smoother animation
      
      return () => clearTimeout(timer);
    }
  }, [isCartOpen, isLoaded]);

  const closeCart = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setIsCartOpen(false);
      setIsAnimating(false);
    }, 500); // Increased duration for smoother animation
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      // Extract numeric price value from string (e.g., "$19.99" -> 19.99)
      const price = parseFloat(item.price.replace('$', ''));
      return total + price * item.quantity;
    }, 0).toFixed(2);
  };

  const handleCheckout = () => {
    closeCart();
    navigate('/checkout');
  };

  return (
    <>
      {/* Floating Cart Button */}
      {isLoaded && !isCartOpen && (
        <button 
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-6 right-6 bg-[#fb6a69] text-white rounded-full p-4 shadow-lg z-40 transition-all duration-300 hover:scale-110 w-14 h-14 flex items-center justify-center"
          aria-label="Open cart"
        >
          <ShoppingCart className="w-6 h-6" />
          {getTotalItems() > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#2bcd82] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center border-2 border-white">
              {getTotalItems()}
            </span>
          )}
        </button>
      )}
      
      {/* Overlay */}
      {(isCartOpen || isAnimating) && (
        <div 
          className={`fixed inset-0 bg-black transition-opacity duration-500 ease-in-out z-40 ${
            isCartOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'
          }`}
          onClick={closeCart}
        />
      )}
      
      {/* Cart panel */}
      {(isCartOpen || isAnimating) && (
        <div 
          ref={cartRef}
          className={`fixed right-0 bottom-0 h-full w-full md:w-96 bg-white shadow-xl z-50 flex flex-col transition-transform duration-500 ease-in-out ${
            isCartOpen ? 'translate-y-0' : 'translate-y-full'
          } ${className}`}
        >
          <div className="flex justify-between items-center p-4 border-b">
            <h2 className="text-xl font-bold flex items-center">
              <ShoppingCart className="w-5 h-5 mr-2" />
              Your Cart ({getTotalItems()} items)
            </h2>
            <button 
              onClick={closeCart}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex-1 overflow-auto p-4">
            {cartItems.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Your cart is empty</p>
                <button 
                  className="mt-4 text-[#2bcd82] hover:underline transition-colors"
                  onClick={() => {
                    closeCart();
                    navigate('/catalog');
                  }}
                >
                  Continue shopping
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <CartItemRow 
                    key={item.id} 
                    item={item} 
                    updateQuantity={updateQuantity}
                    removeFromCart={removeFromCart}
                  />
                ))}
              </div>
            )}
          </div>
          
          {cartItems.length > 0 && (
            <div className="border-t p-4 bg-gray-50">
              <div className="flex justify-between mb-4">
                <span className="font-medium">Subtotal:</span>
                <span className="font-bold text-lg">${calculateTotal()}</span>
              </div>
              
              <div className="space-y-2">
                <Button 
                  variant="primary" 
                  size="large" 
                  className="w-full"
                  onClick={handleCheckout}
                >
                  Proceed to Checkout
                </Button>
                
                <button 
                  className="text-gray-500 hover:text-gray-700 text-sm w-full text-center transition-colors"
                  onClick={clearCart}
                >
                  Clear Cart
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

interface CartItemRowProps {
  item: CartItem;
  updateQuantity: (id: number, quantity: number) => void;
  removeFromCart: (id: number) => void;
}

const CartItemRow: React.FC<CartItemRowProps> = ({ item, updateQuantity, removeFromCart }) => {
  return (
    <div className="flex border-b pb-4">
      <div className="w-20 h-20 rounded overflow-hidden">
        <img 
          src={item.imageUrl} 
          alt={item.title} 
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="ml-4 flex-1">
        <div className="flex justify-between">
          <h3 className="font-medium text-gray-800">{item.title}</h3>
          <button 
            onClick={() => removeFromCart(item.id)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <p className="text-gray-500 text-sm mb-2">{item.category}</p>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center border rounded-md">
            <button 
              className="px-2 py-1 text-gray-500 hover:bg-gray-100 transition-colors"
              onClick={() => updateQuantity(item.id, item.quantity - 1)}
            >
              <Minus className="w-4 h-4" />
            </button>
            
            <span className="px-2 py-1 min-w-[2rem] text-center">
              {item.quantity}
            </span>
            
            <button 
              className="px-2 py-1 text-gray-500 hover:bg-gray-100 transition-colors"
              onClick={() => updateQuantity(item.id, item.quantity + 1)}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <span className="font-bold text-[#fb6a69]">{item.price}</span>
        </div>
      </div>
    </div>
  );
};

export default Cart; 