import React, { useState, useEffect } from 'react';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Calendar, User } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/UI/LoadingSpinner';
import { format } from 'date-fns';

interface Transaction {
  transaction_id: string;
  scrap_id: string;
  seller_id: string;
  recycler_id: string;
  final_price: number;
  transaction_date: string;
  status: 'completed' | 'cancelled';
  // Additional fields from joins
  scrap_type?: string;
  weight?: number;
  seller_name?: string;
  recycler_name?: string;
}

export function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'cancelled'>('all');
  const { profile } = useAuth();

  useEffect(() => {
    fetchTransactions();
  }, [profile]);

  // Add interval to refresh transactions periodically
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTransactions();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Listen for transaction completion events
  useEffect(() => {
    const handleTransactionCompleted = () => {
      fetchTransactions();
    };

    window.addEventListener('transactionCompleted', handleTransactionCompleted);
    return () => {
      window.removeEventListener('transactionCompleted', handleTransactionCompleted);
    };
  }, []);

  const fetchTransactions = async () => {
    if (!profile) return;

    try {
      // Get transactions where user is either seller or recycler
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          scrap_listings!inner (scrap_type, weight),
          seller:users!transactions_seller_id_fkey (name, user_id),
          recycler:users!transactions_recycler_id_fkey (name, user_id)
        `)
        .or(`seller_id.eq.${profile.user_id},recycler_id.eq.${profile.user_id}`)
        .order('transaction_date', { ascending: false });

      if (error) throw error;

      // Format the data
      const formattedTransactions = (data || []).map(transaction => ({
        ...transaction,
        scrap_type: transaction.scrap_listings?.scrap_type,
        weight: transaction.scrap_listings?.weight,
        seller_name: transaction.seller?.name,
        recycler_name: transaction.recycler?.name,
      }));

      setTransactions(formattedTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (filter === 'all') return true;
    return transaction.status === filter;
  });

  const getTotalAmount = () => {
    return filteredTransactions.reduce((sum, transaction) => {
      if (transaction.status === 'completed') {
        return sum + transaction.final_price;
      }
      return sum;
    }, 0);
  };

  const getTotalByType = (type: 'income' | 'expense') => {
    return filteredTransactions.reduce((sum, transaction) => {
      if (transaction.status === 'completed') {
        const isIncome = profile?.role === 'seller' ? 
          transaction.seller_id === profile?.user_id : 
          transaction.recycler_id === profile?.user_id;
        if ((type === 'income' && isIncome) || (type === 'expense' && !isIncome)) {
          return sum + transaction.final_price;
        }
      }
      return sum;
    }, 0);
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
          <h1 className="text-3xl font-bold text-gray-900">Transaction History</h1>
          <p className="text-gray-600 mt-2">
            Track your scrap trading transactions and earnings
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Volume</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₹{getTotalAmount().toFixed(2)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {profile?.role === 'seller' ? 'Income' : 'Purchases'}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  ₹{getTotalByType('income').toFixed(2)}
                </p>
              </div>
              <ArrowUpRight className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Transactions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredTransactions.filter(t => t.status === 'completed').length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex space-x-1">
            {[
              { key: 'all', label: 'All' },
              { key: 'completed', label: 'Completed' },
              { key: 'cancelled', label: 'Cancelled' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === key
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
              <p className="text-gray-600">
                Start trading to see your transaction history here
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Parties
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTransactions.map((transaction) => {
                    const isSellerTransaction = profile?.role === 'seller' ? 
                      transaction.seller_id === profile?.user_id : 
                      false;
                    const isRecyclerTransaction = profile?.role === 'recycler' ? 
                      transaction.recycler_id === profile?.user_id : 
                      false;
                    
                    return (
                      <tr key={transaction.transaction_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {transaction.scrap_type} Scrap
                            </div>
                            <div className="text-sm text-gray-500">
                              {transaction.weight} kg
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <User className="h-4 w-4 text-gray-400 mr-2" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {isSellerTransaction ? transaction.recycler_name : 
                                 isRecyclerTransaction ? transaction.seller_name : 
                                 'Unknown'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {isSellerTransaction ? 'Buyer' : 
                                 isRecyclerTransaction ? 'Seller' : 
                                 'Unknown'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {isSellerTransaction || isRecyclerTransaction ? (
                              <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                            )}
                            <span className={`text-sm font-medium ${
                              isSellerTransaction || isRecyclerTransaction ? 'text-green-600' : 'text-red-600'
                            }`}>
                              ₹{transaction.final_price.toFixed(2)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {format(new Date(transaction.transaction_date), 'MMM dd, yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            transaction.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {transaction.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}