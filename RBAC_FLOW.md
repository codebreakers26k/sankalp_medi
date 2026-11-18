# Role-Based Access Control

Clerk authenticates users. Spring Security validates Clerk JWTs and reads the `role` custom claim.

## Roles

- `patient`: profile, personal appointments, personal queue entries, and notifications
- `doctor`: doctor workspace and assigned queue/appointment operations
- `staff`: service-counter queue operations
- `admin`: hospital, department, doctor, appointment-status, and role administration

The Next.js route proxy forwards the Clerk bearer token to Spring Boot. Authorization is enforced again in Java; hiding a page in React is never treated as sufficient protection.

## Clerk configuration

Configure the session-token custom claim:

```json
{
  "role": "{{user.public_metadata.role}}"
}
```

`src/proxy.ts` handles route-level redirects. Java authorization is implemented in `backend/src/main/java/com/mediqueue/config/SecurityConfig.java` and controller role checks.
