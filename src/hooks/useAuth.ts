import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export interface UserProfile {
  user_id: string;
  name: string;
  email: string;
  phone: string;
  role: 'seller' | 'recycler';
  latitude: number;
  longitude: number;
  registered_at: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, userData: Omit<UserProfile, 'user_id' | 'registered_at'>) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    if (data.user) {
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          user_id: data.user.id,
          ...userData,
        });

      if (profileError) throw profileError;
    }

    return data;
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  };

  const signInAsAdmin = (email: string, password: string) => {
    return new Promise<void>((resolve, reject) => {
      // Mock admin authentication
      const adminEmail = email.trim().toLowerCase();
      if (adminEmail === 'admin@scraplink.com' && password === 'admin123') {
        setLoading(true);
        
        // Simulate async operation
        setTimeout(() => {
          setIsAdmin(true);
          setUser({ 
            id: 'admin-user', 
            email: 'admin@scraplink.com',
            user_metadata: { role: 'admin' },
            app_metadata: { role: 'admin' }
          } as any);
          setProfile(null); // Admin doesn't have a regular profile
          setLoading(false);
          resolve();
        }, 500);
      } else {
        setLoading(false);
        reject(new Error('Invalid admin credentials'));
      }
    });
  };

  const signOut = async () => {
    setIsAdmin(false);
    setUser(null);
    setProfile(null);
    
    if (!isAdmin) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }
  };

  return {
    user,
    profile,
    loading,
    isAdmin,
    signUp,
    signIn,
    signInAsAdmin,
    signOut,
  };
}