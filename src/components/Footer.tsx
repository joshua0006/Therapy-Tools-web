import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, MapPin, Facebook, Instagram, Youtube, Tag } from 'lucide-react';
import Logo from '../assets/images/cicle-logo.png';
import { useAuth } from '../context/AuthContext';
import { useCategories } from '../context/CategoriesContext';
import LeadCapture from './LeadCapture';

const Footer: React.FC = () => {
  const { isLoggedIn } = useAuth();
  const { categories, loading } = useCategories();
  
  // Get top categories (limit to 6 for display)
  const topCategories = categories
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, 6);

  return (
    <footer className="bg-gray-800 text-white">
      {/* Lead Capture Section */}
      <LeadCapture 
        onSubmit={(name, email) => {
          // In a real app, you would submit this data to your backend
          console.log('Lead capture form submitted:', { name, email });
        }}
      />

      {/* Main Footer */}
      <div className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-1">
              <div className="flex items-center mb-4">
                <img src={Logo} alt="Adventures in Speech" className="h-10 w-10 mr-2" />
                <h3 className="text-xl font-bold">
                  <span className="text-[#2bcd82]">Adventures</span> in <span className="text-[#fb6a69]">Speech</span>
                </h3>
              </div>
              <p className="text-gray-300 mb-6">
                Premium resources for speech language pathologists to enhance their practice and improve client outcomes.
              </p>
              <div className="flex space-x-4">
                <a href="https://www.facebook.com/adventuresinspeechpathology/" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-[#2bcd82] transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="https://www.instagram.com/adventuresinspeechpathology/?hl=en" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-[#2bcd82] transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="https://www.youtube.com/@AdventuresinSpeechPathology" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-[#2bcd82] transition-colors">
                  <Youtube className="w-5 h-5" />
                </a>
              </div>
            </div>
            
            <div className="md:col-span-1">
              <h4 className="text-lg font-bold mb-5 text-white">Quick Links</h4>
              <ul className="space-y-3">
                <li><Link to="/" className="text-gray-300 hover:text-[#2bcd82] transition-colors">Home</Link></li>
                <li><Link to="/catalog" className="text-gray-300 hover:text-[#2bcd82] transition-colors">Resources</Link></li>
                <li><Link to="/plans" className="text-gray-300 hover:text-[#2bcd82] transition-colors">Membership</Link></li>
                {!isLoggedIn && (
                  <li><Link to="/signin" className="text-gray-300 hover:text-[#2bcd82] transition-colors">Login</Link></li>
                )}
              </ul>
            </div>
            
            <div className="md:col-span-1">
              <h4 className="text-lg font-bold mb-5 text-white flex items-center">
                <Tag className="w-4 h-4 mr-2 text-[#2bcd82]" />
                Categories
              </h4>
              {loading ? (
                <p className="text-gray-400 text-sm">Loading categories...</p>
              ) : (
                <ul className="space-y-3">
                  {topCategories.map(category => (
                    <li key={category.id}>
                      <Link 
                        to={`/catalog?category=${encodeURIComponent(category.name)}`} 
                        className="text-gray-300 hover:text-[#2bcd82] transition-colors flex items-center"
                      >
                        <span>{category.name}</span>
                        {category.count && category.count > 0 && (
                          <span className="ml-2 text-xs bg-[#2bcd82]/20 text-[#2bcd82] px-1.5 py-0.5 rounded-full">
                            {category.count}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link 
                      to="/catalog" 
                      className="text-[#2bcd82] hover:text-[#25b975] transition-colors text-sm font-medium"
                    >
                      View All Categories →
                    </Link>
                  </li>
                </ul>
              )}
            </div>
            
            <div className="md:col-span-1">
              <h4 className="text-lg font-bold mb-5 text-white">Contact Us</h4>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <Mail className="w-5 h-5 mr-3 text-[#2bcd82]" />
                  <a href="mailto:support@adventuresinspeechpathology.com" className="text-gray-300 hover:text-[#2bcd82] transition-colors">support@adventuresinspeechpathology.com</a>
                </li>
              
                <li className="flex items-start">
                  <MapPin className="w-5 h-5 mr-3 text-[#2bcd82] mt-1" />
                  <span className="text-gray-300">2/17 Arnott St, <br /> Edgeworth NSW 2285 <br /> Australia</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      {/* Copyright */}
      <div className="border-t border-gray-700 py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm mb-4 md:mb-0">
              &copy; {new Date().getFullYear()} Adventures in Speech. All rights reserved.
            </p>
            <div className="flex space-x-6">
              <Link to="/privacy-policy" className="text-gray-400 hover:text-[#2bcd82] text-sm transition-colors">Privacy Policy</Link>
              <Link to="/terms-of-use" className="text-gray-400 hover:text-[#2bcd82] text-sm transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 