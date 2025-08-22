import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, TrendingUp, Package, Clock, MapPin, Bell } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { format } from 'date-fns';

interface DashboardStats {
  totalListings: number;
  totalRequests: number;
  totalTransactions: number;
  totalEarnings: number;
}

interface RecentActivity {
  id: string;
  type: 'listing' | 'request' | 'transaction';
  description: string;
  date: string;
  amount?: number;
  status?: string;
}

export function DashboardPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalListings: 0,
    totalRequests: 0,
    totalTransactions: 0,
    totalEarnings: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchDashboardData();
    }
  }, [profile]);

  // Listen for real-time updates
  useEffect(() => {
    const handleTransactionCompleted = () => {
      if (profile) {
        fetchDashboardData();
      }
    };

    window.addEventListener('transactionCompleted', handleTransactionCompleted);
    return () => {
      window.removeEventListener('transactionCompleted', handleTransactionCompleted);
    };
  }, [profile]);
  const fetchDashboardData = async () => {
    if (!profile) return;

    try {
      if (profile.role === 'seller') {
        // Fetch seller stats and real activity
        const { data: listings } = await supabase
          .from('scrap_listings')
          .select('*')
          .eq('user_id', profile.user_id);

        const { data: transactions } = await supabase
          .from('transactions')
          .select('*')
          .eq('seller_id', profile.user_id);

        const { data: requests } = await supabase
          .from('pickup_requests')
          .select(`
            *,
            scrap_listings!inner(*)
          `)
          .eq('scrap_listings.user_id', profile.user_id);

        setStats({
          totalListings: listings?.length || 0,
          totalRequests: requests?.length || 0,
          totalTransactions: transactions?.length || 0,
          totalEarnings: transactions?.reduce((sum, t) => sum + t.final_price, 0) || 0,
        });

        // Fetch real recent activity for seller
        const activity: RecentActivity[] = [];

        // Add recent listings
        if (listings) {
          listings.slice(0, 3).forEach(listing => {
            activity.push({
              id: `listing-${listing.scrap_id}`,
              type: 'listing',
              description: `Posted ${listing.scrap_type} scrap listing (${listing.weight}kg)`,
              date: listing.posted_date,
              status: listing.status
            });
          });
        }

        // Add recent pickup requests
        if (requests) {
          requests.slice(0, 2).forEach(request => {
            activity.push({
              id: `request-${request.request_id}`,
              type: 'request',
              description: `Received pickup request for ${request.scrap_listings?.scrap_type || 'scrap'}`,
              date: request.request_date,
              status: request.pickup_status
            });
          });
        }

        // Add recent transactions
        if (transactions) {
          transactions.slice(0, 2).forEach(transaction => {
            activity.push({
              id: `transaction-${transaction.transaction_id}`,
              type: 'transaction',
              description: `Completed transaction`,
              date: transaction.transaction_date,
              amount: transaction.final_price,
              status: transaction.status
            });
          });
        }

        // Sort by date and take most recent 5
        activity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setRecentActivity(activity.slice(0, 5));

      } else {
        // Fetch recycler stats and real activity
        const { data: requests } = await supabase
          .from('pickup_requests')
          .select(`
            *,
            scrap_listings(*)
          `)
          .eq('recycler_id', profile.user_id);

        const { data: transactions } = await supabase
          .from('transactions')
          .select(`
            *,
            scrap_listings(scrap_type, weight)
          `)
          .eq('recycler_id', profile.user_id);

        setStats({
          totalListings: 0,
          totalRequests: requests?.length || 0,
          totalTransactions: transactions?.length || 0,
          totalEarnings: transactions?.filter(t => t.status === 'completed').reduce((sum, t) => sum + t.final_price, 0) || 0,
        });

        // Fetch real recent activity for recycler
        const activity: RecentActivity[] = [];

        // Add recent pickup requests
        if (requests) {
          requests.slice(0, 3).forEach(request => {
            const scrapType = request.scrap_listings?.scrap_type || 'scrap';
            let description = '';
            
            if (request.pickup_status === 'pending') {
              description = `Sent pickup request for ${scrapType}`;
            } else if (request.pickup_status === 'accepted') {
              description = `Request accepted for ${scrapType}`;
            } else if (request.pickup_status === 'completed') {
              description = `Pickup completed for ${scrapType}`;
            }

            activity.push({
              id: `request-${request.request_id}`,
              type: 'request',
              description,
              date: request.request_date,
              status: request.pickup_status
            });
          });
        }

        // Add recent transactions
        if (transactions) {
          transactions.slice(0, 3).forEach(transaction => {
            const scrapType = transaction.scrap_listings?.scrap_type || 'scrap';
            activity.push({
              id: `transaction-${transaction.transaction_id}`,
              type: 'transaction',
              description: `Purchased ${scrapType} (${transaction.scrap_listings?.weight || 0}kg)`,
              date: transaction.transaction_date,
              amount: transaction.final_price,
              status: transaction.status
            });
          });
        }

        // Sort by date and take most recent 5
        activity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setRecentActivity(activity.slice(0, 5));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!profile) {
    return <div>Profile not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {profile.name}!
          </h1>
          <p className="text-gray-600 mt-2">
            You're signed in as a {profile.role}. Here's your dashboard overview.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {profile.role === 'seller' ? (
            <Link
              to="/list-scrap"
              className="bg-white p-6 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-shadow group"
            >
              <div className="flex items-center">
                <div className="bg-green-100 p-3 rounded-lg group-hover:bg-green-200 transition-colors">
                  <Plus className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-gray-900">List New Scrap</h3>
                  <p className="text-gray-600 text-sm">Add scrap for sale</p>
                </div>
              </div>
            </Link>
          ) : (
            <Link
              to="/nearby-scrap"
              className="bg-white p-6 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-shadow group"
            >
              <div className="flex items-center">
                <div className="bg-blue-100 p-3 rounded-lg group-hover:bg-blue-200 transition-colors">
                  <MapPin className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-gray-900">Find Nearby Scrap</h3>
                  <p className="text-gray-600 text-sm">Browse available listings</p>
                </div>
              </div>
            </Link>
          )}

          {profile.role === 'seller' && (
            <Link
              to="/pickup-requests"
              className="bg-white p-6 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-shadow group"
            >
              <div className="flex items-center">
                <div className="bg-orange-100 p-3 rounded-lg group-hover:bg-orange-200 transition-colors">
                  <Bell className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-gray-900">Pickup Requests</h3>
                  <p className="text-gray-600 text-sm">Manage buyer requests</p>
                </div>
              </div>
            </Link>
          )}

          <Link
            to="/transactions"
            className="bg-white p-6 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-shadow group"
          >
            <div className="flex items-center">
              <div className="bg-purple-100 p-3 rounded-lg group-hover:bg-purple-200 transition-colors">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <h3 className="font-semibold text-gray-900">View Transactions</h3>
                <p className="text-gray-600 text-sm">Check your history</p>
              </div>
            </div>
          </Link>

          {profile.role === 'seller' && (
            <Link
              to="/my-listings"
              className="bg-white p-6 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-shadow group"
            >
              <div className="flex items-center">
                <div className="bg-yellow-100 p-3 rounded-lg group-hover:bg-yellow-200 transition-colors">
                  <Package className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-gray-900">My Listings</h3>
                  <p className="text-gray-600 text-sm">Manage your scraps</p>
                </div>
              </div>
            </Link>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {profile.role === 'seller' && (
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Listings</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalListings}</p>
                </div>
                <Package className="h-8 w-8 text-green-600" />
              </div>
            </div>
          )}

          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {profile.role === 'seller' ? 'Pickup Requests' : 'Sent Requests'}
                </p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalRequests}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed Deals</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalTransactions}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total {profile.role === 'seller' ? 'Earned' : 'Spent'}
                </p>
                <p className="text-2xl font-bold text-gray-900">₹{stats.totalEarnings.toFixed(2)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No recent activity</p>
              <p className="text-sm text-gray-500 mt-1">
                {profile.role === 'seller' 
                  ? 'Start by creating your first scrap listing' 
                  : 'Start by browsing nearby scrap listings'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${
                      activity.type === 'listing' ? 'bg-green-500' :
                      activity.type === 'request' ? 'bg-blue-500' :
                      'bg-purple-500'
                    }`} />
                    <div>
                      <p className="font-medium text-gray-900">{activity.description}</p>
                      <div className="flex items-center space-x-2">
                        <p className="text-sm text-gray-600">
                          {format(new Date(activity.date), 'MMM dd, yyyy HH:mm')}
                        </p>
                        {activity.status && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            activity.status === 'available' || activity.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            activity.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                            activity.status === 'completed' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {activity.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {activity.amount && (
                    <span className="text-lg font-bold text-green-600">
                      ₹{activity.amount.toFixed(2)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}