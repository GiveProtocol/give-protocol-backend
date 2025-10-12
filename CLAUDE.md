# CLAUDE.md - Give Protocol Backend

Give Protocol Backend - Private backend infrastructure for Duration Give Protocol, including Supabase database, admin functions, and API services. Part of the Give Protocol distributed repository architecture.

## Repository Structure

This is the **backend** repository, one of four Give Protocol repositories:

- **give-protocol-webapp**: React/Vite Progressive Web App
- **give-protocol-contracts**: Solidity smart contracts and Hardhat infrastructure
- **give-protocol-docs**: Jekyll documentation site
- **give-protocol-backend** (this repo): Supabase backend and admin functions

## Essential Commands

```bash
npm run dev              # Start Supabase local development
npm run stop             # Stop Supabase local instance
npm run reset            # Reset local database
npm run generate-types   # Generate TypeScript types from database schema
npm run migrate          # Push database migrations
npm run seed             # Seed database with test data
```

## Architecture

- **Database**: Supabase PostgreSQL database
- **API**: Supabase Edge Functions (Deno)
- **Admin**: Admin dashboard functions
- **Types**: Auto-generated TypeScript types from database schema

## Supabase Structure

- `/supabase/migrations/`: Database migration SQL files
- `/supabase/functions/`: Edge Functions (serverless API endpoints)
- `/src/types/database.ts`: Auto-generated database types

## Environment Setup

`.env` file required:

- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (never commit!)
- `MAILCHIMP_API_KEY`: Mailchimp integration key
- `SENTRY_DSN`: Sentry error tracking DSN

## Development Workflow

1. Start local Supabase: `npm run dev`
2. Make schema changes in `/supabase/migrations/`
3. Generate types: `npm run generate-types`
4. Test locally before pushing migrations

## Security

- Service role keys must never be committed
- All admin functions require authentication
- Security scanning via GitHub Actions (Trivy)
- Regular dependency auditing

## Git Workflow

1. Test migrations locally with `npm run reset`
2. Generate types after schema changes
3. Write descriptive commit messages
4. Keep commits focused on single logical changes
