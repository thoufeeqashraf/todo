# ToDo App

Multi-tenant task management platform designed for businesses across multiple industries.

## Features

- **Multi-tenant Architecture**: Complete data isolation between companies
- **Industry-Specific**: Pre-configured for 13+ industries including restaurant, retail, healthcare, and more
- **Modular System**: Enable/disable features based on your business needs
- **Regional Flexibility**: Deploy in South Africa, EU, or multi-region
- **Secure Authentication**: Separate authentication for users and operators

## Tech Stack

- **Framework**: Next.js 16.4.3 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Custom JWT-based with bcrypt

## Getting Started

### Prerequisites

- Node.js 20+ and npm
- Supabase account (or local Supabase instance)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/thoufeeqashraf/todo.git
cd todo
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

4. Run the database migrations:

In your Supabase SQL editor, run the migration file:
```bash
supabase/migrations/001_initial_schema.sql
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## Usage

### Company Signup

1. Navigate to `/signup`
2. Fill in company information
3. Select your industry
4. Choose your region
5. Create your admin account

Default modules will be enabled based on your selected industry.

### Operator Login

For development and administrative access:

1. Navigate to `/login`
2. Use operator credentials:
   - Email: `operator@todoapp.local`
   - Password: `operator123`

### Managing Modules

After logging in:

1. Go to the Dashboard
2. Toggle modules on/off for your company
3. Changes take effect immediately

## Industries Supported

- Restaurant
- Retail
- Property Management
- Construction
- Hospitality
- Healthcare
- Logistics
- Manufacturing
- Education
- Security
- Cleaning & Facilities
- Agriculture
- Events

## Available Modules

### Core
- Tasks
- Staff Management
- Scheduling

### Operations
- Inventory
- Sales
- Maintenance
- Projects
- Equipment
- And more...

### Analytics
- Reports

### System
- Notifications

## Project Structure

```
/app                    # Next.js app directory
  /api                  # API routes
    /auth              # Authentication endpoints
    /companies         # Company management
  /signup              # Signup page
  /login               # Operator login page
  /dashboard           # Main dashboard
/components            # React components
/lib                   # Utility libraries
/types                 # TypeScript types
/utils                 # Helper functions
/supabase             # Database migrations
/docs                  # Documentation
  /memory             # Project memory files
```

## Database Schema

- `companies`: Tenant organizations
- `users`: Company users
- `operator_users`: Administrative users
- `industries`: Business verticals
- `modules`: Feature modules
- `company_modules`: Module enablement per company

## Development

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

### Building

```bash
npm run build
```

## Documentation

- [Development Brief](docs/memory/DEVELOPMENT-BRIEF.md)
- [Project Brief](docs/memory/BRIEF.md)
- [Technical Decisions](docs/memory/DECISIONS.md)
- [Development Log](docs/memory/LOG.md)
- [Timeline](docs/TIMELINE.md)

## Security

- Passwords are hashed using bcrypt with 10 salt rounds
- Session tokens stored in httpOnly cookies
- Multi-tenant data isolation at database level
- Row-level security (when using Supabase RLS)

## License

Proprietary

## Support

For support, email support@todoapp.local
