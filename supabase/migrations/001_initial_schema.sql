-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Industries table
CREATE TABLE industries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  default_modules JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Companies table (tenants)
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  industry_id UUID REFERENCES industries(id),
  region VARCHAR(50) DEFAULT 'za',
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table (customer users)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, email)
);

-- Modules table
CREATE TABLE modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Company modules (enabled/disabled per company)
CREATE TABLE company_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, module_id)
);

-- Create indexes
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_companies_slug ON companies(slug);
CREATE INDEX idx_companies_industry_id ON companies(industry_id);
CREATE INDEX idx_company_modules_company_id ON company_modules(company_id);
CREATE INDEX idx_company_modules_module_id ON company_modules(module_id);

-- Insert default industries (as many realistic industries as possible)
INSERT INTO industries (name, display_name, description, default_modules) VALUES
  ('restaurant', 'Restaurant & Food Service', 'Restaurants, cafés, QSR, cloud kitchens', '["tasks", "staff", "scheduling", "inventory"]'),
  ('retail', 'Retail & Stores', 'Retail stores, shops, malls', '["tasks", "staff", "scheduling", "inventory", "sales"]'),
  ('property', 'Property Management', 'Real estate and property management', '["tasks", "staff", "scheduling", "maintenance"]'),
  ('construction', 'Construction', 'Construction and building services', '["tasks", "staff", "scheduling", "projects", "equipment"]'),
  ('hospitality', 'Hospitality', 'Hotels, resorts, and accommodation', '["tasks", "staff", "scheduling", "housekeeping"]'),
  ('healthcare', 'Healthcare', 'Medical and healthcare facilities', '["tasks", "staff", "scheduling", "patients"]'),
  ('logistics', 'Logistics & Transportation', 'Transportation and logistics', '["tasks", "staff", "scheduling", "deliveries", "fleet"]'),
  ('manufacturing', 'Manufacturing', 'Manufacturing and production', '["tasks", "staff", "scheduling", "production", "quality"]'),
  ('education', 'Education', 'Schools and educational institutions', '["tasks", "staff", "scheduling", "classes"]'),
  ('security', 'Security Services', 'Security services and patrol', '["tasks", "staff", "scheduling", "incidents", "patrol"]'),
  ('cleaning', 'Cleaning & Facilities', 'Cleaning and facilities management', '["tasks", "staff", "scheduling", "maintenance"]'),
  ('agriculture', 'Agriculture & Farming', 'Farming and agriculture', '["tasks", "staff", "scheduling", "crops", "equipment"]'),
  ('events', 'Events & Entertainment', 'Event planning and venues', '["tasks", "staff", "scheduling", "events"]'),
  ('warehousing', 'Warehousing', 'Warehouse and inventory management', '["tasks", "staff", "scheduling", "inventory", "deliveries"]'),
  ('field_services', 'Field Services', 'Plumbing, electrical, HVAC, repairs', '["tasks", "staff", "scheduling", "maintenance", "equipment"]'),
  ('salon_spa', 'Salon & Spa', 'Beauty salons, spas, wellness', '["tasks", "staff", "scheduling", "appointments"]'),
  ('gym_fitness', 'Gym & Fitness', 'Gyms, fitness centers', '["tasks", "staff", "scheduling", "classes", "members"]'),
  ('automotive', 'Automotive Services', 'Auto workshops, car washes', '["tasks", "staff", "scheduling", "maintenance", "equipment"]'),
  ('real_estate', 'Real Estate Agency', 'Real estate sales and agencies', '["tasks", "staff", "scheduling", "properties", "clients"]'),
  ('franchise', 'Franchise Operations', 'Multi-location franchise brands', '["tasks", "staff", "scheduling", "inventory", "reports"]'),
  ('professional_services', 'Professional Services', 'Offices, agencies, consultancies', '["tasks", "staff", "scheduling", "projects", "clients"]'),
  ('government', 'Government & Municipal', 'Government and municipal services', '["tasks", "staff", "scheduling", "maintenance", "incidents"]'),
  ('nonprofit', 'Nonprofit', 'Nonprofit organizations', '["tasks", "staff", "scheduling", "events", "volunteers"]'),
  ('veterinary', 'Veterinary Services', 'Veterinary clinics and animal care', '["tasks", "staff", "scheduling", "patients", "appointments"]'),
  ('pharmacy', 'Pharmacy', 'Pharmacies and medical dispensaries', '["tasks", "staff", "scheduling", "inventory", "patients"]'),
  ('dental', 'Dental Practices', 'Dental clinics and practices', '["tasks", "staff", "scheduling", "patients", "appointments"]'),
  ('childcare', 'Childcare & Daycare', 'Childcare centers and daycares', '["tasks", "staff", "scheduling", "children", "parents"]'),
  ('catering', 'Catering Services', 'Catering and food delivery', '["tasks", "staff", "scheduling", "events", "inventory"]'),
  ('laundry', 'Laundry & Dry Cleaning', 'Laundry and dry cleaning services', '["tasks", "staff", "scheduling", "orders", "equipment"]'),
  ('printing', 'Printing Services', 'Printing and signage', '["tasks", "staff", "scheduling", "orders", "production"]');

-- Insert default modules
INSERT INTO modules (name, display_name, description, category) VALUES
  ('tasks', 'Tasks', 'Task management and assignment', 'core'),
  ('staff', 'Staff Management', 'Employee management and profiles', 'core'),
  ('scheduling', 'Scheduling', 'Work schedules and shifts', 'core'),
  ('inventory', 'Inventory', 'Inventory tracking and management', 'operations'),
  ('sales', 'Sales', 'Sales tracking and reporting', 'operations'),
  ('maintenance', 'Maintenance', 'Maintenance requests and tracking', 'operations'),
  ('projects', 'Projects', 'Project management', 'operations'),
  ('equipment', 'Equipment', 'Equipment tracking and management', 'operations'),
  ('housekeeping', 'Housekeeping', 'Housekeeping operations', 'operations'),
  ('patients', 'Patients', 'Patient management', 'operations'),
  ('deliveries', 'Deliveries', 'Delivery tracking', 'operations'),
  ('fleet', 'Fleet Management', 'Vehicle fleet management', 'operations'),
  ('production', 'Production', 'Production tracking', 'operations'),
  ('quality', 'Quality Control', 'Quality assurance and control', 'operations'),
  ('classes', 'Classes', 'Class scheduling and management', 'operations'),
  ('incidents', 'Incidents', 'Incident reporting and tracking', 'operations'),
  ('patrol', 'Patrol', 'Patrol routes and logging', 'operations'),
  ('crops', 'Crops', 'Crop management', 'operations'),
  ('events', 'Events', 'Event management', 'operations'),
  ('appointments', 'Appointments', 'Appointment scheduling', 'operations'),
  ('members', 'Members', 'Membership management', 'operations'),
  ('properties', 'Properties', 'Property listings and management', 'operations'),
  ('clients', 'Clients', 'Client relationship management', 'operations'),
  ('volunteers', 'Volunteers', 'Volunteer coordination', 'operations'),
  ('children', 'Children', 'Child enrollment and tracking', 'operations'),
  ('parents', 'Parents', 'Parent communication and tracking', 'operations'),
  ('orders', 'Orders', 'Order processing and tracking', 'operations'),
  ('reports', 'Reports', 'Reporting and analytics', 'analytics'),
  ('notifications', 'Notifications', 'Notification system', 'system');
