import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, MapPin, Facebook, Instagram, Youtube } from 'lucide-react';
import Logo from '../assets/images/cicle-logo.png';
import { useAuth } from '../context/AuthContext';

const Footer: React.FC = () => {
  const { isLoggedIn } = useAuth();

  return (
    <footer className="bg-gray-800 text-white">
      {/* Newsletter Section */}
      <div className="bg-[#2bcd82] py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-6 md:mb-0 md:w-1/2">
              <h3 className="text-2xl font-bold text-white mb-2">Join Our Newsletter</h3>
              <p className="text-white/80">Get the latest resources, speech therapy tips, and exclusive offers</p>
            </div>
            <div className="w-full md:w-1/2 md:pl-6">
              <form className="flex flex-col sm:flex-row gap-2">
                <input 
                  type="email" 
                  placeholder="Your email address" 
                  className="px-4 py-3 rounded-lg flex-grow bg-white text-black focus:outline-none focus:ring-2 focus:ring-white" 
                  required
                />
                <button 
                  type="submit" 
                  className="bg-[#fb6a69] hover:bg-[#e05958] text-white font-medium px-6 py-3 rounded-lg transition-colors"
                >
                  Subscribe
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
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
            
            <div>
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
            
            <div>
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
              <Link to="/privacy" className="text-gray-400 hover:text-[#2bcd82] text-sm transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="text-gray-400 hover:text-[#2bcd82] text-sm transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 