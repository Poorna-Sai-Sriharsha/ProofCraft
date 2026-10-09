# ProofCart Testing Strategy & Test Suite Guide

ProofCart utilizes a multi-layer testing strategy designed to verify business logic, data isolation, and user interface contracts before deployment.

---

## Testing Layers

| Layer | Responsibility | Framework |
| :--- | :--- | :--- |
| **Unit Tests** | Pure business logic: date clamping, leap years, warranty states, days remaining | Vitest |
| **Integration Tests** | REST API contracts, MongoDB queries, Supertest HTTP calls, Cascading cleanup | Vitest + Supertest |
| **Security & IDOR Tests** | Multi-user isolation verification (User A vs. User B access controls) | Vitest + Supertest |
| **Frontend Tests** | React component rendering, status badge styling, empty states | Vitest + React Testing Library |

---

## 1. How to Run the Tests

From the root project directory:
```bash
# Run all backend and frontend tests
npm test

# Run backend tests only
npm run test:server

# Run frontend tests only
npm run test:client
```

---

## 2. Test Database Isolation

All integration tests execute against an isolated in-memory MongoDB server instance (`mongodb-memory-server`).
- **No external MongoDB configuration required:** Tests spin up and tear down their own in-memory database instance automatically.
- **Suite-level isolation:** Collections are emptied between test cases (`beforeEach`), eliminating test pollution or order-dependency bugs.
- **Production database safety:** Destructive commands (`deleteMany`) can never touch production or staging Atlas databases.

---

## 3. Test Suites Overview

### A. Date and Warranty Calculation Suite (`dateUtils.test.ts`)
- **16 passing tests**
- End-of-month calendar clamping:
  - Adding 1 month to `2026-01-31` produces `2026-02-28`.
  - Adding 1 month to `2024-01-31` (leap year) produces `2024-02-29`.
  - Adding 1 month to `2026-08-31` produces `2026-09-30`.
- Precedence rules: Explicit expiry date takes precedence over duration calculations.
- Inclusive expiry day policy: Warranties remain `ACTIVE` through `23:59:59.999Z` of their stated expiry date.
- Status classification: `ACTIVE`, `EXPIRED`, `NONE`, `UNKNOWN`.

### B. Health & Pre-flight Suite (`health.test.ts`)
- **2 passing tests**
- Confirms `GET /api/v1/health` returns `200` with database status `connected`, uptime, and service timestamp.
- Confirms unknown routes return a standardized `404 ROUTE_NOT_FOUND` response envelope.

### C. Authentication Suite (`auth.test.ts`)
- **13 passing tests**
- User registration with normalized email and password hashing.
- Duplicate email rejection (`409 EMAIL_ALREADY_EXISTS`).
- Input validation (email format, minimum password length).
- Login credential authentication and generic unauthorized errors for invalid credentials.
- HttpOnly session cookie issuance and `Authorization: Bearer <token>` dual-mode header authentication.
- Password change verification with current password validation.
- Logout session clearance.

### D. Purchases & IDOR Security Suite (`purchase.test.ts`)
- **12 passing tests**
- Purchase creation with automatic warranty expiry calculation and return deadline assignment.
- Validation checks: Negative price rejection, missing required product name.
- Query parameters: Search regex, category filter, pagination meta (`page`, `limit`, `total`, `totalPages`).
- **MANDATORY IDOR Verification (Part 14.4):**
  - Two distinct users (`User A` and `User B`) are registered.
  - User A creates a purchase.
  - Verified that User B receives `404 PURCHASE_NOT_FOUND` when attempting to:
    - View User A's purchase
    - Update User A's purchase
    - Archive User A's purchase
    - Delete User A's purchase
  - Verified that User A retains full authorized permissions on their own record.

### E. Document Vault & IDOR Security Suite (`document.test.ts`)
- **8 passing tests**
- Upload of valid PDF and image documents.
- Rejection of unsupported file formats (e.g., text/plain).
- Cross-user upload rejection: User B cannot attach documents to User A's purchase.
- Authorized document download: Streams file with appropriate MIME headers (`Content-Type: application/pdf`).
- Cross-user download rejection: User B cannot download User A's invoice.
- Cross-user deletion rejection: User B cannot delete User A's documents.
- Verified authorized document deletion unlinks both storage file and database record.

### F. Service Records & Maintenance Suite (`service.test.ts`)
- **8 passing tests**
- Creation, update, and deletion of maintenance records.
- Validation of warranty claim status (`NOT_APPLICABLE`, `PENDING`, `APPROVED`, `REJECTED`).
- Rejection of negative repair costs.
- Cross-user rejection: User B cannot log service on User A's product or access User A's logs.

### G. Dashboard Aggregations & Notifications Suite (`dashboard.test.ts`)
- **7 passing tests**
- Live aggregation test: Evaluates counts against 7 known test purchases.
- Excludes archived records from active dashboard totals.
- Multi-currency spending: Groups INR and USD separately without invalid mathematical summation.
- Upcoming deadlines: Sorted chronologically nearest first.
- Complete dashboard isolation between users.
- **Idempotent reminder engine:**
  - Running the reminder job generates expected reminders.
  - Re-running the reminder job immediately produces **0 duplicates** due to compound unique indexing.

### H. Frontend Component Suite (`components.test.tsx`)
- **9 passing tests**
- Renders color-coded warranty badges (Active, Expiring Soon, Expired, None, Unknown).
- Renders warranty claim status badges.
- Renders empty state graphics, descriptions, and action buttons.

---

## 4. Current Test Suite Status

```
Backend Test Files:   7 passed (7)
Backend Tests:        66 passed (66)
Frontend Test Files:  1 passed (1)
Frontend Tests:       9 passed (9)
------------------------------------
Total Tests:          75 passed (75)
```
