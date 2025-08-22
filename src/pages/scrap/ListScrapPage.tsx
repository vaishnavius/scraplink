import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Package, DollarSign, MapPin, Zap } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { pricePredictor, PricePrediction } from '../../lib/pricePredictor';
import { LocationPicker } from '../../components/Maps/LocationPicker';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';

const METAL_TYPES = [
  'Iron',
  'Aluminum',
  'Copper',
  'Steel',
  'Brass',
  'Bronze',
  'Lead',
  'Zinc',
  'Nickel',
  'Tin'
];

const schema = yup.object({
  scrap_type: yup.string().required('Scrap type is required'),
  description: yup.string().required('Description is required'),
  weight: yup.number().positive('Weight must be positive').required('Weight is required'),
});

type FormData = yup.InferType<typeof schema>;

// Mock ML API function
const predictPrice = async (scrapType: string, weight: number): Promise<number> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock price calculation based on metal type and weight
  const basePrices: Record<string, number> = {
    'Iron': 0.15,
    'Aluminum': 0.85,
    'Copper': 6.20,
    'Steel': 0.25,
    'Brass': 3.80,
    'Bronze': 4.50,
    'Lead': 1.20,
    'Zinc': 1.40,
    'Nickel': 8.50,
    'Tin': 18.00,
  };

  const basePrice = basePrices[scrapType] || 0.50;
  const randomVariation = 0.8 + Math.random() * 0.4; // ±20% variation
  return parseFloat((basePrice * weight * randomVariation).toFixed(2));
};

export function ListScrapPage() {
  const [loading, setLoading] = useState(false);
  const [predictingPrice, setPredictingPrice] = useState(false);
  const [prediction, setPrediction] = useState<PricePrediction | null>(null);
  const [location, setLocation] = useState<[number, number] | null>(null);
  const { profile } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(schema),
  });

  const watchedType = watch('scrap_type');
  const watchedWeight = watch('weight');
  const watchedDescription = watch('description');

  const handlePredictPrice = async () => {
    if (!watchedType || !watchedWeight) {
      alert('Please fill in scrap type and weight first');
      return;
    }

    setPredictingPrice(true);
    try {
      const predictionResult = await pricePredictor.predictPrice(
        watchedType, 
        watchedWeight, 
        watchedDescription
      );
      setPrediction(predictionResult);
    } catch (error) {
      console.error('Error predicting price:', error);
      alert(`Failed to predict price: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setPredictingPrice(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!location) {
      alert('Please select a location for your scrap');
      return;
    }

    if (!prediction) {
      alert('Please get a price estimate first');
      return;
    }

    if (!profile) {
      alert('You must be logged in to list scrap');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('scrap_listings')
        .insert({
          user_id: profile.user_id,
          scrap_type: data.scrap_type,
          description: data.description,
          weight: data.weight,
          estimated_price: prediction.predictedPrice,
          latitude: location[0],
          longitude: location[1],
        });

      if (error) throw error;

      navigate('/my-listings');
    } catch (error: any) {
      console.error('Error creating listing:', error);
      alert(error.message || 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <Package className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900">List Your Scrap</h1>
            <p className="text-gray-600 mt-2">
              Add your metal scrap listing and get price predictions
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scrap Type
                </label>
                <select
                  {...register('scrap_type')}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Select metal type...</option>
                  {METAL_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                {errors.scrap_type && (
                  <p className="text-red-500 text-sm mt-1">{errors.scrap_type.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Weight (kg)
                </label>
                <input
                  {...register('weight', { valueAsNumber: true })}
                  type="number"
                  step="0.1"
                  min="0"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter weight in kg"
                />
                {errors.weight && (
                  <p className="text-red-500 text-sm mt-1">{errors.weight.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                {...register('description')}
                rows={4}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Describe the condition, quality, and any other relevant details..."
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
              )}
            </div>

            {/* Price Prediction */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <Zap className="h-5 w-5 text-blue-600 mr-2" />
                Price Prediction
              </h3>
              
              {prediction ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm text-gray-600">Estimated Market Value</p>
                        <p className="text-3xl font-bold text-green-600">₹{prediction.predictedPrice.toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Confidence</p>
                        <p className="text-lg font-semibold text-blue-600">{(prediction.confidence * 100).toFixed(0)}%</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mt-3">
                      <div>Base Price: ₹{prediction.factors.basePrice.toFixed(2)}/kg</div>
                      <div>Weight Factor: {prediction.factors.weightMultiplier.toFixed(2)}x</div>
                      <div>Market Trend: {prediction.factors.marketTrend.toFixed(2)}x</div>
                      <div>Quality Factor: {prediction.factors.qualityAdjustment.toFixed(2)}x</div>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={handlePredictPrice}
                    disabled={predictingPrice || !watchedType || !watchedWeight}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Refresh Price
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-gray-600 mb-4">
                    Get price estimate for your scrap
                  </p>
                  <button
                    type="button"
                    onClick={handlePredictPrice}
                    disabled={predictingPrice || !watchedType || !watchedWeight}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mx-auto"
                  >
                    {predictingPrice ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Predicting...
                      </>
                    ) : (
                      <>
                        <DollarSign className="h-4 w-4 mr-2" />
                        Predict Price
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Location Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="h-4 w-4 inline mr-1" />
                Scrap Location
              </label>
              <p className="text-sm text-gray-600 mb-3">
                Click on the map to mark where your scrap is located
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

            <div className="pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={loading || !prediction || !location}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Creating Listing...
                  </>
                ) : (
                  'Create Listing'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}