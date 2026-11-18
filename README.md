# MediQueue

MediQueue is a hospital queue and appointment platform with a React interface and a Java Spring Boot backend.

## Architecture

- `src/` — Next.js 16 / React 19 user interface
- `backend/` — Java 17 Spring Boot REST API
- PostgreSQL/Supabase — database
- Supabase Storage — hospital license documents, accessed only by Java
- Clerk — authentication and role metadata

All application requests use `/backend-api/*`. The Next.js proxy adds the Clerk token and forwards them to Spring Boot at `/api/*`. There is no second JavaScript business-logic backend.

## Run locally

Configure the single ignored root `.env`, then run:

```bash
npm install
npm run dev
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8080/api`

Flyway applies the schema automatically when Spring Boot starts.

## Verify

```bash
mvn -f backend/pom.xml test
npx tsc --noEmit --incremental false
npm run build
```

See [SETUP_GUIDE.md](SETUP_GUIDE.md), [SUPABASE_SETUP.md](SUPABASE_SETUP.md), and [RBAC_FLOW.md](RBAC_FLOW.md).

Never commit `.env`, database passwords, Clerk secrets, SMTP credentials, or Supabase server keys.
