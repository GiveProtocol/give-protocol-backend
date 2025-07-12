# Duration Backend Private

🔒 **PRIVATE REPOSITORY** - Contains sensitive business logic and database schemas for Duration Give Protocol.

## Contents

### Database & Migrations
- **45+ Database Migration Files**: Complete schema evolution and RLS policies
- **Supabase Configuration**: Database setup and security rules
- **Performance Optimizations**: Custom indexes and query optimizations

### Admin Panel (131KB+ of Code)
- **AdminCharities.tsx**: Charity management and verification
- **AdminDashboard.tsx**: Main administrative interface
- **AdminDonations.tsx**: Donation tracking and management
- **AdminLogs.tsx**: System logs and audit trails
- **AdminSettings.tsx**: Platform configuration
- **AdminStats.tsx**: Analytics and reporting
- **AdminUsers.tsx**: User management and moderation
- **AdminVerifications.tsx**: Identity and charity verification
- **AdminWithdrawals.tsx**: Financial transaction management

### Backend Services
- **Authentication**: User auth, session management, and security
- **API Layer**: Supabase client, queries, and data access patterns
- **Monitoring**: Error tracking, performance monitoring with Sentry
- **Security**: Input validation, CSRF protection, rate limiting

## Security Notice

⚠️ **KEEP THIS REPOSITORY PRIVATE**

This repository contains:
- Complete database architecture and business logic
- Administrative controls with financial implications
- User data access patterns and security implementations
- Proprietary algorithms for donation processing and verification

## Architecture Revealed

The database schema and admin panel expose:
- **Business Model**: How donations, charities, and users interact
- **Verification Process**: Multi-step charity and volunteer verification
- **Financial Flow**: Complete money movement and withdrawal systems
- **User Management**: Profile data, permissions, and behavioral tracking
- **Performance Optimizations**: Database indexing and caching strategies

## Setup Instructions

1. **Prerequisites**:
   ```bash
   npm install -g @supabase/cli
   ```

2. **Installation**:
   ```bash
   npm install
   ```

3. **Local Development**:
   ```bash
   npm run dev          # Start local Supabase
   npm run migrate      # Apply migrations
   npm run generate-types  # Generate TypeScript types
   ```

4. **Environment Variables**:
   Create `.env` file with:
   ```
   SUPABASE_URL=your_local_supabase_url
   SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   SENTRY_DSN=your_sentry_dsn
   ```

## Access Control

**Authorized Personnel Only**:
- Backend developers
- Database administrators  
- Security team
- Senior leadership

## Compliance

This repository contains sensitive business logic subject to:
- Intellectual property protection
- Financial compliance requirements
- Data privacy regulations
- Security audit requirements

---

**⚠️ DO NOT SHARE ACCESS TO THIS REPOSITORY WITHOUT EXPLICIT AUTHORIZATION**