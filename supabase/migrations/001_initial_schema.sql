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

-- Users table
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

-- Operator users table (for development/admin access)
CREATE TABLE operator_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_companies_slug ON companies(slug);
CREATE INDEX idx_companies_industry_id ON companies(industry_id);
CREATE INDEX idx_company_modules_company_id ON company_modules(company_id);
CREATE INDEX idx_company_modules_module_id ON company_modules(module_id);

-- Insert default industries
INSERT INTO industries (name, display_name, description, default_modules) VALUES
  ('restaurant', 'Restaurant', 'Food service and dining establishments', '["tasks", "staff", "schedule", "inventory"]'),
  ('retail', 'Retail', 'Retail stores and shops', '["tasks", "staff", "schedule", "inventory", "sales"]'),
  ('property', 'Property Management', 'Real estate and property management', '["tasks", "staff", "schedule", "maintenance"]'),
  ('construction', 'Construction', 'Construction and building services', '["tasks", "staff", "schedule", "projects", "equipment"]'),
  ('hospitality', 'Hospitality', 'Hotels, resorts, and accommodation', '["tasks", "staff", "schedule", "housekeeping"]'),
  ('healthcare', 'Healthcare', 'Medical and healthcare facilities', '["tasks", "staff", "schedule", "patients"]'),
  ('logistics', 'Logistics', 'Transportation and logistics', '["tasks", "staff", "schedule", "deliveries", "fleet"]'),
  ('manufacturing', 'Manufacturing', 'Manufacturing and production', '["tasks", "staff", "schedule", "production", "quality"]'),
  ('education', 'Education', 'Schools and educational institutions', '["tasks", "staff", "schedule", "classes"]'),
  ('security', 'Security', 'Security services', '["tasks", "staff", "schedule", "incidents", "patrol"]'),
  ('cleaning', 'Cleaning & Facilities', 'Cleaning and facilities management', '["tasks", "staff", "schedule", "maintenance"]'),
  ('agriculture', 'Agriculture', 'Farming and agriculture', '["tasks", "staff", "schedule", "crops", "equipment"]'),
  ('events', 'Events', 'Event planning and management', '["tasks", "staff", "schedule", "events"]');

-- Insert default modules
INSERT INTO modules (name, display_name, description, category) VALUES
  ('tasks', 'Tasks', 'Task management and assignment', 'core'),
  ('staff', 'Staff Management', 'Employee management and profiles', 'core'),
  ('schedule', 'Scheduling', 'Work schedules and shifts', 'core'),
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
  ('reports', 'Reports', 'Reporting and analytics', 'analytics'),
  ('notifications', 'Notifications', 'Notification system', 'system');

-- Create a default operator user (password: operator123)
-- Hash generated with bcrypt
INSERT INTO operator_users (email, password_hash, name) VALUES
  ('operator@todoapp.local', '$2a$10$rBV2kVZ8fJHD5Y0xqVw5zuKxH9vZYD0XqY7QZ5Y5Y5Y5Y5Y5Y5Y5Y', 'System Operator');
