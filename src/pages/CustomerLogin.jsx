import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChefHat, Phone, ArrowLeft, Eye, EyeOff, Send, Mail, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const CustomerLogin = () => {
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'mobile'
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [mobileData, setMobileData] = useState({
    countryCode: '+1',
    mobile: '',
    otp: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [errors, setErrors] = useState({});

  const navigate = useNavigate();
  const { login } = useAuth();
  const { addNotification } = useNotification();

  const countryCodes = [
    { code: '+1', country: 'US/CA', flag: '🇺🇸' },
    { code: '+44', country: 'UK', flag: '🇬🇧' },
    { code: '+91', country: 'India', flag: '🇮🇳' },
    { code: '+86', country: 'China', flag: '🇨🇳' },
    { code: '+81', country: 'Japan', flag: '🇯🇵' },
    { code: '+49', country: 'Germany', flag: '🇩🇪' },
    { code: '+33', country: 'France', flag: '🇫🇷' },
    { code: '+61', country: 'Australia', flag: '🇦🇺' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleMobileInputChange = (e) => {
    const { name, value } = e.target;
    setMobileData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSendOtp = async () => {
    if (!mobileData.mobile.trim()) {
      setErrors({ mobile: 'Please enter your mobile number' });
      return;
    }

    setIsSendingOtp(true);
    setErrors({});

    try {
      const fullMobile = `${mobileData.countryCode}${mobileData.mobile.replace(/^\+/, '')}`;
      
      const result = await fetch('http://localhost:5000/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: fullMobile })
      }).then(res => res.json());

      if (result.success) {
        setOtpSent(true);
        addNotification('OTP sent successfully to your mobile number', 'success');
      } else {
        setErrors({ mobile: result.message || 'Failed to send OTP' });
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      setErrors({ mobile: 'Network error. Please try again.' });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      setErrors({ 
        email: !formData.email ? 'Email is required' : '',
        password: !formData.password ? 'Password is required' : ''
      });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const result = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: formData.email,
          password: formData.password
        })
      }).then(res => res.json());

      if (result.success) {
        const user = result.data.user;
        login(user, user.role, result.data.token);
        addNotification('Login successful!', 'success');
        
        // Navigate based on role
        if (user.role === 'admin') {
          navigate('/admin');
        } else if (user.role === 'superadmin') {
          navigate('/super-admin');
        } else {
          navigate('/dashboard');
        }
      } else {
        setErrors({ password: 'Invalid email or password' });
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrors({ password: 'Network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpLogin = async (e) => {
    e.preventDefault();
    
    if (!mobileData.otp.trim()) {
      setErrors({ otp: 'Please enter the OTP' });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const fullMobile = `${mobileData.countryCode}${mobileData.mobile.replace(/^\+/, '')}`;
      
      const result = await fetch('http://localhost:5000/api/auth/verify-otp-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile: fullMobile,
          otp: mobileData.otp
        })
      }).then(res => res.json());

      if (result.success) {
        const user = result.data.user;
        login(user, user.role, result.data.token);
        addNotification('Login successful!', 'success');
        navigate('/dashboard');
      } else {
        setErrors({ otp: result.message || 'Invalid OTP' });
      }
    } catch (error) {
      console.error('OTP login error:', error);
      setErrors({ otp: 'Network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="relative z-10 bg-white/10 backdrop-blur-md border-b border-white/20">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Link to="/" className="flex items-center space-x-2">
              <ArrowLeft className="h-5 w-5 text-white" />
              <ChefHat className="h-8 w-8 text-orange-400" />
              <span className="text-2xl font-bold text-white">RestaurantAI</span>
            </Link>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
              <p className="text-gray-300">Sign in to your account</p>
            </div>

            {/* Login Method Selector */}
            <div className="flex bg-white/10 rounded-lg p-1 mb-8">
              <button
                onClick={() => {
                  setLoginMethod('email');
                  setErrors({});
                  setOtpSent(false);
                }}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center space-x-2 ${
                  loginMethod === 'email'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-white hover:text-gray-300'
                }`}
              >
                <Mail className="w-4 h-4" />
                <span>Email</span>
              </button>
              <button
                onClick={() => {
                  setLoginMethod('mobile');
                  setErrors({});
                  setOtpSent(false);
                }}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center space-x-2 ${
                  loginMethod === 'mobile'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-white hover:text-gray-300'
                }`}
              >
                <Phone className="w-4 h-4" />
                <span>Mobile OTP</span>
              </button>
            </div>

            {/* Email Login Form */}
            {loginMethod === 'email' && (
              <form onSubmit={handleEmailLogin} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 bg-white/10 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm ${
                      errors.email ? 'border-red-500' : 'border-white/20'
                    }`}
                    placeholder="Enter your email"
                    required
                  />
                  {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 bg-white/10 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm pr-12 ${
                        errors.password ? 'border-red-500' : 'border-white/20'
                      }`}
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-400 text-sm mt-1">{errors.password}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </button>
              </form>
            )}

            {/* Mobile OTP Login Form */}
            {loginMethod === 'mobile' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Mobile Number
                  </label>
                  <div className="flex space-x-2">
                    <select
                      value={mobileData.countryCode}
                      onChange={(e) => setMobileData(prev => ({ ...prev, countryCode: e.target.value }))}
                      className="px-3 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm"
                    >
                      {countryCodes.map((country) => (
                        <option key={country.code} value={country.code} className="bg-gray-800 text-white">
                          {country.flag} {country.code} {country.country}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      name="mobile"
                      value={mobileData.mobile}
                      onChange={handleMobileInputChange}
                      className={`flex-1 px-4 py-3 bg-white/10 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm ${
                        errors.mobile ? 'border-red-500' : 'border-white/20'
                      }`}
                      placeholder="Enter mobile number"
                      required
                    />
                  </div>
                  {errors.mobile && <p className="text-red-400 text-sm mt-1">{errors.mobile}</p>}
                </div>

                {!otpSent ? (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isSendingOtp || !mobileData.mobile}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSendingOtp ? 'Sending OTP...' : 'Send OTP'}</span>
                  </button>
                ) : (
                  <form onSubmit={handleOtpLogin} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Enter OTP
                      </label>
                      <input
                        type="text"
                        name="otp"
                        value={mobileData.otp}
                        onChange={handleMobileInputChange}
                        className={`w-full px-4 py-3 bg-white/10 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm text-center text-lg tracking-widest ${
                          errors.otp ? 'border-red-500' : 'border-white/20'
                        }`}
                        placeholder="000000"
                        maxLength={6}
                        required
                      />
                      {errors.otp && <p className="text-red-400 text-sm mt-1">{errors.otp}</p>}
                    </div>

                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setOtpSent(false);
                          setMobileData(prev => ({ ...prev, otp: '' }));
                          setErrors({});
                        }}
                        className="flex-1 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        Change Number
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        {isLoading ? 'Verifying...' : 'Verify & Login'}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={isSendingOtp}
                      className="w-full text-blue-400 hover:text-blue-300 text-sm transition-colors"
                    >
                      {isSendingOtp ? 'Resending...' : 'Resend OTP'}
                    </button>
                  </form>
                )}
              </div>
            )}

            <div className="mt-6 text-center">
              <p className="text-gray-300">
                Don't have an account?{' '}
                <Link
                  to="/signup"
                  className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerLogin;