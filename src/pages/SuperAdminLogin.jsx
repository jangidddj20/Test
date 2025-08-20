import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Crown, ArrowLeft, Eye, EyeOff, Shield, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const SuperAdminLogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    securityCode: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { login, apiCall } = useAuth();
  const { addNotification } = useNotification();

  const handleInputChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Use the regular login endpoint which now handles super admin login
    fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        identifier: formData.email,
        password: formData.password
      }
    }).then(res => res.json())
    .then(response => {
      if (response.success) {
        const user = response.data.user;
        if (user.role === 'superadmin' && formData.securityCode === '777888') {
          login(user, user.role, response.data.token);
          addNotification('Super Admin access granted!', 'success');
          navigate('/super-admin');
        } else {
          addNotification('Invalid security code or insufficient privileges', 'error');
        }
      }
    })
    .catch(error => {
      addNotification(error.message || 'Super admin login failed', 'error');
    })
    .finally(() => {
      setIsLoading(false);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white rounded-full animate-ping"></div>
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-blue-400 rounded-full animate-ping" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-1/4 right-1/4 w-1 h-1 bg-purple-400 rounded-full animate-ping" style={{ animationDelay: '3s' }}></div>
      </div>

      {/* Header */}
      <header className="relative z-10 bg-white/5 backdrop-blur-md border-b border-white/10">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Link to="/" className="flex items-center space-x-2">
              <ArrowLeft className="h-5 w-5 text-white" />
              <Crown className="h-8 w-8 text-yellow-400" />
              <span className="text-2xl font-bold text-white">Super Admin</span>
            </Link>
            <div className="flex items-center space-x-2 text-yellow-200">
              <Shield className="w-4 h-4" />
              <span className="text-sm">Maximum Security Zone</span>
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4 py-12 relative z-10">
        <div className="w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 relative overflow-hidden">
            {/* Glassmorphism overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-3xl"></div>
            
            <div className="relative z-10">
              <div className="text-center mb-8">
                <div className="relative inline-flex items-center justify-center">
                  <div className="w-20 h-20 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <Crown className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute inset-0 w-20 h-20 bg-gradient-to-r from-yellow-500/30 to-orange-500/30 rounded-full animate-ping mx-auto mb-4"></div>
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Platform Owner</h2>
                <p className="text-gray-300">Ultimate system control access</p>
                <div className="flex items-center justify-center space-x-2 mt-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs text-yellow-200">Multi-layered authentication required</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Owner Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent backdrop-blur-sm transition-all"
                    placeholder="owner@restaurantai.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Master Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent backdrop-blur-sm pr-12 transition-all"
                      placeholder="Enter master password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Security Code
                  </label>
                  <input
                    type="text"
                    name="securityCode"
                    value={formData.securityCode}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent backdrop-blur-sm transition-all"
                    placeholder="6-digit security code"
                    maxLength={6}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-lg hover:from-yellow-700 hover:to-orange-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-medium relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity"></div>
                  <span className="relative z-10">
                    {isLoading ? 'Verifying Credentials...' : 'Access Super Admin Panel'}
                  </span>
                </button>
              </form>

              <div className="mt-6 p-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg backdrop-blur-sm">
                <p className="text-yellow-200 text-sm">
                  <strong>Demo Credentials:</strong><br />
                  Email: owner@restaurantai.com<br />
                  Password: superadmin2025<br />
                  Security Code: 777888
                </p>
              </div>

              <div className="mt-6 text-center">
                <Link to="/" className="text-gray-400 hover:text-gray-300 text-sm transition-colors">
                  Return to Platform
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminLogin;