import { useState } from 'react';
import { apiService } from '../services/api.service';
import { useAppStore } from '../store/appStore';

/**
 * LoginScreen Component
 * Simple authentication using phone number
 * 
 * Features:
 * - Large, touch-friendly input field
 * - Clear error messages
 * - Loading state during authentication
 */

export const LoginScreen = () => {
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const setPuller = useAppStore((state) => state.setPuller);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!phone || phone.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Authenticate with backend
      const puller = await apiService.loginPuller(phone);
      
      // Store puller info in global state
      setPuller(puller);
      
      console.log('Login successful:', puller);
    } catch (err: any) {
      console.error('Login failed:', err);
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">AERAS</h1>
          <p className="text-2xl text-gray-400">Puller App</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="phone" className="block text-xl text-white mb-3">
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
              className="w-full px-6 py-5 text-2xl bg-gray-900 text-white border-2 border-gray-700 rounded-lg focus:outline-none focus:border-primary"
              disabled={isLoading}
              autoFocus
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-danger bg-opacity-20 border-2 border-danger rounded-lg p-4">
              <p className="text-xl text-danger text-center">{error}</p>
            </div>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-6 text-2xl font-bold text-white bg-primary rounded-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Help Text */}
        <p className="text-center text-lg text-gray-500 mt-8">
          Enter your registered phone number to continue
        </p>
      </div>
    </div>
  );
};
