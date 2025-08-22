import React, { useState, useEffect } from 'react';
import { Users, Package, TrendingUp, AlertCircle, Calendar, DollarSign, Eye, Search, Filter, Activity, UserCheck, ShoppingCart, Truck, Settings, BarChart3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { format } from 'date-fns';

interface AdminStats {
  totalUsers: number;
  totalSellers: number;
  totalRecyclers: number;
  totalListings: number;
  totalTransactions: number;
  totalRevenue: number;
  activeListings: number;
  pendingRequests: number;
  todayRegistrations: number;
  thisWeekActivity: number;
}

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
  user: {
    name: string;
    email: string;
    phone: string;
    role: string;
  };
}

interface User {
  user_id: string;
  name: string;
  email: string;
  phone: string;
  role: 'seller' | 'recycler';
  registered_at: string;
  latitude: number;
  longitude: number;
}

interface Transaction {
  transaction_id: string;
  final_price: number;
  transaction_date: string;
  status: string;
  scrap_listing: {
    scrap_type: string;
    weight: number;
  };
  seller: {
    name: string;
    email: string;
  };
  recycler: {
    name: string;
    email: string;
  };
}

interface PickupRequest {
  request_id: string;
  request_date: string;
  pickup_status: string;
  scrap_listing: {
    scrap_type: string;
    weight: number;
    estimated_price: number;
  };
  seller: {
    name: string;
    email: string;
  };
  recycler: {
    name: string;
    email: string;
  };
}

interface SystemActivity {
  id: string;
  type: 'user_registration' | 'listing_created' | 'pickup_request' | 'transaction_completed';
  description: string;
  user_name: string;
  user_email: string;
  user_role: string;
  timestamp: string;
  details?: any;
}

