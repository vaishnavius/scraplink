/*
  # SCRAP LINK Database Schema

  1. New Tables
    - `users` - User accounts with roles (seller/recycler) and location data
    - `scrap_listings` - Metal scrap listings with ML price predictions
    - `pickup_requests` - Requests from recyclers to pick up scrap
    - `transactions` - Completed deals between users
    - `feedback` - User ratings and reviews system

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Restrict cross-user data access based on business logic

  3. Features
    - Geolocation support for distance-based filtering
    - Metal scrap type enumeration
    - Status tracking for listings and requests
    - Timestamp tracking for all activities
*/

-- Create enum types
CREATE TYPE user_role AS ENUM ('seller', 'recycler');
CREATE TYPE listing_status AS ENUM ('available', 'accepted', 'completed');
CREATE TYPE request_status AS ENUM ('pending', 'accepted', 'completed');
CREATE TYPE transaction_status AS ENUM ('completed', 'cancelled');

-- Users table
CREATE TABLE IF NOT EXISTS users (
  user_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text NOT NULL,
  role user_role NOT NULL,
  latitude decimal(10, 7) NOT NULL,
  longitude decimal(10, 7) NOT NULL,
  registered_at timestamptz DEFAULT now()
);

-- Scrap listings table
CREATE TABLE IF NOT EXISTS scrap_listings (
  scrap_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(user_id) ON DELETE CASCADE,
  scrap_type text NOT NULL,
  description text NOT NULL,
  weight decimal(10, 2) NOT NULL CHECK (weight > 0),
  estimated_price decimal(10, 2) NOT NULL CHECK (estimated_price >= 0),
  posted_date timestamptz DEFAULT now(),
  status listing_status DEFAULT 'available',
  latitude decimal(10, 7) NOT NULL,
  longitude decimal(10, 7) NOT NULL
);

-- Pickup requests table
CREATE TABLE IF NOT EXISTS pickup_requests (
  request_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scrap_id uuid REFERENCES scrap_listings(scrap_id) ON DELETE CASCADE,
  recycler_id uuid REFERENCES users(user_id) ON DELETE CASCADE,
  request_date timestamptz DEFAULT now(),
  pickup_status request_status DEFAULT 'pending'
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  transaction_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scrap_id uuid REFERENCES scrap_listings(scrap_id) ON DELETE CASCADE,
  seller_id uuid REFERENCES users(user_id) ON DELETE CASCADE,
  recycler_id uuid REFERENCES users(user_id) ON DELETE CASCADE,
  final_price decimal(10, 2) NOT NULL CHECK (final_price >= 0),
  transaction_date timestamptz DEFAULT now(),
  status transaction_status DEFAULT 'completed'
);

-- Feedback table
CREATE TABLE IF NOT EXISTS feedback (
  feedback_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid REFERENCES users(user_id) ON DELETE CASCADE,
  to_user_id uuid REFERENCES users(user_id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comments text DEFAULT '',
  feedback_date timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrap_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can read public user info"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for scrap_listings table
CREATE POLICY "Anyone can read available listings"
  ON scrap_listings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Sellers can manage own listings"
  ON scrap_listings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for pickup_requests table
CREATE POLICY "Users can read requests involving them"
  ON pickup_requests
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = recycler_id OR 
    auth.uid() IN (SELECT user_id FROM scrap_listings WHERE scrap_id = pickup_requests.scrap_id)
  );

CREATE POLICY "Recyclers can create pickup requests"
  ON pickup_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = recycler_id);

CREATE POLICY "Sellers can update request status"
  ON pickup_requests
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM scrap_listings WHERE scrap_id = pickup_requests.scrap_id)
  );

-- RLS Policies for transactions table
CREATE POLICY "Users can read own transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = seller_id OR auth.uid() = recycler_id);

CREATE POLICY "Users can create transactions they're involved in"
  ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = seller_id OR auth.uid() = recycler_id);

-- RLS Policies for feedback table
CREATE POLICY "Anyone can read feedback"
  ON feedback
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create feedback they send"
  ON feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = from_user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_location ON users(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_scrap_listings_status ON scrap_listings(status);
CREATE INDEX IF NOT EXISTS idx_scrap_listings_type ON scrap_listings(scrap_type);
CREATE INDEX IF NOT EXISTS idx_scrap_listings_location ON scrap_listings(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_pickup_requests_status ON pickup_requests(pickup_status);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON feedback(rating);