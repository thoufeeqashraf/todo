// Core types for the multi-tenant operations platform

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
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'admin' | 'manager' | 'user';

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

export interface CompanyWithIndustry extends Company {
  industry?: Industry;
}

export interface UserWithCompany extends User {
  company?: Company;
}

export interface ModuleWithStatus extends Module {
  is_enabled: boolean;
}

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

export interface Task {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  assigned_to_id: string | null;
  assigned_by_id: string | null;
  due_date: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  created_at: string;
  updated_at: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'overdue';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Department {
  id: string;
  company_id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  company_id: string;
  department_id: string | null;
  name: string;
  manager_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invitation {
  id: string;
  company_id: string;
  email: string;
  role: UserRole;
  invited_by_id: string;
  expires_at: string;
  status: 'pending' | 'accepted' | 'expired';
  created_at: string;
}

export interface AuditLog {
  id: string;
  company_id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  changes: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}
