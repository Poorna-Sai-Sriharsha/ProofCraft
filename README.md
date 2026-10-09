# ProofCart — Personal Purchase & Warranty Vault
> **Tagline:** Every purchase. Every warranty. One place.  
> **Developed by:** Sriharsha Perin  
> **For:** StartupMeu Software Engineer Intern — MERN Stack Assessment

---

## 🌟 Overview

**ProofCart** is a production-oriented personal purchase and warranty management platform. It solves the real-world frustration of misplaced tax invoices, missed retailer return deadlines, and unexercised warranty claims.

ProofCart immediately answers five critical questions for any consumer:
1. **What products do I own?** — Unified inventory with model and serial numbers.
2. **How much have I spent?** — Live multi-currency expenditure aggregation.
3. **Which warranties are approaching expiration?** — Automated calendar-month expiry engine with urgency alerts.
4. **Where are my invoices and warranty certificates?** — Private, authorized document storage vault.
5. **What repairs or services have my products undergone?** — Comprehensive maintenance history and warranty claim tracking.

---

## 🛠️ Technology Stack

| Layer | Technologies | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, TypeScript | Type-safe, component-driven client architecture |
| **Styling** | Tailwind CSS, Lucide React, Plus Jakarta Sans | Modern SaaS design system with CSS design tokens |
| **State & API** | TanStack Query v5, Axios | Server state caching, optimistic updates, request deduplication |
| **Forms** | React Hook Form, Zod | Type-safe form validation with error boundary handling |
| **Charts** | Recharts | Multi-currency spending and category distribution graphs |
| **Backend** | Node.js, Express.js, TypeScript | RESTful modular monolith with strict domain layering |
| **Database** | MongoDB, Mongoose | Strongly typed schemas with high-performance compound indexing |
| **Security** | Helmet, CORS, Express-Rate-Limit, BCrypt, Cookie-Parser | Hardened HTTP headers, exact origin credentials, password hashing |
| **Storage** | Multi-Provider Storage Adapter (Local Disk / Cloudinary) | Private authorized streaming; zero public document exposure |
| **Jobs** | Node-Cron | Idempotent background scanner for 30d, 7d, and 1d deadline reminders |
| **Logging** | Pino, Pino-Pretty | Structured JSON logging with redacted secrets |
| **Testing** | Vitest, Supertest, React Testing Library | Full unit, integration, IDOR security, and component tests |

---

## 🏗️ Architecture & Core Principles

```
proofcart/
├── client/                     # Vite React Frontend
│   ├── src/
│   │   ├── components/         # Layouts, Badges, Modals, EmptyStates
│   │   ├── context/            # AuthContext (session management)
│   │   ├── lib/                # Centralized Axios client & helpers
│   │   ├── pages/              # Dashboard, Purchases, Vault, Calendar, Services
│   │   ├── types/              # Domain interfaces
│   │   └── tests/              # Frontend component unit tests
│   └── package.json
│
├── server/                     # Express TypeScript Backend
│   ├── src/
│   │   ├── config/             # Zod environment validation, MongoDB connection
│   │   ├── middleware/         # Auth, validation, rateLimit, error handling
│   │   ├── modules/
│   │   │   ├── auth/           # User registration, login, profile, password
│   │   │   ├── purchases/      # Purchase inventory CRUD, search, pagination
│   │   │   ├── documents/      # Private storage adapter & download streaming
│   │   │   ├── services/       # Maintenance records & warranty claim logs
│   │   │   ├── dashboard/      # Spending aggregation & warranty health
│   │   │   ├── deadlines/      # Chronological calendar deadline engine
│   │   │   └── notifications/  # Reminders with unique compound idempotency
│   │   ├── jobs/               # Scheduled cron job runner
│   │   └── utils/              # Date clamping, leap year logic, ApiError
│   └── package.json
│
├── docs/                       # Architectural & API Specifications
│   ├── API.md                  # Comprehensive REST endpoint documentation
│   ├── TESTING.md              # Test execution guide & test matrix
│   └── ARCHITECTURE.md         # Deep-dive architecture & data models
│
├── package.json                # Monorepo scripts
└── README.md
```

