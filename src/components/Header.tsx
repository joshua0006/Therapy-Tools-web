import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, CreditCard, LogIn, User, Menu, X, Bell, ShoppingCart, Bookmark, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SpeechLogo from '../assets/images/logo.png';

const Header: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
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
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-3 flex justify-between items-center">
          <Link to="/" className="flex items-center">
            <img 
              src={SpeechLogo} 
              alt="SPEECH" 
              className="h-6 w-30 sm:h-7 md:h-8 lg:h-8 lg:w-60 xl:w-full xl:h-10" 
              style={{ 
                objectFit: 'contain',
                maxWidth: '100%',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
              }}
            />
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-2 lg:space-x-4 xl:space-x-6">
            <Link to="/catalog" className="text-gray-700 hover:text-[#2bcd82] font-medium transition-colors flex items-center text-xs sm:text-sm lg:text-base">
              <ShoppingBag className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-1 lg:mr-2" /> Catalogs
            </Link>
            <Link to="/resource-finder" className="text-gray-700 hover:text-[#2bcd82] font-medium transition-colors flex items-center text-xs sm:text-sm lg:text-base">
              <Search className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-1 lg:mr-2" /> Resource Finder
            </Link>
            <Link to="/plans" className="text-gray-700 hover:text-[#2bcd82] font-medium transition-colors flex items-center text-xs sm:text-sm lg:text-base">
              <CreditCard className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-1 lg:mr-2" /> Membership
            </Link>
            <Link to="/events-news" className="text-gray-700 hover:text-[#2bcd82] font-medium transition-colors flex items-center text-xs sm:text-sm lg:text-base">
              <Bell className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-1 lg:mr-2" /> Events & News
            </Link>
            
            {isLoggedIn && (
              <>
                <Link to="/bookmarks" className="text-gray-700 hover:text-[#2bcd82] font-medium transition-colors flex items-center text-xs sm:text-sm lg:text-base">
                  <Bookmark className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-1 lg:mr-2" /> My Bookmarks
                </Link>
              </>
            )}
            
            {isLoggedIn ? (
              <div className="relative">
                <button 
                  className="flex items-center text-gray-700 hover:text-[#2bcd82] transition-colors p-1 sm:p-2 rounded-full hover:bg-gray-100"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  aria-expanded={userDropdownOpen}
                >
                  <User className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                    <Link 
                      to="/settings" 
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setUserDropdownOpen(false)}
                    >
                      Account Settings
                    </Link>
                    <button 
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => {
                        handleLogout();
                        setUserDropdownOpen(false);
                      }}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center">
                <Link 
                  to="/signin" 
                  className="bg-[#2bcd82] hover:bg-[#25b975] text-white px-2 py-1 sm:px-3 sm:py-1.5 lg:px-4 lg:py-2 rounded-full font-medium transition-colors flex items-center text-xs sm:text-sm lg:text-base"
                >
                  <LogIn className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-1 lg:mr-2" /> Sign In
                </Link>
              </div>
            )}
          </nav>
          
          {/* Mobile Menu Button */}
          <button 
            className="md:hidden flex items-center text-gray-700 hover:text-[#2bcd82] transition-colors" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>
        </div>
        
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white shadow-lg py-4 absolute w-full z-50">
            <nav className="flex flex-col space-y-4 px-4">
              <Link 
                to="/catalog" 
                className="text-gray-700 hover:text-[#2bcd82] font-medium transition-colors flex items-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                <ShoppingBag className="w-5 h-5 mr-2" /> Catalogs
              </Link>
              <Link 
                to="/resource-finder" 
                className="text-gray-700 hover:text-[#2bcd82] font-medium transition-colors flex items-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Search className="w-5 h-5 mr-2" /> Resource Finder
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
                    to="/bookmarks" 
                    className="text-gray-700 hover:text-[#2bcd82] font-medium transition-colors flex items-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Bookmark className="w-5 h-5 mr-2" /> My Bookmarks
                  </Link>
                </>
              )}
              
              {isLoggedIn ? (
                <>
                  <Link 
                    to="/settings"
                    className="text-gray-700 hover:text-[#2bcd82] font-medium transition-colors flex items-center text-left"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User className="w-5 h-5 mr-2" /> Account Settings
                  </Link>
                  <button 
                    className="text-gray-700 hover:text-[#2bcd82] font-medium transition-colors flex items-center text-left w-full"
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                  >
                    <LogIn className="w-5 h-5 mr-2 transform rotate-180" /> Logout
                  </button>
                </>
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