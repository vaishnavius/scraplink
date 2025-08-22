import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { X, Save, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { pricePredictor, PricePrediction } from '../../lib/pricePredictor';
import { LoadingSpinner } from '../UI/LoadingSpinner';

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

interface ScrapListing {
  scrap_id: string;
  scrap_type: string;
  description: string;
  weight: number;
  estimated_price: number;
  posted_date: string;
  status: 'available' | 'accepted' | 'completed';
  latitude: number;
  longitude: number;
}

interface EditListingModalProps {
  listing: ScrapListing;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedListing: ScrapListing) => void;
}

export function EditListingModal({ listing, isOpen, onClose, onUpdate }: EditListingModalProps) {
  const [loading, setLoading] = useState(false);
  const [predictingPrice, setPredictingPrice] = useState(false);
  const [prediction, setPrediction] = useState<PricePrediction | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      scrap_type: listing.scrap_type,
      description: listing.description,
      weight: listing.weight,
    },
  });

  const watchedType = watch('scrap_type');
  const watchedWeight = watch('weight');
  const watchedDescription = watch('description');

  useEffect(() => {
    if (isOpen) {
      reset({
        scrap_type: listing.scrap_type,
        description: listing.description,
        weight: listing.weight,
      });
      setPrediction(null);
    }
  }, [isOpen, listing, reset]);

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
    if (!prediction) {
      alert('Please get a price estimate first');
      return;
    }

    setLoading(true);
    try {
      const { data: updatedData, error } = await supabase
        .from('scrap_listings')
        .update({
          scrap_type: data.scrap_type,
          description: data.description,
          weight: data.weight,
          estimated_price: prediction.predictedPrice,
        })
        .eq('scrap_id', listing.scrap_id)
        .select()
        .single();

      if (error) throw error;

      onUpdate(updatedData);
      onClose();
    } catch (error: any) {
      console.error('Error updating listing:', error);
      alert(error.message || 'Failed to update listing');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Edit Listing</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
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
              <DollarSign className="h-5 w-5 text-blue-600 mr-2" />
              Updated Price Prediction
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
                  Get updated price estimate for your scrap
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

          <div className="flex space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !prediction}
              className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Update Listing
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}