### Core Architectural Highlights
1. **Backend is Authoritative:** Dates, warranty statuses, and authorization rules are computed exclusively on the server.
2. **Strict Ownership & IDOR Protection:** Every query scopes to `{ _id: id, userId: req.user.id }`. Unauthorized access returns `404` to avoid confirming the existence of another user's records.
3. **Dual-Mode Authentication:** Solves cross-origin cookie blocking between Vercel and Render by accepting both `HttpOnly` session cookies and `Authorization: Bearer <token>` fallback headers.
4. **Private Document Streaming:** Documents are never exposed via public links. Downloads stream securely through `/api/v1/documents/:id/download` after ownership is verified.
5. **Accurate Date Clamping:** Adding 1 month to `January 31` clamps safely to `February 28` (or `February 29` in leap years). Warranties follow an inclusive expiry policy (valid through `23:59:59.999Z` of the target date).
6. **Multi-Currency Analytics:** Different currencies (INR, USD, EUR) are grouped individually and never added together mathematically.

---

## ⚡ Quick Start & Local Setup

### Prerequisites
- Node.js `v18+` (tested on Node `v22.23.2`)
- npm `v9+`

### 1. Clone the Repository
```bash
git clone https://github.com/sriharsha-perin/proofcart.git
cd proofcart
```

### 2. Install Dependencies
```bash
# Install backend dependencies
cd server && npm install

# Install frontend dependencies
cd ../client && npm install
cd ..
```

### 3. Configure Environment Variables

**Server Environment (`server/.env`):**
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/proofcart
CLIENT_ORIGIN=http://localhost:5173
SESSION_SECRET=proofcart-super-secure-session-secret-change-in-prod-1234567890
STORAGE_PROVIDER=local
UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=5
```
*(Note: If no external MongoDB instance is running locally, ProofCart automatically boots an in-memory MongoDB fallback in development mode!)*

**Client Environment (`client/.env`):**
```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

### 4. Run Development Servers
In separate terminals:
```bash
# Terminal 1: Start Backend Server (port 5000)
cd server && npm run dev

# Terminal 2: Start Frontend Client (port 5173)
cd client && npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Automated Test Suite (75 Passed)

ProofCart features a comprehensive test suite across unit, integration, IDOR security, and frontend component tests:

```bash
# Run all tests across the monorepo
npm test

# Run backend test suite (66 tests)
npm run test:server

