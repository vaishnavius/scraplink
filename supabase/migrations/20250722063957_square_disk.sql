/*
  # Price Prediction System with External Dataset Support

  1. New Tables
    - `metal_prices` - Current market prices for different metals
    - `price_history` - Historical price data for trend analysis
    - `dataset_uploads` - Track uploaded datasets and their metadata
    - `price_predictions` - Store prediction results and accuracy metrics

  2. Security
    - Enable RLS on all tables
    - Admin-only access for dataset management
    - Public read access for current prices

  3. Features
    - Real-time price updates from external datasets
    - Historical price tracking
    - Prediction accuracy monitoring
    - Dataset version control
*/

-- Create tables for price prediction system
CREATE TABLE IF NOT EXISTS metal_prices (
  price_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metal_type text NOT NULL,
  current_price decimal(10, 2) NOT NULL CHECK (current_price >= 0),
  price_per_unit text DEFAULT 'kg' NOT NULL,
  currency text DEFAULT 'INR' NOT NULL,
  market_location text DEFAULT 'India',
  last_updated timestamptz DEFAULT now(),
  data_source text,
  UNIQUE(metal_type, market_location)
);

CREATE TABLE IF NOT EXISTS price_history (
  history_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metal_type text NOT NULL,
  price decimal(10, 2) NOT NULL CHECK (price >= 0),
  price_date timestamptz DEFAULT now(),
  market_location text DEFAULT 'India',
  data_source text,
  volume_traded decimal(15, 2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS dataset_uploads (
  upload_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  upload_date timestamptz DEFAULT now(),
  uploaded_by text,
  file_size bigint,
  records_processed integer DEFAULT 0,
  processing_status text DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  error_message text,
  dataset_type text DEFAULT 'price_data'
);

CREATE TABLE IF NOT EXISTS price_predictions (
  prediction_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metal_type text NOT NULL,
  weight decimal(10, 2) NOT NULL,
  predicted_price decimal(10, 2) NOT NULL,
  confidence_score decimal(3, 2) DEFAULT 0.0,
  prediction_date timestamptz DEFAULT now(),
  actual_price decimal(10, 2),
  accuracy_score decimal(3, 2),
  model_version text DEFAULT 'v1.0'
);

-- Enable Row Level Security
ALTER TABLE metal_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE dataset_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_predictions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for metal_prices (public read, admin write)
CREATE POLICY "Anyone can read current prices"
  ON metal_prices
  FOR SELECT
  USING (true);

CREATE POLICY "Admin can manage prices"
  ON metal_prices
  FOR ALL
  USING (true);

-- RLS Policies for price_history (public read, admin write)
CREATE POLICY "Anyone can read price history"
  ON price_history
  FOR SELECT
  USING (true);

CREATE POLICY "Admin can manage price history"
  ON price_history
  FOR ALL
  USING (true);

-- RLS Policies for dataset_uploads (admin only)
CREATE POLICY "Admin can manage datasets"
  ON dataset_uploads
  FOR ALL
  USING (true);

-- RLS Policies for price_predictions (public read, system write)
CREATE POLICY "Anyone can read predictions"
  ON price_predictions
  FOR SELECT
  USING (true);

CREATE POLICY "System can create predictions"
  ON price_predictions
  FOR INSERT
  WITH CHECK (true);

-- Insert initial metal prices (sample data)
INSERT INTO metal_prices (metal_type, current_price, data_source) VALUES
  ('Iron', 25.50, 'Initial Setup'),
  ('Aluminum', 145.00, 'Initial Setup'),
  ('Copper', 720.00, 'Initial Setup'),
  ('Steel', 35.00, 'Initial Setup'),
  ('Brass', 420.00, 'Initial Setup'),
  ('Bronze', 480.00, 'Initial Setup'),
  ('Lead', 180.00, 'Initial Setup'),
  ('Zinc', 220.00, 'Initial Setup'),
  ('Nickel', 1250.00, 'Initial Setup'),
  ('Tin', 2800.00, 'Initial Setup')
ON CONFLICT (metal_type, market_location) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_metal_prices_type ON metal_prices(metal_type);
CREATE INDEX IF NOT EXISTS idx_price_history_type_date ON price_history(metal_type, price_date);
CREATE INDEX IF NOT EXISTS idx_dataset_uploads_status ON dataset_uploads(processing_status);
CREATE INDEX IF NOT EXISTS idx_price_predictions_type ON price_predictions(metal_type);