export function AdminControlPage() {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalSellers: 0,
    totalRecyclers: 0,
    totalListings: 0,
    totalTransactions: 0,
    totalRevenue: 0,
    activeListings: 0,
    pendingRequests: 0,
    todayRegistrations: 0,
    thisWeekActivity: 0,
  });
  const [listings, setListings] = useState<ScrapListing[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pickupRequests, setPickupRequests] = useState<PickupRequest[]>([]);
  const [systemActivity, setSystemActivity] = useState<SystemActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'sellers' | 'recyclers' | 'listings' | 'transactions' | 'requests' | 'activity'>('overview');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAllData();
    // Refresh data every 30 seconds
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAllData = async () => {
    try {
      await Promise.all([
        fetchAdminStats(),
        fetchAllListings(),
        fetchAllUsers(),
        fetchAllTransactions(),
        fetchAllPickupRequests(),
        fetchSystemActivity()
      ]);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminStats = async () => {
    try {
      // Fetch users stats
      const { data: users } = await supabase.from('users').select('role, registered_at');
      const totalUsers = users?.length || 0;
      const totalSellers = users?.filter(u => u.role === 'seller').length || 0;
      const totalRecyclers = users?.filter(u => u.role === 'recycler').length || 0;

      // Calculate today's registrations
      const today = new Date().toISOString().split('T')[0];
      const todayRegistrations = users?.filter(u => 
        u.registered_at && u.registered_at.startsWith(today)
      ).length || 0;

      // Fetch listings stats
      const { data: listings } = await supabase.from('scrap_listings').select('status, posted_date');
      const totalListings = listings?.length || 0;
      const activeListings = listings?.filter(l => l.status === 'available').length || 0;

      // Fetch transactions stats
      const { data: transactions } = await supabase.from('transactions').select('final_price, status, transaction_date');
      const totalTransactions = transactions?.length || 0;
      const totalRevenue = transactions?.reduce((sum, t) => sum + (t.final_price || 0), 0) || 0;

      // Fetch pickup requests stats
      const { data: requests } = await supabase.from('pickup_requests').select('pickup_status, request_date');
      const pendingRequests = requests?.filter(r => r.pickup_status === 'pending').length || 0;

      // Calculate this week's activity
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const thisWeekActivity = [
        ...(listings?.filter(l => new Date(l.posted_date) > weekAgo) || []),
        ...(transactions?.filter(t => new Date(t.transaction_date) > weekAgo) || []),
        ...(requests?.filter(r => new Date(r.request_date) > weekAgo) || [])
      ].length;

      setStats({
        totalUsers,
        totalSellers,
        totalRecyclers,
        totalListings,
        totalTransactions,
        totalRevenue,
        activeListings,
        pendingRequests,
        todayRegistrations,
        thisWeekActivity,
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    }
  };

  const fetchAllListings = async () => {
    try {
      const { data, error } = await supabase
        .from('scrap_listings')
        .select(`
          *,
          user:users!scrap_listings_user_id_fkey (
            name,
            email,
            phone,
            role
          )
        `)
        .order('posted_date', { ascending: false });

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error('Error fetching listings:', error);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('registered_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchAllTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          scrap_listing:scrap_listings!transactions_scrap_id_fkey (
            scrap_type,
            weight
          ),
          seller:users!transactions_seller_id_fkey (
            name,
            email
          ),
          recycler:users!transactions_recycler_id_fkey (
            name,
            email
          )
        `)
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const fetchAllPickupRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('pickup_requests')
        .select(`
          *,
          scrap_listing:scrap_listings!pickup_requests_scrap_id_fkey (
            scrap_type,
            weight,
            estimated_price,
            user:users!scrap_listings_user_id_fkey (
              name,
              email
            )
          ),
          recycler:users!pickup_requests_recycler_id_fkey (
            name,
            email
          )
        `)
        .order('request_date', { ascending: false });

      if (error) throw error;
      
      const formattedRequests = (data || []).map(request => ({
        ...request,
        seller: request.scrap_listing?.user,
      }));
      
      setPickupRequests(formattedRequests);
    } catch (error) {
      console.error('Error fetching pickup requests:', error);
    }
  };

  const fetchSystemActivity = async () => {
    try {
      const activities: SystemActivity[] = [];

      // Get recent user registrations
      const { data: recentUsers } = await supabase
        .from('users')
        .select('*')
        .order('registered_at', { ascending: false })
        .limit(10);

      recentUsers?.forEach(user => {
        activities.push({
          id: `user-${user.user_id}`,
          type: 'user_registration',
          description: `New ${user.role} registered: ${user.name}`,
          user_name: user.name,
          user_email: user.email,
          user_role: user.role,
          timestamp: user.registered_at,
        });
      });

      // Get recent listings
      const { data: recentListings } = await supabase
        .from('scrap_listings')
        .select(`
          *,
          user:users!scrap_listings_user_id_fkey (name, email, role)
        `)
        .order('posted_date', { ascending: false })
        .limit(10);

      recentListings?.forEach(listing => {
        activities.push({
          id: `listing-${listing.scrap_id}`,
          type: 'listing_created',
          description: `${listing.user?.name} posted ${listing.scrap_type} scrap (${listing.weight}kg) - ₹${listing.estimated_price}`,
          user_name: listing.user?.name || 'Unknown',
          user_email: listing.user?.email || 'Unknown',
          user_role: listing.user?.role || 'seller',
          timestamp: listing.posted_date,
          details: {
            scrap_type: listing.scrap_type,
            weight: listing.weight,
            price: listing.estimated_price
          }
        });
      });

      // Get recent pickup requests
      const { data: recentRequests } = await supabase
        .from('pickup_requests')
        .select(`
          *,
          recycler:users!pickup_requests_recycler_id_fkey (name, email, role),
          scrap_listing:scrap_listings!pickup_requests_scrap_id_fkey (
            scrap_type,
            user:users!scrap_listings_user_id_fkey (name, email)
          )
        `)
        .order('request_date', { ascending: false })
        .limit(10);

      recentRequests?.forEach(request => {
        activities.push({
          id: `request-${request.request_id}`,
          type: 'pickup_request',
          description: `${request.recycler?.name} requested pickup of ${request.scrap_listing?.scrap_type || 'scrap'} from ${request.scrap_listing?.user?.name}`,
          user_name: request.recycler?.name || 'Unknown',
          user_email: request.recycler?.email || 'Unknown',
          user_role: 'recycler',
          timestamp: request.request_date,
          details: {
            status: request.pickup_status,
            scrap_type: request.scrap_listing?.scrap_type,
            seller: request.scrap_listing?.user?.name
          }
        });
      });

      // Get recent transactions
      const { data: recentTransactions } = await supabase
        .from('transactions')
        .select(`
          *,
          seller:users!transactions_seller_id_fkey (name, email),
          recycler:users!transactions_recycler_id_fkey (name, email),
          scrap_listing:scrap_listings!transactions_scrap_id_fkey (scrap_type, weight)
        `)
        .order('transaction_date', { ascending: false })
        .limit(10);

      recentTransactions?.forEach(transaction => {
        activities.push({
          id: `transaction-${transaction.transaction_id}`,
          type: 'transaction_completed',
          description: `${transaction.recycler?.name} purchased ${transaction.scrap_listing?.scrap_type || 'scrap'} from ${transaction.seller?.name} for ₹${transaction.final_price}`,
          user_name: `${transaction.seller?.name} → ${transaction.recycler?.name}`,
          user_email: transaction.seller?.email || 'Unknown',
          user_role: 'transaction',
          timestamp: transaction.transaction_date,
          details: {
            amount: transaction.final_price,
            scrap_type: transaction.scrap_listing?.scrap_type,
            weight: transaction.scrap_listing?.weight
          }
        });
      });

      // Sort all activities by timestamp
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setSystemActivity(activities.slice(0, 20)); // Keep top 20 activities
    } catch (error) {
      console.error('Error fetching system activity:', error);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_registration': return <UserCheck className="h-4 w-4 text-blue-600" />;
      case 'listing_created': return <Package className="h-4 w-4 text-green-600" />;
      case 'pickup_request': return <Truck className="h-4 w-4 text-orange-600" />;
      case 'transaction_completed': return <DollarSign className="h-4 w-4 text-purple-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const sellers = filteredUsers.filter(user => user.role === 'seller');
  const recyclers = filteredUsers.filter(user => user.role === 'recycler');

  const filteredListings = listings.filter(listing => {
    const matchesSearch = listing.scrap_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         listing.user?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         listing.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Settings className="h-8 w-8 text-blue-600 mr-3" />
                SCRAP LINK - All System Activities
              </h1>
              <p className="text-gray-600 mt-2">
                Complete oversight of all user activities, listings, and system operations
              </p>
            </div>
            <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg">
              <span className="font-medium">Admin Access</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { key: 'overview', label: 'Activity Overview', icon: BarChart3 },
                { key: 'sellers', label: 'Seller Management', icon: Users },
                { key: 'recyclers', label: 'Recycler Management', icon: UserCheck },
                { key: 'listings', label: 'Scrap Listings Oversight', icon: Package },
                { key: 'transactions', label: 'Transaction History', icon: DollarSign },
                { key: 'requests', label: 'Pickup Activities', icon: Truck },
                { key: 'activity', label: 'Live System Feed', icon: Activity },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as any)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Search Bar for applicable tabs */}
        {(activeTab === 'sellers' || activeTab === 'recyclers' || activeTab === 'listings') && (
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {stats.totalSellers} sellers, {stats.totalRecyclers} recyclers
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Listings</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalListings}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {stats.activeListings} active
                    </p>
                  </div>
                  <Package className="h-8 w-8 text-green-600" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Transactions</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalTransactions}</p>
                    <p className="text-xs text-gray-500 mt-1">Completed deals</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">₹{stats.totalRevenue.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-1">Platform volume</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </div>

            {/* Activity Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Today's Activity</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center">
                      <UserCheck className="h-5 w-5 text-blue-600 mr-3" />
                      <span className="font-medium text-blue-900">New Registrations</span>
                    </div>
                    <span className="text-2xl font-bold text-blue-600">{stats.todayRegistrations}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                    <div className="flex items-center">
                      <AlertCircle className="h-5 w-5 text-orange-600 mr-3" />
                      <span className="font-medium text-orange-900">Pending Requests</span>
                    </div>
                    <span className="text-2xl font-bold text-orange-600">{stats.pendingRequests}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center">
                      <Package className="h-5 w-5 text-green-600 mr-3" />
                      <span className="font-medium text-green-900">Active Listings</span>
                    </div>
                    <span className="text-2xl font-bold text-green-600">{stats.activeListings}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">System Health</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Platform Status</span>
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      ✓ Online
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">This Week's Activity</span>
                    <span className="text-2xl font-bold text-purple-600">{stats.thisWeekActivity}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">User Engagement</span>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      High
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Sellers Tab */}
        {activeTab === 'sellers' && (
          <div className="bg-white rounded-xl shadow-md border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">All Sellers ({sellers.length})</h2>
              <p className="text-gray-600">Complete list of all registered sellers</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Seller Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact Information
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Registration Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sellers.map((seller) => (
                    <tr key={seller.user_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="bg-blue-100 p-2 rounded-full mr-3">
                            <Users className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{seller.name}</div>
                            <div className="text-sm text-gray-500">Seller</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{seller.email}</div>
                        <div className="text-sm text-gray-500">{seller.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {seller.latitude.toFixed(4)}, {seller.longitude.toFixed(4)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(seller.registered_at), 'MMM dd, yyyy')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recyclers Tab */}
        {activeTab === 'recyclers' && (
          <div className="bg-white rounded-xl shadow-md border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">All Recyclers ({recyclers.length})</h2>
              <p className="text-gray-600">Complete list of all registered recyclers</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recycler Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact Information
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Registration Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recyclers.map((recycler) => (
                    <tr key={recycler.user_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="bg-green-100 p-2 rounded-full mr-3">
                            <UserCheck className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{recycler.name}</div>
                            <div className="text-sm text-gray-500">Recycler</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{recycler.email}</div>
                        <div className="text-sm text-gray-500">{recycler.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {recycler.latitude.toFixed(4)}, {recycler.longitude.toFixed(4)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(recycler.registered_at), 'MMM dd, yyyy')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Listings Tab */}
        {activeTab === 'listings' && (
          <div className="bg-white rounded-xl shadow-md border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">All Scrap Listings ({filteredListings.length})</h2>
              <p className="text-gray-600">Complete list of all scrap listings by sellers</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Scrap Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Seller Information
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price & Weight
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Posted Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredListings.map((listing) => (
                    <tr key={listing.scrap_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {listing.scrap_type}
                          </div>
                          <div className="text-sm text-gray-500 max-w-xs truncate">
                            {listing.description}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {listing.user?.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {listing.user?.email}
                          </div>
                          <div className="text-sm text-gray-500">
                            {listing.user?.phone}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          ₹{listing.estimated_price.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {listing.weight} kg
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          listing.status === 'available'
                            ? 'bg-green-100 text-green-800'
                            : listing.status === 'accepted'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {listing.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(listing.posted_date), 'MMM dd, yyyy')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="bg-white rounded-xl shadow-md border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">All Transactions ({transactions.length})</h2>
              <p className="text-gray-600">Complete transaction history</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Seller
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recycler
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <tr key={transaction.transaction_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {transaction.scrap_listing?.scrap_type} Scrap
                          </div>
                          <div className="text-sm text-gray-500">
                            {transaction.scrap_listing?.weight} kg
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {transaction.seller?.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {transaction.seller?.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {transaction.recycler?.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {transaction.recycler?.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-green-600">
                          ₹{transaction.final_price.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(transaction.transaction_date), 'MMM dd, yyyy')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pickup Requests Tab */}
        {activeTab === 'requests' && (
          <div className="bg-white rounded-xl shadow-md border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">All Pickup Requests ({pickupRequests.length})</h2>
              <p className="text-gray-600">All recycler pickup requests</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Request Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Seller
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recycler
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Request Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pickupRequests.map((request) => (
                    <tr key={request.request_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {request.scrap_listing?.scrap_type} Scrap
                          </div>
                          <div className="text-sm text-gray-500">
                            {request.scrap_listing?.weight} kg - ₹{request.scrap_listing?.estimated_price}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {request.seller?.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {request.seller?.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {request.recycler?.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {request.recycler?.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          request.pickup_status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : request.pickup_status === 'accepted'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {request.pickup_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(request.request_date), 'MMM dd, yyyy')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* System Activity Tab */}
        {activeTab === 'activity' && (
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent System Activity</h2>
            <div className="space-y-4">
              {systemActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex-shrink-0 mt-1">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(activity.timestamp), 'MMM dd, HH:mm')}
                      </p>
                    </div>
                    <div className="mt-1">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">{activity.user_name}</span>
                        {activity.user_role !== 'transaction' && (
                          <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                            activity.user_role === 'seller' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {activity.user_role}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">{activity.user_email}</p>
                      {activity.details && (
                        <div className="mt-2 text-xs text-gray-500">
                          {activity.details.scrap_type && <span>Type: {activity.details.scrap_type} </span>}
                          {activity.details.weight && <span>Weight: {activity.details.weight}kg </span>}
                          {activity.details.amount && <span>Amount: ₹{activity.details.amount} </span>}
                          {activity.details.status && <span>Status: {activity.details.status}</span>}
                          {activity.details.seller && <span>Seller: {activity.details.seller}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}