# Run frontend test suite (9 tests)
npm run test:client
```

### Test Suite Summary:
- ✅ **Date Utilities (16 tests):** Leap years, end-of-month clamping, inclusive expiry day logic, explicit precedence.
- ✅ **Health Check (2 tests):** Pre-flight database connectivity, route fallback.
- ✅ **Authentication (13 tests):** Registration, duplicate email rejection, login, cookie & Bearer token auth, password change.
- ✅ **Purchase Inventory & IDOR (12 tests):** Full CRUD, filtering, pagination, and multi-user security tests proving User B cannot view, update, archive, or delete User A's data.
- ✅ **Document Vault (8 tests):** PDF & image uploads, type rejection, authorized binary download stream, and IDOR isolation.
- ✅ **Service Records (8 tests):** Maintenance logs, warranty claims, cost validations, and IDOR protection.
- ✅ **Dashboard & Notifications (7 tests):** Live aggregations against known fixtures, multi-currency isolation, idempotent reminder generation.
- ✅ **Frontend Components (9 tests):** Warranty badges, claim badges, empty state rendering.

---

## 🤖 AI-Assisted Development Log (Code0 Experience)

StartupMeu's evaluation prioritizes thoughtful, verifiable collaboration with Code0. Rather than asking an AI to blindly dump an entire application, the development was structured systematically across defined phases:

### Task 1: Date Clamping & Inclusive Expiry Day Engine
- **Prompt to Code0:** "Design a date utility module in TypeScript that calculates calendar-month warranty expirations with month-end clamping (e.g. Jan 31 + 1 month = Feb 28 in non-leap years, Feb 29 in leap years), enforces explicit date precedence, and calculates live warranty status under an inclusive expiry day policy."
- **Code0 Proposal:** Suggested using native JavaScript `Date.setMonth()` directly.
- **Review & Refinement:** Identified that `Date.setMonth()` causes month-overflow bugs (e.g. Jan 31 + 1 month rolls over into March 2 or March 3). Refactored to implement `addMonthsClamped()` with explicit calculation of days in the target month using `getDaysInMonth(year, month)`.
- **Testing:** Implemented 16 isolated unit tests in `server/src/utils/dateUtils.test.ts` testing 2024 leap years, 2026 non-leap years, August 31 rollover, and UTC midnight normalization.
- **Key Takeaway:** Native date math frequently produces subtle edge-case errors; explicit mathematical clamping verified by unit tests is essential for warranty systems.

### Task 2: Solving Cross-Origin Authentication on Free-Tier Hosting (Vercel + Render)
- **Prompt to Code0:** "Help design the authentication middleware and Axios interceptor for ProofCart so it works seamlessly on both localhost and deployed environments where Vercel and Render are on different domains."
- **Code0 Proposal:** Recommended purely using HttpOnly cookies with `SameSite=none`.
- **Review & Refinement:** Acknowledged that modern privacy policies (Safari ITP, Chrome Privacy Sandbox) block third-party cookies when client and server domains differ. Implemented a resilient **dual-mode authentication architecture**: the server issues an HttpOnly cookie while also returning the token in the JSON response payload. The client Axios client automatically sets `Authorization: Bearer <token>` alongside `withCredentials: true`, and the server checks the cookie first with graceful fallback to the Bearer header.
- **Testing:** Created integration tests verifying that endpoints authenticate successfully using both `Cookie: proofcart_session=...` and `Authorization: Bearer ...`.
- **Key Takeaway:** Enterprise applications should never rely on a single browser mechanism when deploying across distributed origins.

### Task 3: Insecure Direct Object Reference (IDOR) Security Suite
- **Prompt to Code0:** "Help draft comprehensive authorization tests between two users (User A and User B) to prove that neither purchases, documents, nor service records can be accessed across user accounts."
- **Code0 Proposal:** Generated tests checking that User B gets a `403 Forbidden` error when trying to view User A's items.
- **Review & Refinement:** Modified the API architecture to return `404 Not Found` rather than `403 Forbidden` when attempting to access another user's records. Returning 403 confirms to an attacker that a given record ID exists, enabling resource enumeration. Returning 404 ensures zero information leakage.
- **Testing:** Verified in `purchase.test.ts`, `document.test.ts`, and `service.test.ts` that all unauthorized operations return 404.
- **Key Takeaway:** In multitenant applications, resource existence obscurity is an important defense-in-depth practice.

### Task 4: Private Document Storage Adapter with Failure Cleanup
- **Prompt to Code0:** "Implement document upload for invoices and warranty certificates with support for server-side private file storage and authorized streaming."
- **Code0 Proposal:** Suggested storing documents in a public folder with Multer diskStorage.
- **Review & Refinement:** Invoices contain sensitive PII and financial details. Completely redesigned into an `IStorageProvider` abstraction storing files outside the web root with random cryptographic keys. Implemented streaming via `GET /api/v1/documents/:id/download` with ownership checks and automatic file unlinking if database insertion fails.
- **Testing:** Tested valid uploads, file size limits (5MB), unsupported MIME rejection, and authorized binary streaming.
- **Key Takeaway:** Invoices and financial proofs must be treated as sensitive data with authorized streaming rather than public static hosting.

---

## ✅ Definition of Done Verification Checklist

- [x] User registration with email normalization & password hashing
- [x] Login & logout with session clearance
- [x] Dual-mode authentication (HttpOnly cookies + Bearer token fallback)
- [x] Protected routes on client and server
- [x] Full Purchase CRUD (Create, Read, Update, Delete, Archive, Restore)
- [x] Dynamic search, category filters, warranty filters, and pagination
- [x] Authoritative warranty calculations with month-end clamping & leap year handling
- [x] Retailer return deadline engine with explicit override precedence
- [x] Private Document Vault (upload, authorized streaming, deletion)
- [x] Service & repair records with warranty claim status tracking
- [x] Real-time multi-currency analytics dashboard (zero fake stats)
- [x] Warranty health distribution and upcoming deadlines sorting
- [x] Idempotent scheduled reminder notifications (30d, 7d, 1d)
- [x] 100% IDOR protection verified across all private resources
- [x] Responsive layout with collapsible sidebar and mobile drawer
- [x] Comprehensive test suite (75 automated tests passing)
- [x] Complete documentation (`API.md`, `TESTING.md`, `ARCHITECTURE.md`)
- [x] Production build clean without errors (`dist/` generated)

---

## 📜 License

MIT License © 2026 Sriharsha Perin.
