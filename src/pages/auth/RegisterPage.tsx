import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { User, Phone, Mail, Lock, UserCheck, Recycle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { LocationPicker } from '../../components/Maps/LocationPicker';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';

const schema = yup.object({
  name: yup.string().required('Name is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  phone: yup.string().required('Phone number is required'),
  password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
  confirmPassword: yup.string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Confirm password is required'),
  role: yup.string().oneOf(['seller', 'recycler']).required('Please select a role'),
});

type FormData = yup.InferType<typeof schema>;

export function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<[number, number] | null>(null);
  const [step, setStep] = useState(1);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<FormData>({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    if (!location) {
      alert('Please select your location on the map');
      return;
    }

    setLoading(true);
    try {
      await signUp(data.email, data.password, {
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: data.role as 'seller' | 'recycler',
        latitude: location[0],
        longitude: location[1],
      });
      navigate('/dashboard');
    } catch (error: any) {
      let errorMessage = 'Registration failed';
      
      if (error.message) {
        if (error.message.includes('email_address_invalid')) {
          errorMessage = 'This email address is not accepted. Please try a different email address or contact support.';
        } else if (error.message.includes('Email rate limit exceeded')) {
          errorMessage = 'Too many signup attempts. Please wait a few minutes before trying again.';
        } else if (error.message.includes('User already registered')) {
          errorMessage = 'An account with this email already exists. Please try signing in instead.';
        } else {
          errorMessage = error.message;
        }
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = () => {
    const values = getValues();
    if (values.name && values.email && values.phone && values.password && values.confirmPassword && values.role) {
      setStep(2);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <Recycle className="h-12 w-12 text-green-600 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-900">Join SCRAP LINK</h2>
          <p className="text-gray-600 mt-2">Create your account to start trading</p>
        </div>

        <div className="mb-6">
          <div className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step >= 1 ? 'bg-green-600 text-white' : 'bg-gray-300'
            }`}>
              1
            </div>
            <div className={`flex-1 h-1 mx-2 ${step >= 2 ? 'bg-green-600' : 'bg-gray-300'}`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step >= 2 ? 'bg-green-600 text-white' : 'bg-gray-300'
            }`}>
              2
            </div>
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span>Account Info</span>
            <span>Location</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    {...register('name')}
                    type="text"
                    className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="John Doe"
                  />
                </div>
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    {...register('email')}
                    type="email"
                    className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="your.email@gmail.com"
                  />
                </div>
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    {...register('phone')}
                    type="tel"
                    className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    {...register('password')}
                    type="password"
                    className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="••••••••"
                  />
                </div>
                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    {...register('confirmPassword')}
                    type="password"
                    className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="••••••••"
                  />
                </div>
                {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  I want to...
                </label>
                <div className="space-y-3">
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      {...register('role')}
                      type="radio"
                      value="seller"
                      className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
                    />
                    <div className="ml-3">
                      <div className="font-medium text-gray-900">Sell Scrap Metal</div>
                      <div className="text-sm text-gray-600">List and sell your metal scraps</div>
                    </div>
                  </label>
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      {...register('role')}
                      type="radio"
                      value="recycler"
                      className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
                    />
                    <div className="ml-3">
                      <div className="font-medium text-gray-900">Buy Scrap Metal</div>
                      <div className="text-sm text-gray-600">Find and purchase metal scraps</div>
                    </div>
                  </label>
                </div>
                {errors.role && <p className="text-red-500 text-sm mt-1">{errors.role.message}</p>}
              </div>

              <button
                type="button"
                onClick={handleNextStep}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Next: Set Location
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Pin Your Location
                </label>
                <p className="text-sm text-gray-600 mb-4">
                  Click on the map to set your location. This helps us connect you with nearby traders.
                </p>
                <LocationPicker
                  onLocationSelect={(lat, lng) => setLocation([lat, lng])}
                  selectedLocation={location || undefined}
                />
                {location && (
                  <p className="text-sm text-green-600 mt-2">
                    ✓ Location selected: {location[0].toFixed(4)}, {location[1].toFixed(4)}
                  </p>
                )}
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={!location || loading}
                  className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? <LoadingSpinner size="sm" /> : 'Create Account'}
                </button>
              </div>
            </div>
          )}
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-green-600 hover:text-green-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}