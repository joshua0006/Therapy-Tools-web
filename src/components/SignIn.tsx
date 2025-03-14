import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { LockKeyhole, Mail, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SignIn: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageReady, setPageReady] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, login, testLogin, loading: authLoading } = useAuth();
  
  // Wait for auth to be checked before showing content
  useEffect(() => {
    if (!authLoading) {
      setPageReady(true);
    }
  }, [authLoading]);
  
  // Always redirect to home page after login
  useEffect(() => {
    if (isLoggedIn) {
      navigate('/');
    }
  }, [isLoggedIn, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      // Will redirect to home page via the useEffect above
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleTestSignIn = async () => {
    setLoading(true);
    
    try {
      await testLogin();
      // Will redirect to home page via the useEffect above
    } catch (err) {
      setError('Error with test sign in');
    } finally {
      setLoading(false);
    }
  };

  // Show loading spinner while auth is being checked
  if (!pageReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-t-transparent border-[#2bcd82] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto my-12 px-4 sm:px-6 md:px-8 py-8 bg-white rounded-xl shadow-lg">
      <h2 className="text-3xl font-bold text-center mb-6">Log In</h2>
      
      {location.state?.message && (
        <div className="bg-blue-50 text-blue-800 p-3 rounded-md mb-6 text-center text-sm">
          {location.state.message}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email Address
          </label>
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#2bcd82] focus:border-[#2bcd82]"
              placeholder="you@example.com"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <LockKeyhole className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#2bcd82] focus:border-[#2bcd82]"
              placeholder="••••••••"
            />
          </div>
        </div>

        <div className="flex flex-col space-y-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#2bcd82] hover:bg-[#25b975] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2bcd82] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
            Sign In
          </button>
          
          <button
            type="button"
            onClick={handleTestSignIn}
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            Instant Test Sign In
          </button>
        </div>
      </form>

      <div className="mt-8 text-center">
        <Link to="/signup" className="text-sm text-[#2bcd82] hover:text-[#25b975] font-medium transition-colors duration-200">
          Don't have an account? Sign up
        </Link>
      </div>
    </div>
  );
};

export default SignIn; 