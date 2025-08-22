/*
  # Fix User Registration RLS Policy

  1. Security Updates
    - Allow user registration by enabling INSERT for new users
    - Fix RLS policies to support user signup flow
    - Maintain security for existing operations

  2. Changes
    - Add policy for user registration (INSERT)
    - Update existing policies for better compatibility
    - Ensure authenticated users can create their profiles
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Anyone can read public user info" ON users;

-- Create new policies that allow user registration
CREATE POLICY "Enable insert for user registration"
  ON users
  FOR INSERT
  WITH CHECK (true);

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

CREATE POLICY "Users can read public user data"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- Also fix scrap_listings policies to allow INSERT
DROP POLICY IF EXISTS "Sellers can manage own listings" ON scrap_listings;

CREATE POLICY "Users can insert their own listings"
  ON scrap_listings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own listings"
  ON scrap_listings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own listings"
  ON scrap_listings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can read available listings"
  ON scrap_listings
  FOR SELECT
  TO authenticated
  USING (true);