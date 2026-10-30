export interface Industry {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  default_modules: string[];
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  industry_id: string | null;
  region: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  company_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Module {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  category: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyModule {
  id: string;
  company_id: string;
  module_id: string;
  is_enabled: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface OperatorUser {
  id: string;
  email: string;
  name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'admin' | 'manager' | 'user';

export interface SignupData {
  companyName: string;
  industryId: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  region?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface CompanyWithIndustry extends Company {
  industry?: Industry;
}

export interface UserWithCompany extends User {
  company?: Company;
}

export interface ModuleWithStatus extends Module {
  is_enabled: boolean;
}
