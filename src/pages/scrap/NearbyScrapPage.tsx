import React, { useState, useEffect } from 'react';
import { Filter, MapPin, Clock, DollarSign, Send } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { ScrapMap } from '../../components/Maps/ScrapMap';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
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
  distance?: number;
}

type SortOption = 'distance' | 'price' | 'weight' | 'date';

// Haversine formula to calculate distance between two points
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export function NearbyScrapPage() {
  const [listings, setListings] = useState<ScrapListing[]>([]);
  const [filteredListings, setFilteredListings] = useState<ScrapListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('distance');
  const [filterType, setFilterType] = useState<string>('');
  const [maxDistance, setMaxDistance] = useState<number>(50);
  const [selectedListing, setSelectedListing] = useState<ScrapListing | null>(null);
  const { profile } = useAuth();

  useEffect(() => {
    fetchNearbyListings();
  }, [profile]);

  useEffect(() => {
    filterAndSortListings();
  }, [listings, sortBy, filterType, maxDistance]);

  const fetchNearbyListings = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('scrap_listings')
        .select('*')
        .eq('status', 'available')
        .neq('user_id', profile.user_id); // Exclude own listings

      if (error) throw error;

      // Calculate distances and add to listings
      const listingsWithDistance = (data || []).map(listing => ({
        ...listing,
        distance: calculateDistance(
          profile.latitude,
          profile.longitude,
          listing.latitude,
          listing.longitude
        ),
      }));

      setListings(listingsWithDistance);
    } catch (error) {
      console.error('Error fetching nearby listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortListings = () => {
    let filtered = [...listings];

    // Filter by distance
    filtered = filtered.filter(listing => 
      (listing.distance || 0) <= maxDistance
    );

    // Filter by scrap type
    if (filterType) {
      filtered = filtered.filter(listing => 
        listing.scrap_type === filterType
      );
    }

    // Sort listings
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'distance':
          return (a.distance || 0) - (b.distance || 0);
        case 'price':
          return b.estimated_price - a.estimated_price;
        case 'weight':
          return b.weight - a.weight;
        case 'date':
          return new Date(b.posted_date).getTime() - new Date(a.posted_date).getTime();
        default:
          return 0;
      }
    });

    setFilteredListings(filtered);
  };

  const sendPickupRequest = async (scrapId: string) => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('pickup_requests')
        .insert({
          scrap_id: scrapId,
          recycler_id: profile.user_id,
        });

      if (error) throw error;
      
      alert('Pickup request sent successfully!');
      // Refresh listings to update status if needed
      fetchNearbyListings();
    } catch (error) {
      console.error('Error sending pickup request:', error);
      alert('Failed to send pickup request');
    }
  };

  const getUniqueScrapTypes = () => {
    const types = new Set(listings.map(listing => listing.scrap_type));
    return Array.from(types).sort();
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Find Nearby Scrap</h1>
          <p className="text-gray-600 mt-2">
            Discover available scrap metal listings in your area
          </p>
        </div>

        {/* Filters and Sorting */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="distance">Distance</option>
                <option value="price">Price (High to Low)</option>
                <option value="weight">Weight (High to Low)</option>
                <option value="date">Date (Newest)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scrap Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                {getUniqueScrapTypes().map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Distance (km)
              </label>
              <input
                type="number"
                value={maxDistance}
                onChange={(e) => setMaxDistance(Number(e.target.value))}
                min="1"
                max="200"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-end">
              <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-sm font-medium">
                <Filter className="h-4 w-4 inline mr-1" />
                {filteredListings.length} listings found
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Map View */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Map View</h2>
            {profile && (
              <ScrapMap
                listings={filteredListings}
                center={[profile.latitude, profile.longitude]}
                onScrapSelect={setSelectedListing}
              />
            )}
          </div>

          {/* Listings List */}
          <div className="space-y-4">
            {filteredListings.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No nearby listings found</h3>
                <p className="text-gray-600">
                  Try adjusting your filters or increasing the search distance
                </p>
              </div>
            ) : (
              filteredListings.map((listing) => (
                <div
                  key={listing.scrap_id}
                  className={`bg-white rounded-lg shadow-md p-6 border-2 transition-all cursor-pointer ${
                    selectedListing?.scrap_id === listing.scrap_id
                      ? 'border-blue-500 shadow-lg'
                      : 'border-transparent hover:shadow-lg'
                  }`}
                  onClick={() => setSelectedListing(listing)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {listing.scrap_type}
                      </h3>
                      <p className="text-sm text-gray-600 flex items-center mt-1">
                        <MapPin className="h-4 w-4 mr-1" />
                        {listing.distance?.toFixed(1)} km away
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">
                        ₹{listing.estimated_price.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-600">{listing.weight} kg</p>
                    </div>
                  </div>

                  <p className="text-gray-600 mb-4 line-clamp-2">
                    {listing.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-1" />
                      {format(new Date(listing.posted_date), 'MMM dd')}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        sendPickupRequest(listing.scrap_id);
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center text-sm"
                    >
                      <Send className="h-4 w-4 mr-1" />
                      Request Pickup
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}