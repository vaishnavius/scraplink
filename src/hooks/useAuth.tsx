// src/hooks/useAuth.tsx
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
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

type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  signUp: (
    email: string,
    password: string,
    userData: Omit<UserProfile, 'user_id' | 'registered_at'>
  ) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signInAsAdmin: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      if (mountedRef.current) setProfile(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  // Initialize session
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user ?? null;

        if (mountedRef.current) {
          setUser(currentUser);
          setIsAdmin(localStorage.getItem('isAdmin') === 'true');
          if (currentUser) fetchProfile(currentUser.id);
          else setLoading(false);
        }

        supabase.auth.onAuthStateChange((_event, session) => {
          const newUser = session?.user ?? null;
          if (mountedRef.current) {
            setUser(newUser);
            if (newUser) fetchProfile(newUser.id);
            else {
              setProfile(null);
              setIsAdmin(false);
              setLoading(false);
            }
          }
        });
      } catch (err) {
        console.error('Auth init error:', err);
        if (mountedRef.current) {
          setUser(null);
          setProfile(null);
          setIsAdmin(false);
          setLoading(false);
        }
      }
    };
    init();
  }, []);

  // --- Normal user sign-up ---
  const signUp = async (
    email: string,
    password: string,
    userData: Omit<UserProfile, 'user_id' | 'registered_at'>
  ) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    if (data.user) {
      const { error: profileError } = await supabase.from('users').insert({
        user_id: data.user.id,
        ...userData,
      });
      if (profileError) throw profileError;
    }

    return data;
  };

  // --- Normal user sign-in ---
  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  // --- Admin sign-in (real admin table) ---
  const signInAsAdmin = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_login', {
        email_input: email,
        password_input: password,
      });

      if (error || !data || data.length === 0) {
        throw new Error('Invalid admin credentials');
      }

      const admin = data[0];
      console.log('✅ Admin authenticated:', admin);

      // Persist admin login across refresh
      localStorage.setItem('isAdmin', 'true');
      localStorage.setItem('adminEmail', admin.email);

      if (mountedRef.current) {
        setUser({ id: admin.id, email: admin.email } as any);
        setProfile(null);
        setIsAdmin(true);
      }
    } catch (err) {
      console.error('Admin login failed:', err);
      localStorage.removeItem('isAdmin');
      localStorage.removeItem('adminEmail');
      throw err;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  // --- Sign-out (both admin and normal user) ---
  const signOut = async () => {
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('adminEmail');

    if (mountedRef.current) {
      setIsAdmin(false);
      setUser(null);
      setProfile(null);
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    loading,
    isAdmin,
    signUp,
    signIn,
    signInAsAdmin,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
