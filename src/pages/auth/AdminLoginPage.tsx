import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Mail, Lock, Settings } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';

const schema = yup.object({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().required('Password is required'),
});

type FormData = yup.InferType<typeof schema>;

export function AdminLoginPage() {
  const [loading, setLoading] = useState(false);
  const { signInAsAdmin } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await signInAsAdmin(data.email, data.password);
      // Small delay to ensure state is updated
      setTimeout(() => {
        navigate('/admin/control');
      }, 100);
    } catch (error: any) {
      console.error('Admin login error:', error);
      alert('Invalid admin credentials. Please use admin@scraplink.com and admin123');
      setLoading(false);
    } finally {
      // Don't set loading false here as we're navigating
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <Settings className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-900">Admin Access</h2>
          <p className="text-gray-600 mt-2">Sign in to the admin panel</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Demo Credentials</h3>
          <div className="text-sm text-blue-700">
            <p><strong>Email:</strong> admin@scraplink.com</p>
            <p><strong>Password:</strong> admin123</p>
            <p className="mt-2 text-xs text-blue-600">After login, you'll access the Admin Activities page with complete system oversight.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Admin Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                {...register('email')}
                type="email"
                className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                placeholder="admin@scraplink.com"
              />
            </div>
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Admin Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                {...register('password')}
                type="password"
                className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-600 text-white py-3 px-4 rounded-lg hover:bg-slate-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-h-[48px]"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Authenticating...
              </>
            ) : (
              'Access Admin Panel'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-slate-600 hover:text-slate-700 text-sm">
            ← Back to User Login
          </Link>
        </div>
      </div>
    </div>
  );
}