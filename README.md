# Give Protocol - Backend API

Backend services and API for Give Protocol, including GraphQL endpoints, database management, and blockchain indexing.

## Features

- 🔌 RESTful API endpoints
- 📊 GraphQL API (optional)
- 🗄️ Database management with Supabase
- 🔗 Blockchain event indexing
- 📧 Email integrations (MailChimp)
- 🔐 Authentication & authorization
- 📈 Analytics and reporting

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express/Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Blockchain Indexing**: SubQuery / The Graph
- **Email**: MailChimp API

## Setup

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env`:

```env
DATABASE_URL=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
MOONBASE_RPC_URL=
MAILCHIMP_API_KEY=
```

## Development

```bash
# Start dev server
npm run dev

# Run tests
npm run test

# Database migrations
npm run migrate
```

## API Documentation

API documentation is available at `/api/docs` when running in development mode.

## Deployment

Configure your deployment platform with the necessary environment variables and deploy.

## License

UNLICENSED - Private Repository
