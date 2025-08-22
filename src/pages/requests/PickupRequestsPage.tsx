import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Package, User, Phone, Mail, MapPin, Clock, CheckCircle, XCircle, DollarSign } from 'lucide-react';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';

interface PickupRequest {
  request_id: string;
  scrap_id: string;
  recycler_id: string;
  pickup_status: 'pending' | 'accepted' | 'completed';
  request_date: string;
  scrap_listing?: {
    scrap_id: string;
    scrap_type: string;
    weight: number;
    estimated_price: number;
    description: string;
    status: string;
    user_id: string;
  };
  recycler?: {
    user_id: string;
    email: string;
    name?: string;
    phone?: string;
  };
}

export default function PickupRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PickupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [finalPrice, setFinalPrice] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    if (user) {
      fetchPickupRequests();
    }
  }, [user]);

  const fetchPickupRequests = async () => {
    try {
      setLoading(true);
      
      // First, get pickup requests for the current user's listings
      const { data: pickupRequests, error: requestsError } = await supabase
        .from('pickup_requests')
        .select(`
          request_id,
          scrap_id,
          recycler_id,
          pickup_status,
          request_date,
          scrap_listings!inner(
            scrap_id,
            scrap_type,
            weight,
            estimated_price,
            description,
            status,
            user_id
          )
        `)
        .eq('scrap_listings.user_id', user?.id)
        .order('request_date', { ascending: false });

      if (requestsError) throw requestsError;

      // Get recycler details for each request
      const requestsWithDetails = await Promise.all(
        (pickupRequests || []).map(async (request) => {
          const { data: recycler } = await supabase
            .from('users')
            .select('user_id, email, name, phone')
            .eq('user_id', request.recycler_id)
            .single();

          return {
            ...request,
            scrap_listing: request.scrap_listings,
            recycler: recycler
          };
        })
      );

      setRequests(requestsWithDetails);
    } catch (error) {
      console.error('Error fetching pickup requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      setActionLoading(requestId);
      
      const { error } = await supabase
        .from('pickup_requests')
        .update({ 
          pickup_status: 'accepted'
        })
        .eq('request_id', requestId);

      if (error) throw error;

      // Update the listing status to accepted
      const request = requests.find(r => r.request_id === requestId);
      if (request?.scrap_id) {
        await supabase
          .from('scrap_listings')
          .update({ status: 'accepted' })
          .eq('scrap_id', request.scrap_id);
      }

      await fetchPickupRequests();
    } catch (error) {
      console.error('Error accepting request:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      setActionLoading(requestId);
      
      const { error } = await supabase
        .from('pickup_requests')
        .delete()
        .eq('request_id', requestId);

      if (error) throw error;

      await fetchPickupRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteTransaction = async (requestId: string) => {
    try {
      setActionLoading(requestId);
      const request = requests.find(r => r.request_id === requestId);
      const price = finalPrice[requestId];
      
      if (!price || price <= 0) {
        alert('Please enter a valid final price');
        setActionLoading(null);
        return;
      }
      
      if (!request) {
        alert('Request not found');
        setActionLoading(null);
        return;
      }

      // Update pickup request
      const { error: requestError } = await supabase
        .from('pickup_requests')
        .update({ 
          pickup_status: 'completed'
        })
        .eq('request_id', requestId);

      if (requestError) throw requestError;

      // Update listing status
      if (request.scrap_id) {
        await supabase
          .from('scrap_listings')
          .update({ status: 'completed' })
          .eq('scrap_id', request.scrap_id);
      }

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          seller_id: request.scrap_listing?.user_id,
          recycler_id: request.recycler_id,
          scrap_id: request.scrap_id,
          final_price: price,
          status: 'completed'
        });

      if (transactionError) {
        console.error('Transaction creation error:', transactionError);
        throw transactionError;
      }

      // Clear the final price input
      setFinalPrice(prev => {
        const newPrices = { ...prev };
        delete newPrices[requestId];
        return newPrices;
      });

      alert('Transaction completed successfully!');
      await fetchPickupRequests();
      
      // Trigger a custom event to notify other components
      window.dispatchEvent(new CustomEvent('transactionCompleted', {
        detail: { transactionId: transactionError }
      }));
    } catch (error) {
      console.error('Error completing transaction:', error);
      alert('Failed to complete transaction. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      accepted: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Pickup Requests</h1>
          <p className="mt-2 text-gray-600">Manage pickup requests for your scrap listings</p>
        </div>

        {requests.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No pickup requests</h3>
            <p className="text-gray-600">You don't have any pickup requests yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {requests.map((request) => (
              <div key={request.request_id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Package className="w-6 h-6 text-indigo-600" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        Pickup Request
                      </h3>
                    </div>
                    {getStatusBadge(request.pickup_status)}
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Scrap Details */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900 flex items-center">
                        <Package className="w-4 h-4 mr-2" />
                        Scrap Details
                      </h4>
                      {request.scrap_listing ? (
                        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                          <p><span className="font-medium">Type:</span> {request.scrap_listing.scrap_type}</p>
                          <p><span className="font-medium">Weight:</span> {request.scrap_listing.weight} kg</p>
                          <p><span className="font-medium">Estimated Price:</span> ₹{request.scrap_listing.estimated_price}</p>
                          <p><span className="font-medium">Description:</span> {request.scrap_listing.description}</p>
                          <p><span className="font-medium">Status:</span> 
                            <span className={`ml-2 px-2 py-1 rounded text-xs ${
                              request.scrap_listing.status === 'available' ? 'bg-green-100 text-green-800' :
                              request.scrap_listing.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {request.scrap_listing.status}
                            </span>
                          </p>
                        </div>
                      ) : (
                        <p className="text-red-600">⚠️ Scrap listing details not available</p>
                      )}
                    </div>

                    {/* Recycler Details */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900 flex items-center">
                        <User className="w-4 h-4 mr-2" />
                        Recycler Details
                      </h4>
                      {request.recycler ? (
                        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                          <p className="flex items-center">
                            <User className="w-4 h-4 mr-2 text-gray-500" />
                            <span className="font-medium">Name:</span> 
                            <span className="ml-2">{request.recycler.name || 'Not provided'}</span>
                          </p>
                          <p className="flex items-center">
                            <Mail className="w-4 h-4 mr-2 text-gray-500" />
                            <span className="font-medium">Email:</span> 
                            <span className="ml-2">{request.recycler.email}</span>
                          </p>
                          <p className="flex items-center">
                            <Phone className="w-4 h-4 mr-2 text-gray-500" />
                            <span className="font-medium">Phone:</span> 
                            <span className="ml-2">{request.recycler.phone || 'Not provided'}</span>
                          </p>
                        </div>
                      ) : (
                        <p className="text-red-600">⚠️ Recycler details not available</p>
                      )}
                    </div>
                  </div>

                  {/* Request Timeline */}
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="flex items-center text-sm text-gray-600 space-x-4">
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        Requested: {new Date(request.request_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    {request.pickup_status === 'pending' && (
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleAcceptRequest(request.request_id)}
                          disabled={actionLoading === request.request_id}
                          className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
                        >
                          {actionLoading === request.request_id ? (
                            <LoadingSpinner />
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Accept Request
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleRejectRequest(request.request_id)}
                          disabled={actionLoading === request.request_id}
                          className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject Request
                        </button>
                      </div>
                    )}

                    {request.pickup_status === 'accepted' && (
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <label className="flex-1">
                            <span className="block text-sm font-medium text-gray-700 mb-1">
                              Final Price (₹)
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={finalPrice[request.request_id] || request.scrap_listing?.estimated_price || ''}
                              onChange={(e) => setFinalPrice(prev => ({
                                ...prev,
                                [request.request_id]: parseFloat(e.target.value) || 0
                              }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="Enter final price"
                            />
                          </label>
                        </div>
                        <button
                          onClick={() => handleCompleteTransaction(request.request_id)}
                          disabled={
                            actionLoading === request.request_id || 
                            !finalPrice[request.request_id] || 
                            finalPrice[request.request_id] <= 0
                          }
                          className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center"
                        >
                          {actionLoading === request.request_id ? (
                            <LoadingSpinner />
                          ) : (
                            <>
                              <DollarSign className="w-4 h-4 mr-2" />
                              Complete Transaction
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {request.pickup_status === 'completed' && (
                      <div className="bg-green-50 p-4 rounded-lg">
                        <p className="text-green-800 font-medium">
                          Transaction completed successfully
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}