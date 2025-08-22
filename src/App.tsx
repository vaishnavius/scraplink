import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { Header } from './components/Layout/Header';
import { Footer } from './components/Layout/Footer';
import { LoadingSpinner } from './components/UI/LoadingSpinner';

// Public Pages
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { AdminLoginPage } from './pages/auth/AdminLoginPage';

// Protected Pages
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ListScrapPage } from './pages/scrap/ListScrapPage';
import { MyListingsPage } from './pages/scrap/MyListingsPage';
import { NearbyScrapPage } from './pages/scrap/NearbyScrapPage';
import PickupRequestsPage from './pages/requests/PickupRequestsPage';
import { TransactionsPage } from './pages/TransactionsPage';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminControlPage } from './pages/admin/AdminControlPage';
import { AdminActivitiesPage } from './pages/admin/AdminActivitiesPage';
import { DatasetManagement } from './pages/admin/DatasetManagement';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  if (!isAdmin || !user) {
    return <Navigate to="/admin-login" replace />;
  }
  
  return <>{children}</>;
}

function App() {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route 
              path="/login" 
              element={user || isAdmin ? <Navigate to="/dashboard" replace /> : <LoginPage />} 
            />
            <Route 
              path="/register" 
              element={user || isAdmin ? <Navigate to="/dashboard" replace /> : <RegisterPage />} 
            />
            <Route 
              path="/admin-login" 
              element={isAdmin ? <Navigate to="/admin/dashboard" replace /> : <AdminLoginPage />} 
            />

            {/* Protected User Routes */}
            <Route 
              path="/dashboard" 
              element={
                isAdmin ? <Navigate to="/admin/dashboard" replace /> : 
                <ProtectedRoute><DashboardPage /></ProtectedRoute>
              } 
            />
            <Route 
              path="/list-scrap" 
              element={<ProtectedRoute><ListScrapPage /></ProtectedRoute>} 
            />
            <Route 
              path="/my-listings" 
              element={<ProtectedRoute><MyListingsPage /></ProtectedRoute>} 
            />
            <Route 
              path="/nearby-scrap" 
              element={<ProtectedRoute><NearbyScrapPage /></ProtectedRoute>} 
            />
            <Route 
              path="/pickup-requests" 
              element={<ProtectedRoute><PickupRequestsPage /></ProtectedRoute>} 
            />
            <Route 
              path="/transactions" 
              element={<ProtectedRoute><TransactionsPage /></ProtectedRoute>} 
            />

            {/* Admin Routes */}
            <Route 
              path="/admin/control" 
              element={<AdminRoute><AdminActivitiesPage /></AdminRoute>} 
            />
            <Route 
              path="/admin/datasets" 
              element={<AdminRoute><DatasetManagement /></AdminRoute>}
            />
            <Route 
              path="/admin/dashboard" 
              element={<AdminRoute><AdminControlPage /></AdminRoute>}
            />

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;