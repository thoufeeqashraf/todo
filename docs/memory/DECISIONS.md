# Technical Decisions

## Database
**Decision**: Use Supabase (PostgreSQL)
**Rationale**: 
- Native multi-tenancy support with row-level security
- Built-in real-time capabilities for future features
- Easy regional deployment options
- Strong TypeScript support

## Authentication
**Decision**: Custom JWT-based auth with httpOnly cookies
**Rationale**:
- Simple for v1 development
- No external dependencies
- Easy to migrate to OAuth/SSO later
- Separate operator and user authentication paths

## Multi-tenancy Pattern
**Decision**: Shared database with `company_id` scoping
**Rationale**:
- Cost-effective for v1
- Simpler than database-per-tenant
- Easy to query across tenants for analytics
- Industry-standard approach

## Module System
**Decision**: Database-driven feature toggles
**Rationale**:
- Dynamic configuration without deployments
- Per-tenant customization
- Industry-specific defaults
- Easy to add new modules

## Industry Configuration
**Decision**: Seed database with 13 industries
**Rationale**:
- Covers major use cases
- Pre-configured module defaults
- Easy to add more via migrations
- Data-driven, not code-driven

## Regional Flexibility
**Decision**: Region as a company attribute, not hard-coded
**Rationale**:
- Future-proof for multi-region expansion
- Compliance flexibility
- Customer choice

## Password Security
**Decision**: bcrypt with 10 salt rounds
**Rationale**:
- Industry standard
- Good balance of security and performance
- Well-tested library

## Operator Access
**Decision**: Separate operator_users table at `/login`
**Rationale**:
- Clean separation from tenant data
- Development and support access
- No tenant coupling
