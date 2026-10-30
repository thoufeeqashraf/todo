-- Modules that sit behind company toggles. They stay off until a company enables them.
INSERT INTO modules (name, display_name, description, category) VALUES
  ('staff_health', 'Staff health', 'Rules-based score for managers. Provisional weights, not an AI model.', 'operations'),
  ('geofence_attendance', 'Geofence attendance', 'Clock-in inside a company geofence, with travel-day exceptions.', 'operations'),
  ('find_my_staff', 'Find My Staff', 'Latest consented coordinates for authorised seniors. No map tiles.', 'operations'),
  ('wallet', 'Wallet', 'Internal ledger. Transaction Junction top-up is a stub and does not move money.', 'operations'),
  ('mini_apps', 'Mini-apps', 'Marketplace shell. No partner APIs are connected.', 'system'),
  ('pos', 'POS orders', 'Table orders. Payment capture is a stub and leaves orders unpaid.', 'operations'),
  ('cctv', 'CCTV registry', 'Camera names and sites. Live streams are not connected.', 'system')
ON CONFLICT (name) DO NOTHING;

UPDATE industries
SET default_modules = default_modules || '["notifications","reports"]'::jsonb
WHERE NOT (default_modules ? 'notifications');

CREATE TABLE api_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'open',
  location_label VARCHAR(255),
  reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE staff_health_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind VARCHAR(50) NOT NULL CHECK (kind IN ('miss', 'late', 'proof_rejected', 'complete')),
  note TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE geofences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius_meters INTEGER NOT NULL CHECK (radius_meters > 0),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE travel_exceptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  reason TEXT,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (company_id, user_id, work_date)
);

CREATE TABLE wallet_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  currency VARCHAR(3) NOT NULL DEFAULT 'ZAR',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (company_id, user_id)
);

CREATE TABLE wallet_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES wallet_accounts(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('credit', 'debit')),
  source VARCHAR(50) NOT NULL,
  memo TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE staff_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  consent BOOLEAN NOT NULL,
  source VARCHAR(50) NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE cameras (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  site_label VARCHAR(255),
  provider VARCHAR(50) NOT NULL DEFAULT 'unconfigured',
  external_ref TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE pos_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  table_label VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'open',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  payment_status VARCHAR(50) NOT NULL DEFAULT 'unpaid',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE mini_apps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'not_connected',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_api_tokens_hash ON api_tokens(token_hash);
CREATE INDEX idx_api_tokens_company ON api_tokens(company_id);
CREATE INDEX idx_incidents_company ON incidents(company_id);
CREATE INDEX idx_staff_health_company ON staff_health_events(company_id);
CREATE INDEX idx_geofences_company ON geofences(company_id);
CREATE INDEX idx_wallet_entries_account ON wallet_entries(account_id);
CREATE INDEX idx_staff_locations_company ON staff_locations(company_id, recorded_at);
CREATE INDEX idx_pos_orders_company ON pos_orders(company_id);
CREATE INDEX idx_cameras_company ON cameras(company_id);
