# Secure Employee System

An RBAC-based employee management system for a small/medium business (50–70 employees).
Employees log in with limited permissions; an admin defines security policies and gets
real-time alerts on suspicious activity (brute-force attempts, off-hours logins, IP
changes, account lockouts, policy changes).

## Features

- **RBAC**: `employee`, `manager`, `admin` roles with route-level permission checks
- **Policy engine**: admin can change password rules, session timeout, allowed login
  hours, lockout threshold, password rotation age — enforced live, no redeploy needed
- **Brute-force protection**: auto-lockout after N failed attempts (policy-configurable)
- **Anomaly detection**: flags logins from a new IP, off-hours logins, locked-account
  attempts
- **Tamper-evident audit log**: every security event is hash-chained (like a mini
  blockchain) — any past edit breaks the chain and is detectable via `/integrity`
- **Admin dashboard API**: summary stats, alert feed, full log, and chain-integrity check

## Tech Stack

- Node.js + Express
- SQLite (via Sequelize) — zero setup, single file DB, good for local/small deployments
- JWT auth + bcrypt password hashing
- helmet, cors, express-rate-limit for baseline hardening

## Project Structure

```
src/
  config/database.js       - Sequelize + SQLite connection
  models/                  - User, Policy, AuditLog
  controllers/             - auth, policy, dashboard logic
  middleware/auth.js       - JWT verification + role guard
  routes/                  - Express routers
  utils/
    auditLogger.js         - hash-chained audit logging + verifyChain()
    policyEngine.js         - get/set/seed security policies
  app.js                   - entry point
  seedAdmin.js             - one-time script to create the first admin
```

## Setup

```bash
npm install
cp .env.example .env      # then edit JWT_SECRET etc.
npm run seed:admin        # creates the first admin account
npm start                 # runs on http://localhost:4000
```

Default seeded admin (change immediately after first login):
- employeeId: `admin001`
- password: `ChangeMe!123` (or whatever you set in `.env`)

## API Overview

| Method | Endpoint                  | Access        | Purpose                          |
|--------|----------------------------|---------------|-----------------------------------|
| POST   | /api/auth/login             | public        | Log in, get JWT                   |
| POST   | /api/auth/register          | admin         | Create a new employee account     |
| GET    | /api/policies                | admin/manager | View current security policies    |
| PUT    | /api/policies/:key            | admin         | Update a policy value             |
| GET    | /api/dashboard/summary        | admin/manager | Counts: users, locked, alerts     |
| GET    | /api/dashboard/alerts          | admin/manager | Warning/critical events feed      |
| GET    | /api/dashboard/logs             | admin         | Full audit log                    |
| GET    | /api/dashboard/integrity          | admin         | Verify audit chain hasn't been tampered with |

## Default Policies (editable via API)

| Key                          | Default | Meaning                              |
|-------------------------------|---------|---------------------------------------|
| MAX_LOGIN_ATTEMPTS              | 5       | Failed attempts before lockout        |
| PASSWORD_MIN_LENGTH              | 10      | Minimum password length               |
| PASSWORD_REQUIRE_COMPLEXITY       | true    | Require upper/lower/number/symbol     |
| SESSION_TIMEOUT_MINUTES            | 30      | JWT expiry                            |
| PASSWORD_MAX_AGE_DAYS                | 90      | Force rotation after N days           |
| ALLOWED_LOGIN_START_HOUR               | 0       | Earliest login hour (0–23)            |
| ALLOWED_LOGIN_END_HOUR                   | 23      | Latest login hour (0–23)              |

## Next Steps / Possible Extensions

- Password rotation enforcement on login (currently flagged, not yet blocking)
- Email/webhook delivery for critical alerts (currently API-only)
- Frontend dashboard (React) consuming these APIs
- Rate-limit by IP + employeeId combo, not just endpoint
- Map to NIST 800-53 / CERT-In control IDs per policy for compliance reporting
