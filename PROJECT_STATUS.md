# MediQueue Project Status

## Architecture

- React 19 / Next.js 16 frontend retained
- Java 17 / Spring Boot 3 backend
- Spring Security with Clerk JWT validation and role checks
- PostgreSQL through Spring JDBC
- Flyway-managed canonical schema
- Java email, OTP, QR-code, queue, appointment, admin, doctor, and AI-triage services
- Supabase Storage accessed only by the Java backend

## Completed flows

- Patient registration/profile synchronization
- Hospital, department, and doctor catalog
- Appointment availability, OTP verification, booking, cancellation, rescheduling, and waitlist
- Normal and emergency queue joining
- Patient dashboard and digital waiting room
- Staff queue operations
- Doctor workspace, queue, appointments, calendar, history, and analytics
- Admin overview and hospital/doctor management
- License-document storage
- Consistent JSON error responses and backend-unavailable handling

## Verification

- Java unit tests pass
- TypeScript type checking passes
- Next.js production build passes
- Live backend and database health checks pass
- Patient-facing screens were manually checked against the Java backend

Admin and doctor mutation flows require accounts with the matching Clerk role.
