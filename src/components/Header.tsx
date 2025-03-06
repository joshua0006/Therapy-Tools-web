import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, CreditCard, LogIn, User, Menu, X, Bell, BookOpen, ShoppingCart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Logo from '../assets/images/cicle-logo.png';

const Header: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };
  
  return (
    <>
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link to="/" className="flex items-center">
            <img src={Logo} alt="Adventures in Speech" className="h-10 w-10 mr-2" />
            <div className="hidden sm:block">
              <h1 className="text-2xl md:text-3xl font-bold">
                <span className="text-[#2bcd82]">Adventures</span> <span className="text-gray-800">in</span> <span className="text-[#fb6a69]">Speech</span>
              </h1>
            </div>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/catalog" className="text-gray-700 hover:text-[#2bcd82] font-medium transition-colors flex items-center">
              <ShoppingBag className="w-5 h-5 mr-2" /> Catalogs
            </Link>
            <Link to="/plans" className="text-gray-700 hover:text-[#2bcd82] font-medium transition-colors flex items-center">
              <CreditCard className="w-5 h-5 mr-2" /> Membership
            </Link>
            <Link to="/events-news" className="text-gray-700 hover:text-[#2bcd82] font-medium transition-colors flex items-center">
              <Bell className="w-5 h-5 mr-2" /> Events & News
            </Link>
            
            {isLoggedIn && (
              <>
                <Link to="/monthly-articles" className="text-gray-700 hover:text-[#2bcd82] font-medium transition-colors flex items-center">
                  <BookOpen className="w-5 h-5 mr-2" /> Monthly Articles
                </Link>
                <Link to="/purchases" className="text-gray-700 hover:text-[#2bcd82] font-medium transition-colors flex items-center">
                  <ShoppingCart className="w-5 h-5 mr-2" /> My Purchases
                </Link>
              </>
            )}
            
            {isLoggedIn ? (
              <button 
                className="bg-[#fb6a69] hover:bg-[#e05958] text-white px-5 py-2 rounded-full font-medium transition-colors flex items-center"
                onClick={handleLogout}
              >
                <User className="w-5 h-5 mr-2" /> Log Out
              </button>
            ) : (
              <div className="flex items-center space-x-4">
                <Link 
                  to="/signin" 
                  className="bg-[#2bcd82] hover:bg-[#25b975] text-white px-5 py-2 rounded-full font-medium transition-colors flex items-center"
                >
                  <LogIn className="w-5 h-5 mr-2" /> Sign In
                </Link>
              </div>
            )}
          </nav>
          
          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button 
              className="text-gray-700"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white shadow-lg py-4 absolute w-full">
            <nav className="flex flex-col space-y-4 px-4">
              <Link 
                to="/catalog" 
                className="text-gray-700 hover:text-[#2bcd82] font-medium transition-colors flex items-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                <ShoppingBag className="w-5 h-5 mr-2" /> Catalogs
              </Link>
              <Link 
                to="/plans" 
                className="text-gray-700 hover:text-[#2bcd82] font-medium transition-colors flex items-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                <CreditCard className="w-5 h-5 mr-2" /> Membership
              </Link>
              <Link 
                to="/events-news" 
                className="text-gray-700 hover:text-[#2bcd82] font-medium transition-colors flex items-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Bell className="w-5 h-5 mr-2" /> Events & News
              </Link>
              
              {isLoggedIn && (
                <>
                  <Link 
                    to="/monthly-articles" 
                    className="text-gray-700 hover:text-[#2bcd82] font-medium transition-colors flex items-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <BookOpen className="w-5 h-5 mr-2" /> Monthly Articles
                  </Link>
                  <Link 
                    to="/purchases" 
                    className="text-gray-700 hover:text-[#2bcd82] font-medium transition-colors flex items-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" /> My Purchases
                  </Link>
                </>
              )}
              
              {isLoggedIn ? (
                <button 
                  className="text-gray-700 hover:text-[#2bcd82] font-medium transition-colors flex items-center text-left"
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                >
                  <User className="w-5 h-5 mr-2" /> Log Out
                </button>
              ) : (
                <Link 
                  to="/signin"
                  className="text-gray-700 hover:text-[#2bcd82] font-medium transition-colors flex items-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <LogIn className="w-5 h-5 mr-2" /> Sign In
                </Link>
              )}
            </nav>
          </div>
        )}
      </header>
    </>
  );
};

export default Header; 