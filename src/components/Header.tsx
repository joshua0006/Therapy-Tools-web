import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, CreditCard, LogIn, User, Menu, X, ShoppingCart, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import Logo from '../assets/images/cicle-logo.png';
import Cart from './Cart';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const { isLoggedIn, login, logout } = useAuth();
  const navigate = useNavigate();
  
  // Get cart info with error handling
  let cartItemCount = 0;
  let setIsCartOpen: (isOpen: boolean) => void = () => {};
  
  try {
    const cart = useCart();
    cartItemCount = cart.getTotalItems();
    setIsCartOpen = cart.setIsCartOpen;
  } catch (error) {
    console.error("Failed to load cart in header:", error);
  }
  
  // Use effect to mark component as loaded after initial render
  useEffect(() => {
    setIsLoaded(true);
  }, []);
  
  return (
    <>
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link to="/" className="flex items-center">
            <img src={Logo} alt="Adventures in Speech Pathology" className="h-10 w-10 mr-2" />
            <div className="hidden sm:block">
              <h1 className="text-2xl md:text-3xl font-bold">
                <span className="text-[#2bcd82]">Adventures</span> <span className="text-gray-800">in</span> <span className="text-[#fb6a69]">Speech</span>
              </h1>
            </div>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/catalog" className="text-gray-700 hover:text-[#2bcd82] font-medium transition-colors flex items-center">
              <ShoppingBag className="w-5 h-5 mr-2" /> Resources
            </Link>
            <Link to="/plans" className="text-gray-700 hover:text-[#2bcd82] font-medium transition-colors flex items-center">
              <CreditCard className="w-5 h-5 mr-2" /> Membership
            </Link>
            
            {isLoggedIn && (
              <Link to="/dashboard" className="text-gray-700 hover:text-[#2bcd82] font-medium transition-colors flex items-center">
                <FileText className="w-5 h-5 mr-2" /> My Library
              </Link>
            )}
            
            {/* Cart Button */}
            {isLoaded && (
              <button 
                className="text-gray-700 hover:text-[#2bcd82] font-medium transition-colors flex items-center relative"
                onClick={() => setIsCartOpen(true)}
              >
                <ShoppingCart className="w-5 h-5 mr-2" /> Cart
                {cartItemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#fb6a69] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cartItemCount}
                  </span>
                )}
              </button>
            )}
            
            {isLoggedIn ? (
              <button 
                className="bg-[#fb6a69] hover:bg-[#e05958] text-white px-5 py-2 rounded-full font-medium transition-colors flex items-center"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
              >
                <User className="w-5 h-5 mr-2" /> Log Out
              </button>
            ) : (
              <button 
                className="bg-[#2bcd82] hover:bg-[#25b975] text-white px-5 py-2 rounded-full font-medium transition-colors flex items-center"
                onClick={() => {
                  login();
                  navigate('/');
                }}
              >
                <LogIn className="w-5 h-5 mr-2" /> Log In
              </button>
            )}
          </nav>
          
          {/* Mobile Menu Button and Cart Button */}
          <div className="md:hidden flex items-center">
            {/* Mobile Cart Button */}
            {isLoaded && (
              <button 
                className="text-gray-700 hover:text-[#2bcd82] font-medium transition-colors mr-4 relative"
                onClick={() => setIsCartOpen(true)}
              >
                <ShoppingCart className="w-5 h-5" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#fb6a69] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cartItemCount}
                  </span>
                )}
              </button>
            )}
            
            <button 
              className="text-gray-700"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white shadow-lg py-4 absolute w-full">
            <nav className="flex flex-col space-y-4 px-4">
              <Link 
                to="/catalog" 
                className="text-gray-700 hover:text-[#2bcd82] font-medium transition-colors flex items-center"
                onClick={() => setIsMenuOpen(false)}
              >
                <ShoppingBag className="w-5 h-5 mr-2" /> Resources
              </Link>
              <Link 
                to="/plans" 
                className="text-gray-700 hover:text-[#2bcd82] font-medium transition-colors flex items-center"
                onClick={() => setIsMenuOpen(false)}
              >
                <CreditCard className="w-5 h-5 mr-2" /> Membership
              </Link>
              
              {isLoggedIn && (
                <Link 
                  to="/dashboard" 
                  className="text-gray-700 hover:text-[#2bcd82] font-medium transition-colors flex items-center"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <FileText className="w-5 h-5 mr-2" /> My Library
                </Link>
              )}
              
              {isLoggedIn ? (
                <button 
                  className="text-gray-700 hover:text-[#2bcd82] font-medium transition-colors flex items-center text-left"
                  onClick={() => {
                    logout();
                    setIsMenuOpen(false);
                    navigate('/');
                  }}
                >
                  <User className="w-5 h-5 mr-2" /> Log Out
                </button>
              ) : (
                <button 
                  className="text-gray-700 hover:text-[#2bcd82] font-medium transition-colors flex items-center text-left"
                  onClick={() => {
                    login();
                    setIsMenuOpen(false);
                    navigate('/');
                  }}
                >
                  <LogIn className="w-5 h-5 mr-2" /> Log In
                </button>
              )}
            </nav>
          </div>
        )}
      </header>
      
      {/* Cart Drawer */}
      <Cart />
    </>
  );
};

export default Header; 