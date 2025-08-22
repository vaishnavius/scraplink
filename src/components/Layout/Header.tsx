import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { Recycle, LogOut, User, Settings } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';


export function Header() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const scrollToSection = (sectionId: string) => {
    // If not on homepage, navigate to homepage first
    if (location.pathname !== '/') {
      navigate('/');
      // Wait for navigation to complete, then scroll
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
          });
        }
      }, 100);
    } else {
      // Already on homepage, just scroll
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className="bg-white shadow-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <Recycle className="h-8 w-8 text-green-600" />
            <span className="text-xl font-bold text-gray-900">SCRAP LINK</span>
          </Link>

          <nav className="hidden md:flex space-x-8">
            {!user && !isAdmin && (
              <>
                <button 
                  onClick={() => scrollToSection('features')}
                  className="text-gray-700 hover:text-green-600 transition-colors"
                >
                  Features
                </button>
                <button 
                  onClick={() => scrollToSection('about')}
                  className="text-gray-700 hover:text-green-600 transition-colors"
                >
                  About
                </button>
                <button 
                  onClick={() => scrollToSection('contact')}
                  className="text-gray-700 hover:text-green-600 transition-colors"
                >
                  Contact
                </button>
              </>
            )}
            
            {user && profile && (
              <>
                <Link to="/dashboard" className="text-gray-700 hover:text-green-600 transition-colors">
                  Dashboard
                </Link>
                {profile.role === 'seller' && (
                  <Link to="/my-listings" className="text-gray-700 hover:text-green-600 transition-colors">
                    My Listings
                  </Link>
                )}
                {profile.role === 'seller' && (
                  <Link to="/pickup-requests" className="text-gray-700 hover:text-green-600 transition-colors">
                    Pickup Requests
                  </Link>
                )}
                {profile.role === 'recycler' && (
                  <Link to="/nearby-scrap" className="text-gray-700 hover:text-green-600 transition-colors">
                    Find Scrap
                  </Link>
                )}
                <Link to="/transactions" className="text-gray-700 hover:text-green-600 transition-colors">
                  Transactions
                </Link>
              </>
            )}

            {isAdmin && (
              <>
                <Link to="/admin/dashboard" className="text-gray-700 hover:text-green-600 transition-colors">
                  Admin Control Panel
                </Link>
                <Link to="/admin/control" className="text-gray-700 hover:text-green-600 transition-colors">
                  Admin Activities
                </Link>
                <Link to="/admin/datasets" className="text-gray-700 hover:text-green-600 transition-colors">
                  Dataset Management
                </Link>
              </>
            )}
          </nav>

          <div className="flex items-center space-x-4">
            {!user && !isAdmin ? (
              <>
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-green-600 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Get Started
                </Link>
                <Link
                  to="/admin-login"
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Admin
                </Link>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                {profile && (
                  <div className="flex items-center space-x-2">
                    <User className="h-5 w-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">
                      {profile.name} ({profile.role})
                    </span>
                  </div>
                )}
                {isAdmin && (
                  <div className="flex items-center space-x-2">
                    <Settings className="h-5 w-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Admin</span>
                  </div>
                )}
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-1 text-gray-600 hover:text-red-600 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}