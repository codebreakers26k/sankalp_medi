# MediQueue Setup

MediQueue has a Next.js/React interface and a Java 17 Spring Boot backend. All business logic, database access, authentication enforcement, email, storage uploads, queue operations, appointments, and AI triage run through Spring Boot.

## Requirements

- Node.js 20 or newer
- Java 17 or newer
- Maven 3.9 or newer
- A PostgreSQL database (the configured deployment uses Supabase PostgreSQL)
- A Clerk application

## Environment

Create one root `.env` file. It is ignored by Git. Do not create `.env.local` or commit credentials.

Required values:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
CLERK_ISSUER_URI=

DATABASE_URL=jdbc:postgresql://host:5432/database?sslmode=require
DATABASE_USERNAME=
DATABASE_PASSWORD=

NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SECRET_KEY=

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM_NAME=MediQueue Pro
```

`SUPABASE_SECRET_KEY` is server-only. A legacy `SUPABASE_SERVICE_ROLE_KEY` is also accepted.

## Clerk role claim

Add this custom claim to Clerk session tokens:

```json
{
  "role": "{{user.public_metadata.role}}"
}
```

Supported roles are `patient`, `doctor`, `admin`, and `staff`.

## Install and run

```bash
npm install
npm run dev
```

- React: `http://localhost:3000`
- Spring Boot API: `http://localhost:8080/api`

`npm run dev` starts both processes. Flyway applies the Java backend's canonical database migrations automatically.

## Verify

```bash
mvn -f backend/pom.xml test
npx tsc --noEmit --incremental false
npm run build
```

The frontend uses `/backend-api/*` as its same-origin proxy. It attaches the Clerk session token and forwards requests to Spring Boot.
