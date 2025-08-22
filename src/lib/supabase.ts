import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project-ref.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key-here';

// Validate environment variables
if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('⚠️ Supabase environment variables are not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          user_id: string;
          name: string;
          email: string;
          phone: string;
          role: 'seller' | 'recycler';
          latitude: number;
          longitude: number;
          registered_at: string;
        };
        Insert: {
          user_id?: string;
          name: string;
          email: string;
          phone: string;
          role: 'seller' | 'recycler';
          latitude: number;
          longitude: number;
          registered_at?: string;
        };
        Update: {
          user_id?: string;
          name?: string;
          email?: string;
          phone?: string;
          role?: 'seller' | 'recycler';
          latitude?: number;
          longitude?: number;
          registered_at?: string;
        };
      };
      scrap_listings: {
        Row: {
          scrap_id: string;
          user_id: string;
          scrap_type: string;
          description: string;
          weight: number;
          estimated_price: number;
          posted_date: string;
          status: 'available' | 'accepted' | 'completed';
          latitude: number;
          longitude: number;
        };
        Insert: {
          scrap_id?: string;
          user_id: string;
          scrap_type: string;
          description: string;
          weight: number;
          estimated_price: number;
          posted_date?: string;
          status?: 'available' | 'accepted' | 'completed';
          latitude: number;
          longitude: number;
        };
        Update: {
          scrap_id?: string;
          user_id?: string;
          scrap_type?: string;
          description?: string;
          weight?: number;
          estimated_price?: number;
          posted_date?: string;
          status?: 'available' | 'accepted' | 'completed';
          latitude?: number;
          longitude?: number;
        };
      };
      pickup_requests: {
        Row: {
          request_id: string;
          scrap_id: string;
          recycler_id: string;
          request_date: string;
          pickup_status: 'pending' | 'accepted' | 'completed';
        };
        Insert: {
          request_id?: string;
          scrap_id: string;
          recycler_id: string;
          request_date?: string;
          pickup_status?: 'pending' | 'accepted' | 'completed';
        };
        Update: {
          request_id?: string;
          scrap_id?: string;
          recycler_id?: string;
          request_date?: string;
          pickup_status?: 'pending' | 'accepted' | 'completed';
        };
      };
      transactions: {
        Row: {
          transaction_id: string;
          scrap_id: string;
          seller_id: string;
          recycler_id: string;
          final_price: number;
          transaction_date: string;
          status: 'completed' | 'cancelled';
        };
        Insert: {
          transaction_id?: string;
          scrap_id: string;
          seller_id: string;
          recycler_id: string;
          final_price: number;
          transaction_date?: string;
          status?: 'completed' | 'cancelled';
        };
        Update: {
          transaction_id?: string;
          scrap_id?: string;
          seller_id?: string;
          recycler_id?: string;
          final_price?: number;
          transaction_date?: string;
          status?: 'completed' | 'cancelled';
        };
      };
      feedback: {
        Row: {
          feedback_id: string;
          from_user_id: string;
          to_user_id: string;
          rating: number;
          comments: string;
          feedback_date: string;
        };
        Insert: {
          feedback_id?: string;
          from_user_id: string;
          to_user_id: string;
          rating: number;
          comments: string;
          feedback_date?: string;
        };
        Update: {
          feedback_id?: string;
          from_user_id?: string;
          to_user_id?: string;
          rating?: number;
          comments?: string;
          feedback_date?: string;
        };
      };
    };
  };
};