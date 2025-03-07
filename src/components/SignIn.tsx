import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LockKeyhole, Mail, User, Loader2, ZapIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SignIn: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isLoggedIn, login, register, testLogin } = useAuth();

  // Redirect if already logged in
  React.useEffect(() => {
    if (isLoggedIn) {
      navigate('/');
    }
  }, [isLoggedIn, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Login logic
        await login(email, password);
      } else {
        // Registration logic
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }
        if (!name.trim()) {
          throw new Error('Name is required');
        }
        // Register the new user
        await register(email, password, name);
      }
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Add instant test login function
  const handleTestSignIn = async () => {
    setLoading(true);
    try {
      // Use the testLogin function that bypasses authentication
      await testLogin();
      navigate('/');
    } catch (err) {
      setError('Test login failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-xl shadow-lg">
      <h2 className="text-3xl font-bold text-center mb-8">
        {isLogin ? 'Log In' : 'Create Account'}
      </h2>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {!isLogin && (
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="name"
                name="name"
                type="text"
                required={!isLogin}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#2bcd82] focus:border-[#2bcd82]"
                placeholder="Your full name"
              />
            </div>
          </div>
        )}

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
          {!isLogin && (
            <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters</p>
          )}
        </div>

        <div className="mt-6 flex flex-col space-y-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#2bcd82] hover:bg-[#25b975] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2bcd82] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
          
          <button
            type="button"
            onClick={handleTestSignIn}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            Instant Test Sign In
          </button>
        </div>
      </form>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => setIsLogin(!isLogin)}
          className="text-sm text-[#2bcd82] hover:text-[#25b975] font-medium focus:outline-none"
        >
          {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
};

export default SignIn; 