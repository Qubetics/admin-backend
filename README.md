# admin-backend

Backend API service for the Qubetics dVPN admin panel. Built with Node.js, Express and
TypeScript, using Prisma (PostgreSQL) for persistence and Redis for caching.

## Requirements

- **Node.js 20** (see `Dockerfile`, `node:20-alpine`)
- **npm** (this repo is npm-based; `package-lock.json` is the lock file)
- **PostgreSQL** (primary + optional replica)
- **Redis**

## Setup

```bash
# 1. Install dependencies
#    (-f works around a Prisma peer-dependency conflict; --ignore-scripts skips native build steps)
npm install --ignore-scripts -f

# 2. Create your environment file
cp .env.example .env
#    then edit .env and fill in real values (see .env.example for the full list)

# 3. Generate the Prisma client
npm run generate:prisma

# 4. Run database migrations (development)
npm run migrate:dev
```

## Running

```bash
npm run dev          # development, with hot reload (nodemon)
npm run build        # compile TypeScript to build/
npm run start:prod   # run the compiled build
```

## Testing

```bash
npm test             # run the Jest test suite
npm run test:coverage
```

## Environment variables

All configuration is supplied through environment variables. See
[`.env.example`](./.env.example) for the complete, documented list.

## Notes

- Deployment CI workflows were removed from the public repository; they referenced private
  infrastructure. Add your own deployment pipeline as needed.
