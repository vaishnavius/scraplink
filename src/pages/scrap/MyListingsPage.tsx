import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Clock, CheckCircle, Package } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { EditListingModal } from '../../components/Modals/EditListingModal';
import { format } from 'date-fns';

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

export function MyListingsPage() {
  const [listings, setListings] = useState<ScrapListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingListing, setEditingListing] = useState<ScrapListing | null>(null);
  const { profile } = useAuth();

  useEffect(() => {
    fetchListings();
  }, [profile]);

  const fetchListings = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('scrap_listings')
        .select('*')
        .eq('user_id', profile.user_id)
        .order('posted_date', { ascending: false });

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteListing = async (scrapId: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;

    try {
      const { error } = await supabase
        .from('scrap_listings')
        .delete()
        .eq('scrap_id', scrapId);

      if (error) throw error;
      
      setListings(listings.filter(listing => listing.scrap_id !== scrapId));
    } catch (error) {
      console.error('Error deleting listing:', error);
      alert('Failed to delete listing');
    }
  };

  const handleEditListing = (listing: ScrapListing) => {
    setEditingListing(listing);
  };

  const handleUpdateListing = (updatedListing: ScrapListing) => {
    setListings(listings.map(listing => 
      listing.scrap_id === updatedListing.scrap_id ? updatedListing : listing
    ));
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      available: 'bg-green-100 text-green-800',
      accepted: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-gray-100 text-gray-800',
    };

    const icons = {
      available: Clock,
      accepted: CheckCircle,
      completed: Package,
    };

    const Icon = icons[status as keyof typeof icons];

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Listings</h1>
            <p className="text-gray-600 mt-2">
              Manage your scrap metal listings and track their status
            </p>
          </div>
          <Link
            to="/list-scrap"
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add New Listing
          </Link>
        </div>

        {listings.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No listings yet</h3>
            <p className="text-gray-600 mb-6">
              Start by creating your first scrap listing to connect with buyers
            </p>
            <Link
              to="/list-scrap"
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors inline-flex items-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create First Listing
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <div
                key={listing.scrap_id}
                className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {listing.scrap_type}
                  </h3>
                  {getStatusBadge(listing.status)}
                </div>

                <p className="text-gray-600 mb-4 line-clamp-2">
                  {listing.description}
                </p>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Weight:</span>
                    <span className="font-medium">{listing.weight} kg</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Estimated Price:</span>
                    <span className="font-medium text-green-600">
                      ₹{listing.estimated_price.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Posted:</span>
                    <span className="font-medium">
                      {format(new Date(listing.posted_date), 'MMM dd, yyyy')}
                    </span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditListing(listing)}
                    disabled={listing.status !== 'available'}
                    className="flex-1 bg-blue-100 text-blue-700 py-2 px-3 rounded-lg hover:bg-blue-200 transition-colors flex items-center justify-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteListing(listing.scrap_id)}
                    disabled={listing.status !== 'available'}
                    className="flex-1 bg-red-100 text-red-700 py-2 px-3 rounded-lg hover:bg-red-200 transition-colors flex items-center justify-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Modal */}
        {editingListing && (
          <EditListingModal
            listing={editingListing}
            isOpen={!!editingListing}
            onClose={() => setEditingListing(null)}
            onUpdate={handleUpdateListing}
          />
        )}
      </div>
    </div>
  );
}