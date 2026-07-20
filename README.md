# Lead Intake and Qualification System

A compact full-stack workflow for capturing, enriching, scoring, and reviewing
sales leads.

## Highlights

- Validated lead capture with Zod and React Hook Form
- Duplicate-email handling through Prisma constraints
- Best-effort enrichment that does not block initial lead creation
- Deterministic scoring and qualification rules
- Filterable and sortable review dashboard
- Request rate limiting and rate-limit response headers

## Technology

- Next.js 16 App Router
- React 19 and TypeScript
- Prisma with MariaDB
- Zod, React Hook Form, and SWR
- Tailwind CSS

## Run locally

1. Copy `.env.example` to `.env` and configure the database connection.
2. Install dependencies and generate the Prisma client.

```bash
npm install
npx prisma generate
```

3. Apply the database migration and start the development server.

```bash
npx prisma migrate dev
npm run dev
```

Open `http://localhost:3000`.

## Quality status

The primary workflow is implemented. Before production use, replace the
in-memory rate limiter with a shared store, add dashboard authentication, restore
the explicit HTTP 429 response path, and add automated tests and CI.
