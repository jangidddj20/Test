import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Crown, 
  LayoutDashboard, 
  Building, 
  Users, 
  BarChart3, 
  Monitor, 
  Bell, 
  Settings,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SuperAdminSidebar = () => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const menuItems = [
    { id: 'overview', label: 'Platform Overview', icon: LayoutDashboard, path: '/super-admin' },
    { id: 'restaurants', label: 'Restaurant Management', icon: Building, path: '/super-admin/restaurants' },
    { id: 'users', label: 'User Administration', icon: Users, path: '/super-admin/users' },
    { id: 'analytics', label: 'Advanced Analytics', icon: BarChart3, path: '/super-admin/analytics' },
    { id: 'monitoring', label: 'System Monitoring', icon: Monitor, path: '/super-admin/monitoring' },
    { id: 'notifications', label: 'Notifications', icon: Bell, path: '/super-admin/notifications' },
    { id: 'settings', label: 'Platform Settings', icon: Settings, path: '/super-admin/settings' }
  ];

  return (
    <div className="w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white min-h-screen flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
            <Crown className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Super Admin</h2>
            <p className="text-sm text-slate-400">Platform Control</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 py-6">
        <ul className="space-y-2 px-4">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.id}>
                <Link
                  to={item.path}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white shadow-lg'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Profile & Logout */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
            <Crown className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{user?.name}</p>
            <p className="text-xs text-slate-400">Platform Owner</p>
          </div>
        </div>
        
        {/* Role Session Indicator */}
        <div className="mb-4 p-2 bg-slate-800 rounded-lg">
          <p className="text-xs text-slate-400">Active Session:</p>
          <p className="text-sm font-medium text-yellow-400">Super Admin Control</p>
        </div>
        
        <button
          onClick={logout}
          className="w-full flex items-center space-x-2 px-4 py-2 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default SuperAdminSidebar;