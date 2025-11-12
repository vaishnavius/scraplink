import React, { useState, useEffect } from 'react';
import { Users, Package, Search, Filter, Eye, MapPin, Phone, Mail, Calendar, DollarSign, User, UserCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { format } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';

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
  user?: {
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
  };
}

interface UserStats {
  totalUsers: number;
  totalSellers: number;
  totalRecyclers: number;
  todayRegistrations: number;
  thisWeekRegistrations: number;
}

interface ListingStats {
  totalListings: number;
  activeListings: number;
  completedListings: number;
  totalValue: number;
  averagePrice: number;
}

export function AdminActivitiesPage() {
  const { isAdmin } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [listings, setListings] = useState<ScrapListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'listings'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [userStats, setUserStats] = useState<UserStats>({
    totalUsers: 0,
    totalSellers: 0,
    totalRecyclers: 0,
    todayRegistrations: 0,
    thisWeekRegistrations: 0,
  });
  const [listingStats, setListingStats] = useState<ListingStats>({
    totalListings: 0,
    activeListings: 0,
    completedListings: 0,
    totalValue: 0,
    averagePrice: 0,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // initial fetch
    fetchAllData();

    // Refresh data every 30 seconds
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      await Promise.all([fetchUsers(), fetchListings()]);
    } catch (error: any) {
      console.error('Error fetching admin data (fetchAllData):', error);
      setErrorMessage(String(error?.message ?? error ?? 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      console.debug('[AdminActivities] fetching users...');
      const { data, error, status } = await supabase
        .from('users')
        .select('*')
        .order('registered_at', { ascending: false });

      console.debug('[AdminActivities] users response:', { status, data, error });

      if (error) {
        // surface error
        console.error('Error fetching users:', error);
        setUsers([]);
        setErrorMessage(`Users fetch error: ${error.message || error}`);
        return;
      }

      const usersData: User[] = (data ?? []) as User[];
      setUsers(usersData);

      // Calculate user statistics defensively
      const totalUsers = usersData.length;
      const totalSellers = usersData.filter(u => u.role === 'seller').length;
      const totalRecyclers = usersData.filter(u => u.role === 'recycler').length;

      const today = new Date().toISOString().split('T')[0];
      const todayRegistrations = usersData.filter(u => u.registered_at && u.registered_at.startsWith(today)).length;

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const thisWeekRegistrations = usersData.filter(u => {
        try {
          return u.registered_at ? new Date(u.registered_at) > weekAgo : false;
        } catch (_e) {
          return false;
        }
      }).length;

      setUserStats({
        totalUsers,
        totalSellers,
        totalRecyclers,
        todayRegistrations,
        thisWeekRegistrations,
      });

      // If admin and we got zero users unexpectedly, log a warning
      if (isAdmin && usersData.length === 0) {
        console.warn('[AdminActivities] Admin login but users table returned 0 rows — check RLS / permissions.');
        if (!errorMessage) {
          setErrorMessage('No users returned. If you are an admin, check your Supabase RLS/permissions or that you are logged in with a valid server/admin session.');
        }
      }
    } catch (err) {
      console.error('Unhandled error fetching users:', err);
      setUsers([]);
      setErrorMessage('Unhandled error fetching users. See console.');
    }
  };

  const fetchListings = async () => {
    try {
      console.debug('[AdminActivities] fetching listings...');

      // Try a few variants for the join name — many projects use different foreign key aliases.
      // First, attempt your original join alias. If that returns no user info, we'll try without join.
      const query = supabase
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

      const { data, error, status } = await query;
      console.debug('[AdminActivities] listings response (alias attempt):', { status, data, error });

      let listingsData: ScrapListing[] = (data ?? []) as ScrapListing[];

      // If join returned rows but user field missing, try fetching raw listings without join and merge users separately.
      const userFieldMissing = listingsData.length > 0 && listingsData.every(l => !l.user);
      if (userFieldMissing) {
        console.warn('[AdminActivities] join returned rows but user field missing. Retrying without join...');
        const { data: raw, error: rawErr } = await supabase
          .from('scrap_listings')
          .select('*')
          .order('posted_date', { ascending: false });

        if (rawErr) {
          console.error('Error fetching raw listings (no join):', rawErr);
          setListings([]);
          setErrorMessage(`Listings fetch error: ${rawErr.message || rawErr}`);
          return;
        }

        // Try to map each listing to a user by querying users by user_id (if listing stores user_id)
        // Defensive: listing may have 'user_id' or 'users_id' — try to detect field
        const rawListings = (raw ?? []) as any[];

        // Collect unique user_ids present in listings
        const userIds = Array.from(new Set(rawListings.map(r => r.user_id).filter(Boolean)));
        let usersById: Record<string, any> = {};
        if (userIds.length > 0) {
          const { data: usersData, error: usersErr } = await supabase.from('users').select('user_id,name,email,phone,role').in('user_id', userIds);
          if (!usersErr && usersData) {
            usersById = (usersData as any[]).reduce((acc, u) => {
              acc[u.user_id] = u;
              return acc;
            }, {} as Record<string, any>);
          } else {
            console.warn('[AdminActivities] could not fetch users by id to join with listings', usersErr);
          }
        }

        listingsData = rawListings.map((r: any) => ({
          scrap_id: r.scrap_id ?? r.id ?? r._id ?? (Math.random().toString(36).slice(2, 10)),
          scrap_type: r.scrap_type ?? r.type ?? 'Unknown',
          description: r.description ?? '',
          weight: Number(r.weight ?? 0),
          estimated_price: Number(r.estimated_price ?? 0),
          posted_date: r.posted_date ?? r.created_at ?? new Date().toISOString(),
          status: (r.status ?? 'available') as ScrapListing['status'],
          latitude: Number(r.latitude ?? 0),
          longitude: Number(r.longitude ?? 0),
          user: usersById[r.user_id] ? {
            name: usersById[r.user_id].name,
            email: usersById[r.user_id].email,
            phone: usersById[r.user_id].phone,
            role: usersById[r.user_id].role,
          } : undefined,
        }));
      } else {
        // Ensure numeric fields are numbers and defaults applied
        listingsData = listingsData.map((l: any) => ({
          ...l,
          estimated_price: Number(l.estimated_price ?? 0),
          weight: Number(l.weight ?? 0),
          latitude: Number(l.latitude ?? 0),
          longitude: Number(l.longitude ?? 0),
          posted_date: l.posted_date ?? l.created_at ?? new Date().toISOString(),
        }));
      }

      setListings(listingsData);

      // Calculate listing statistics defensively
      const totalListings = listingsData.length;
      const activeListings = listingsData.filter(l => l.status === 'available').length;
      const completedListings = listingsData.filter(l => l.status === 'completed').length;
      const totalValue = listingsData.reduce((sum, l) => sum + (Number(l.estimated_price) || 0), 0);
      const averagePrice = totalListings > 0 ? totalValue / totalListings : 0;

      setListingStats({
        totalListings,
        activeListings,
        completedListings,
        totalValue,
        averagePrice,
      });

      // If admin and zero listings unexpectedly, warn
      if (isAdmin && listingsData.length === 0) {
        console.warn('[AdminActivities] Admin login but listings table returned 0 rows — check RLS / permissions.');
        if (!errorMessage) {
          setErrorMessage('No listings returned. If you are an admin, check your Supabase RLS/permissions or that you are logged in with a valid server/admin session.');
        }
      }
    } catch (err) {
      console.error('Unhandled error fetching listings:', err);
      setListings([]);
      setErrorMessage('Unhandled error fetching listings. See console.');
    }
  };

  const filteredUsers = users.filter(user => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch = !q || user.name.toLowerCase().includes(q) || user.email.toLowerCase().includes(q) || user.phone.includes(q);
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredListings = listings.filter(listing => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (listing.scrap_type && listing.scrap_type.toLowerCase().includes(q)) ||
      (listing.user?.name && listing.user.name.toLowerCase().includes(q)) ||
      (listing.description && listing.description.toLowerCase().includes(q));
    const matchesStatus = statusFilter === 'all' || listing.status === statusFilter;
    return matchesSearch && matchesStatus;
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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Activities Dashboard</h1>
          <p className="text-xl text-gray-600">Complete oversight of user management and scrap listings</p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-md bg-red-50 border border-red-200 text-red-700">
            <strong>Warning:</strong> {errorMessage}
            <div className="text-sm mt-1">Open the console for detailed logs to debug Supabase responses and permissions.</div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('users')}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'users' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                <Users className="h-6 w-6 mr-2" />
                Detailed User Management
              </button>
              <button
                onClick={() => setActiveTab('listings')}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'listings' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                <Package className="h-6 w-6 mr-2" />
                Complete Scrap Listings Oversight
              </button>
            </nav>
          </div>
        </div>

        {/* (rest of UI unchanged) */}
        {/* ... the UI below is identical to what you provided so keep it as-is ... */}
        {/* For brevity I keep the same rendering code for Users and Listings sections as in your original file */}
        {/* Users Section */}
        {activeTab === 'users' && (
          <>
            {/* Statistics cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              {/* ...cards use userStats (unchanged) */}
              <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    <p className="text-3xl font-bold text-gray-900">{userStats.totalUsers}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Sellers</p>
                    <p className="text-3xl font-bold text-blue-600">{userStats.totalSellers}</p>
                  </div>
                  <User className="h-8 w-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Recyclers</p>
                    <p className="text-3xl font-bold text-green-600">{userStats.totalRecyclers}</p>
                  </div>
                  <UserCheck className="h-8 w-8 text-green-600" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Today</p>
                    <p className="text-3xl font-bold text-purple-600">{userStats.todayRegistrations}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-purple-600" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">This Week</p>
                    <p className="text-3xl font-bold text-orange-600">{userStats.thisWeekRegistrations}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-orange-600" />
                </div>
              </div>
            </div>

            {/* Search & Filters */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input type="text" placeholder="Search users by name, email, or phone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                </div>
                <div>
                  <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="all">All Roles</option>
                    <option value="seller">Sellers Only</option>
                    <option value="recycler">Recyclers Only</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-2xl font-semibold text-gray-900">All Users ({filteredUsers.length})</h2>
                <p className="text-gray-600">Complete user directory with detailed information</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User Details</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Information</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role & Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registration Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr key={user.user_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`p-2 rounded-full mr-3 ${user.role === 'seller' ? 'bg-blue-100' : 'bg-green-100'}`}>
                              {user.role === 'seller' ? <User className="h-5 w-5 text-blue-600" /> : <UserCheck className="h-5 w-5 text-green-600" />}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{user.name}</div>
                              <div className="text-sm text-gray-500">ID: {user.user_id?.slice(0, 8)}...</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="flex items-center text-sm text-gray-900"><Mail className="h-4 w-4 mr-2 text-gray-400" />{user.email}</div>
                            <div className="flex items-center text-sm text-gray-500"><Phone className="h-4 w-4 mr-2 text-gray-400" />{user.phone}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${user.role === 'seller' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-500"><MapPin className="h-4 w-4 mr-1" />{(user.latitude ?? 0).toFixed(4)}, {(user.longitude ?? 0).toFixed(4)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.registered_at ? format(new Date(user.registered_at), 'MMM dd, yyyy HH:mm') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Listings Section */}
        {activeTab === 'listings' && (
          <>
            {/* Listing stats (unchanged) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Listings</p>
                    <p className="text-3xl font-bold text-gray-900">{listingStats.totalListings}</p>
                  </div>
                  <Package className="h-8 w-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active</p>
                    <p className="text-3xl font-bold text-green-600">{listingStats.activeListings}</p>
                  </div>
                  <Eye className="h-8 w-8 text-green-600" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Completed</p>
                    <p className="text-3xl font-bold text-purple-600">{listingStats.completedListings}</p>
                  </div>
                  <Package className="h-8 w-8 text-purple-600" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Value</p>
                    <p className="text-3xl font-bold text-orange-600">₹{listingStats.totalValue.toFixed(0)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-orange-600" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg Price</p>
                    <p className="text-3xl font-bold text-red-600">₹{listingStats.averagePrice.toFixed(0)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-red-600" />
                </div>
              </div>
            </div>

            {/* Search & Filters for listings */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input type="text" placeholder="Search listings by type, seller name, or description..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                </div>
                <div>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="all">All Status</option>
                    <option value="available">Available</option>
                    <option value="accepted">Accepted</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Listings Table */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-2xl font-semibold text-gray-900">All Scrap Listings ({filteredListings.length})</h2>
                <p className="text-gray-600">Complete oversight of all scrap listings with seller details</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scrap Details</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seller Information</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price & Weight</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Posted Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredListings.map((listing) => (
                      <tr key={listing.scrap_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{listing.scrap_type}</div>
                            <div className="text-sm text-gray-500 max-w-xs truncate">{listing.description}</div>
                            <div className="text-xs text-gray-400 mt-1">ID: {String(listing.scrap_id).slice(0, 8)}...</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-gray-900">{listing.user?.name ?? '—'}</div>
                            <div className="flex items-center text-sm text-gray-500"><Mail className="h-3 w-3 mr-1" />{listing.user?.email ?? '—'}</div>
                            <div className="flex items-center text-sm text-gray-500"><Phone className="h-3 w-3 mr-1" />{listing.user?.phone ?? '—'}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-green-600">₹{(Number(listing.estimated_price) || 0).toFixed(2)}</div>
                            <div className="text-sm text-gray-500">{(Number(listing.weight) || 0)} kg</div>
                            <div className="text-xs text-gray-400">₹{((Number(listing.estimated_price) || 0) / Math.max(Number(listing.weight) || 0, 1)).toFixed(2)}/kg</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${listing.status === 'available' ? 'bg-green-100 text-green-800' : listing.status === 'accepted' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>{listing.status}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-500"><MapPin className="h-4 w-4 mr-1" /><div><div>{(Number(listing.latitude) || 0).toFixed(4)}</div><div>{(Number(listing.longitude) || 0).toFixed(4)}</div></div></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{listing.posted_date ? format(new Date(listing.posted_date), 'MMM dd, yyyy HH:mm') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
