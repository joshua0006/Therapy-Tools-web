import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, MapPin, Facebook, Instagram, Youtube, Tag, Home, BookOpen, CreditCard, LogIn, ArrowRight, Send } from 'lucide-react';
import SpeechLogo from '../assets/images/logo.png';
import { useAuth } from '../context/AuthContext';
import { useCategories } from '../context/CategoriesContext';


const Footer: React.FC = () => {
  const { isLoggedIn } = useAuth();
  const { categories, loading } = useCategories();
  const [leadCaptureSubmitted, setLeadCaptureSubmitted] = useState(false);
  
  // Get top categories (limit to 6 for display)
  const topCategories = categories
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, 6);

  // Handle the lead capture form submission
  const handleLeadCaptureSubmit = async (name: string, email: string) => {
    try {
      console.log('Lead capture form submitted:', { name, email });
      
      // Track the event for analytics
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'lead_capture', {
          'event_category': 'engagement',
          'event_label': '100 Speech Practices Download',
          'value': 1
        });
      }
      
      // For demo, simulate a successful submission
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mark as submitted for any conditional UI changes needed
      setLeadCaptureSubmitted(true);
      
      return true; // Return success for the LeadCapture component
    } catch (error) {
      console.error('Error submitting lead capture form:', error);
      return false; // Return failure for the LeadCapture component
    }
  };

  return (
    <footer className="bg-white text-gray-800 border-t border-gray-200 relative">
      {/* Decorative Wave */}
      <div className="absolute top-0 left-0 right-0 transform -translate-y-99% overflow-hidden z-10 pointer-events-none hidden md:block">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 48" className="w-full h-12 text-white">
          <path 
            fill="currentColor" 
            fillOpacity="1" 
            d="M0,32L80,37.3C160,43,320,53,480,42.7C640,32,800,0,960,0C1120,0,1280,32,1360,48L1440,64L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"
          ></path>
        </svg>
      </div>
     
      {/* Main Footer */}
      <div className="py-12 md:py-16 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {/* Company Info Column - Full width on extra small, half width on small */}
            <div className="col-span-2 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center mb-6">
                <img 
                  src={SpeechLogo} 
                  alt="Adventures in Speech" 
                  className="h-12 rounded-lg" 
                />
               
              </div>
              <p className="text-gray-600 text-sm sm:text-base mb-6 leading-relaxed">
                Premium resources for speech language pathologists to enhance their practice and improve client outcomes.
              </p>
              <div className="flex space-x-4 mb-8">
                <a href="https://www.facebook.com/adventuresinspeechpathology/" target="_blank" rel="noopener noreferrer" 
                   className="text-gray-400 hover:text-[#1877F2] transition-all duration-300 transform hover:-translate-y-1 bg-white p-2 rounded-full">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="https://www.instagram.com/adventuresinspeechpathology/?hl=en" target="_blank" rel="noopener noreferrer" 
                   className="text-gray-400 hover:text-[#E4405F] transition-all duration-300 transform hover:-translate-y-1 bg-white p-2 rounded-full">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="https://www.youtube.com/@AdventuresinSpeechPathology" target="_blank" rel="noopener noreferrer" 
                   className="text-gray-400 hover:text-[#FF0000] transition-all duration-300 transform hover:-translate-y-1 bg-white p-2 rounded-full">
                  <Youtube className="w-5 h-5" />
                </a>
              </div>
            </div>
            
            {/* Quick Links Column */}
            <div className="col-span-1">
              <div className="bg-white p-5 rounded-lg h-full">
                <h4 className="text-base sm:text-lg font-bold mb-4 sm:mb-5 text-gray-900 border-b pb-2 border-gray-100">Quick Links</h4>
                <ul className="space-y-3 sm:space-y-4 text-sm sm:text-base">
                  <li>
                    <Link to="/" className="text-gray-600 hover:text-[#2bcd82] transition-colors flex items-center group">
                      <Home className="w-4 h-4 mr-2 text-gray-400 group-hover:text-[#2bcd82] transition-colors" />
                      <span>Home</span>
                      <ArrowRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </li>
                  <li>
                    <Link to="/catalog" className="text-gray-600 hover:text-[#2bcd82] transition-colors flex items-center group">
                      <BookOpen className="w-4 h-4 mr-2 text-gray-400 group-hover:text-[#2bcd82] transition-colors" />
                      <span>Resources</span>
                      <ArrowRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </li>
                  <li>
                    <Link to="/plans" className="text-gray-600 hover:text-[#2bcd82] transition-colors flex items-center group">
                      <CreditCard className="w-4 h-4 mr-2 text-gray-400 group-hover:text-[#2bcd82] transition-colors" />
                      <span>Membership</span>
                      <ArrowRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </li>
                  {!isLoggedIn && (
                    <li>
                      <Link to="/signin" className="text-gray-600 hover:text-[#2bcd82] transition-colors flex items-center group">
                        <LogIn className="w-4 h-4 mr-2 text-gray-400 group-hover:text-[#2bcd82] transition-colors" />
                        <span>Login</span>
                        <ArrowRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </li>
                  )}
                </ul>
              </div>
            </div>
            
            {/* Categories Column */}
            <div className="col-span-1">
              <div className="bg-white p-5 rounded-lg h-full">
                <h4 className="text-base sm:text-lg font-bold mb-4 sm:mb-5 text-gray-900 border-b pb-2 border-gray-100 flex items-center">
                  <Tag className="w-4 h-4 mr-2 text-[#2bcd82]" />
                  Categories
                </h4>
                {loading ? (
                  <p className="text-gray-500 text-sm">Loading categories...</p>
                ) : (
                  <ul className="space-y-3 sm:space-y-3">
                    {topCategories.map(category => (
                      <li key={category.id}>
                        <Link 
                          to={`/catalog?category=${encodeURIComponent(category.name)}`} 
                          className="text-gray-600 hover:text-[#2bcd82] transition-colors flex items-center text-sm sm:text-base group"
                        >
                          <span className="truncate mr-1 relative pl-2 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-1 before:bg-gray-300 before:rounded-full group-hover:before:bg-[#2bcd82] before:transition-colors">
                            {category.name}
                          </span>
                          {category.count && category.count > 0 && (
                            <span className="ml-auto text-xs bg-gradient-to-r from-[#2bcd82]/10 to-[#2bcd82]/20 text-[#2bcd82] px-2 py-0.5 rounded-full flex-shrink-0 font-medium">
                              {category.count}
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                    <li>
                      <Link 
                        to="/catalog" 
                        className="text-[#2bcd82] hover:text-[#25b975] transition-colors text-sm font-medium mt-3 flex items-center"
                      >
                        View All Categories 
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Link>
                    </li>
                  </ul>
                )}
              </div>
            </div>
            
            {/* Contact Column - Full width on small screens, normal on larger */}
            <div className="col-span-2 sm:col-span-2 lg:col-span-1">
              <div className="bg-white p-5 rounded-lg h-full">
                <h4 className="text-base sm:text-lg font-bold mb-4 sm:mb-5 text-gray-900 border-b pb-2 border-gray-100">Contact Us</h4>
                <ul className="space-y-4 text-sm sm:text-base">
                  <li className="flex items-center">
                    <div className="bg-[#2bcd82]/10 p-2 rounded-full mr-3 flex-shrink-0">
                      <Mail className="w-5 h-5 text-[#2bcd82]" />
                    </div>
                    <div>

                      <a href="mailto:support@adventuresinspeechpathology.com" 
                         className="text-gray-600 hover:text-[#2bcd82] transition-colors truncate font-medium">
                        support@adventuresinspeechpathology.com
                      </a>
                    </div>
                  </li>
                
                  <li className="flex items-start">
                    <div className="bg-[#2bcd82]/10 p-2 rounded-full mr-3 flex-shrink-0 mt-1">
                      <MapPin className="w-5 h-5 text-[#2bcd82]" />
                    </div>
                    <div>
                      
                      <address className="text-gray-600 not-italic font-medium">
                        2/17 Arnott St, <br /> 
                        Edgeworth NSW 2285 <br /> 
                        Australia
                      </address>
                    </div>
                  </li>

            
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Copyright */}
      <div className="border-t border-gray-200 py-6 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <p className="text-gray-500 text-xs sm:text-sm mb-4 sm:mb-0 text-center sm:text-left">
              &copy; {new Date().getFullYear()} Adventures in Speech. All rights reserved.
            </p>
            <div className="flex space-x-6">
              <Link to="/privacy-policy" className="text-gray-500 hover:text-[#2bcd82] text-xs sm:text-sm transition-colors relative after:absolute after:bottom-0 after:left-0 after:right-full after:h-px after:bg-[#2bcd82] hover:after:right-0 after:transition-all after:duration-300">
                Privacy Policy
              </Link>
              <Link to="/terms-of-use" className="text-gray-500 hover:text-[#2bcd82] text-xs sm:text-sm transition-colors relative after:absolute after:bottom-0 after:left-0 after:right-full after:h-px after:bg-[#2bcd82] hover:after:right-0 after:transition-all after:duration-300">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 