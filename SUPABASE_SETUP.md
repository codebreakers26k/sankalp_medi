# Supabase Setup

Supabase supplies PostgreSQL and the hospital-license storage bucket. The React interface does not access privileged Supabase APIs directly; Spring Boot owns database and storage operations.

## PostgreSQL

Add the JDBC connection to the root `.env`:

```env
DATABASE_URL=jdbc:postgresql://db.PROJECT_REF.supabase.co:5432/postgres?sslmode=require
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=
```

Start the Java backend. Flyway runs the files in `backend/src/main/resources/db/migration/` and creates or updates the schema.

## Storage

In Supabase Dashboard, open **Settings → API Keys** and create a server secret key. Add it only to `.env`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_SECRET_KEY=<supabase-secret-key>
```

The backend also accepts the legacy `SUPABASE_SERVICE_ROLE_KEY`. Never prefix either server credential with `NEXT_PUBLIC_`.

Flyway creates/configures the `hospital-documents` bucket. Only authenticated admin operations in Spring Boot can upload documents. Public URLs can read uploaded license documents.

## Health check

With the backend running:

```bash
curl http://localhost:8080/api/health
```

Expected status: `UP` for both the service and database.
