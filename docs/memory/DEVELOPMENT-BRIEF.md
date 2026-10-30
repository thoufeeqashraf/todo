# Development Brief

## Project Overview
Multi-tenant ToDo App built with Next.js, TypeScript, and Supabase.

## Technology Stack
- **Frontend**: Next.js 16.4.3 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Custom JWT-based auth with bcrypt
- **Deployment**: Flexible (South Africa, EU, or multi-region)

## Architecture
- **Multi-tenant**: Complete data isolation per company using `company_id` foreign keys
- **Role-based**: Admin, manager, and user roles
- **Modular**: Enable/disable modules per company based on industry

## Database Schema
- `companies`: Tenant organizations
- `users`: Company users (tenant-scoped)
- `operator_users`: Development/admin access (tenant-agnostic)
- `industries`: Business verticals (13 pre-configured)
- `modules`: Feature modules (21 available)
- `company_modules`: Module enablement per company

## Key Features (v1)
1. Multi-tenant company signup
2. Industry selection during signup
3. Module toggles per company
4. Development operator login at `/login`

## Out of Scope (v1)
- Mobile apps (iOS/Android)
- Roster management
- Wallet/payments
- Mini-apps/POS
- CCTV integration
- Staff health tracking
- Incident management
- Find My Staff feature
- Geofence attendance
