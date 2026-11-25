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

## Deploy

The Next.js frontend can run on Vercel. Deploy the Java backend separately on Render using the
root `render.yaml` Blueprint. Render builds `backend/Dockerfile`, checks `/api/health`, and prompts
for every secret instead of storing credentials in Git.

After Render reports a healthy deployment, add this environment variable to the Vercel project and
redeploy the frontend:

```text
SPRING_BACKEND_URL=https://YOUR-RENDER-SERVICE.onrender.com
```

Do not append `/api`; the Next.js proxy adds it automatically.
