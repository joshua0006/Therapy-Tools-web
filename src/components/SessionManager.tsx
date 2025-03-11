import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * SessionManager component
 * 
 * This component provides a subtle visual indicator when a user's session is being restored
 * after a page refresh. It shows a small indicator in the corner of the screen
 * that disappears after the session is fully restored.
 */
const SessionManager: React.FC = () => {
  const { loading, sessionRestored, isLoggedIn } = useAuth();
  const [showIndicator, setShowIndicator] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Check if we should show the session restoration indicator
    const hasStoredSession = localStorage.getItem('userLoggedIn') === 'true';
    
    if (loading && hasStoredSession) {
      setShowIndicator(true);
    } else if (sessionRestored && isLoggedIn) {
      // Start fade out animation
      setFadeOut(true);
      
      // Remove indicator after animation completes
      const timer = setTimeout(() => {
        setShowIndicator(false);
      }, 1000); // Match this with the CSS transition duration
      
      return () => clearTimeout(timer);
    }
  }, [loading, sessionRestored, isLoggedIn]);

  if (!showIndicator) return null;

  return (
    <div 
      className={`fixed bottom-4 right-4 bg-[#2bcd82] bg-opacity-80 text-white px-3 py-1 rounded-md shadow-md z-50 flex items-center transition-opacity duration-1000 ${fadeOut ? 'opacity-0' : 'opacity-80'}`}
      style={{ fontSize: '0.75rem' }}
    >
      {!sessionRestored ? (
        <>
          <div className="w-3 h-3 border-2 border-t-transparent border-white rounded-full animate-spin mr-1"></div>
          <span>Restoring</span>
        </>
      ) : (
        <>
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Restored</span>
        </>
      )}
    </div>
  );
};

export default SessionManager; 