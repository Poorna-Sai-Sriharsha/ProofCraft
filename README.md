# 🛡️ ProofCart — Personal Purchase & Warranty Vault

> **Tagline:** Every purchase. Every warranty. One secure place.  
> **Candidate:** Sriharsha Perin  
> **Assessment:** Software Engineer Intern – MERN Stack | StartupMeu Evaluation  
> **Development Environment:** Visual Studio Code with Code0 AI Assistance & Code0 Integrated Terminal  

---

## 🌟 Executive Summary

**ProofCart** is a production-grade, meticulously engineered personal asset, purchase, and warranty management platform. Built using the full **MERN stack** (MongoDB, Express.js, React, Node.js) with strict end-to-end TypeScript, it solves the universal frustrations experienced by modern consumers: lost tax receipts, missed retailer return windows, and forgotten manufacturer warranty expiration dates.

ProofCart answers five mission-critical questions for any asset owner:
1. **What products do I own?** — Centralized inventory with model numbers, serial tracking, and purchase metadata.
2. **How much have I spent?** — Real-time multi-currency expenditure aggregation without false currency conversions.
3. **Which warranties are expiring soon?** — Automated calendar-month warranty calculation engine with proactive urgency indicators.
4. **Where are my purchase proofs?** — Private, authenticated document vault streaming invoices securely without public web exposure.
5. **What repairs or services have been performed?** — Full lifecycle maintenance logs with warranty claim coverage tracking.

Designed for uncompromising reliability, ProofCart operates completely out-of-the-box locally with a **zero-configuration in-memory MongoDB fallback**, comprehensive input validation with Zod, hardened security middleware, and **85 automated tests** covering unit, integration, IDOR authorization, and frontend component layers.

---

## ⚡ Tech Stack & Architecture

ProofCart is constructed upon a hardened, domain-driven modular monolith architecture:

| Layer | Technology | Description & Engineering Rationale |
|---|---|---|
| **Frontend Framework** | React 18 + Vite | Type-safe, high-performance Single Page Application (SPA) with fast HMR. |
| **Language** | TypeScript (Strict) | End-to-end type safety across both frontend and backend domains. |
| **Styling & Design System** | Tailwind CSS + Lucide Icons | Clean, modern SaaS design system with tailored tokens and responsive layouts. |
| **Client State & Cache** | TanStack Query v5 + Axios | Server-state caching, automatic background refetching, and request deduplication. |
| **Forms & Validation** | React Hook Form + Zod | Controlled, schema-validated inputs with client-side error boundaries. |
| **Data Visualization** | Recharts | Responsive multi-currency spending distributions and category breakdown charts. |
| **Backend Framework** | Node.js + Express.js | Modular RESTful API with structured routing and centralized error handling. |
| **Database & ODM** | MongoDB + Mongoose | Schema-enforced data models with compound indexes and aggregation pipelines. |
| **Zero-Config Database** | MongoMemoryServer | In-memory MongoDB fallback for instant local evaluation without external setup. |
| **Security & Headers** | Helmet, CORS, Express-Rate-Limit, BCrypt | Hardened security posture, rate limiting, credentialed CORS, and password hashing. |
| **Authentication** | Dual-Mode JWT + HttpOnly Cookies | Hybrid auth accepting HttpOnly session cookies with Bearer token header fallback. |
| **Document Storage** | Storage Adapter Pattern (`IStorageProvider`) | Private server-side storage with authorized binary streaming; zero public URLs. |
| **Background Scheduler** | Node-Cron | Idempotent automated scanner generating 30d, 7d, and 1d warranty expiry alerts. |
| **Logging & Diagnostics** | Pino + Pino-Pretty | Structured JSON application logging with sensitive field redaction. |
| **Testing Suite** | Vitest, Supertest, RTL | 85 automated tests covering unit math, API integration, IDOR, and React components. |

---

## ✨ Key Features & UX Highlights

* **Unified Asset & Purchase Inventory:** Instant cataloging of electronics, appliances, vehicles, and software with purchase dates, prices, retailer details, and serial numbers.
* **Authoritative Warranty Calculation Engine:** Server-authoritative calendar math handling variable month lengths, leap years, month-end clamping, and inclusive expiry day rules.
* **Return Window Deadline Engine:** Distinct retailer return policy tracking with explicit date overrides taking precedence over duration estimations.
* **Private Document Vault:** Upload and store invoices, warranty cards, and receipts (PDF, PNG, JPEG). Files are kept outside the public web root and streamed only after verifying record ownership.
* **Service & Maintenance Lifecycle:** Track repairs, scheduled maintenance, and authorized warranty claims with cost tracking and repairer contact logging.
* **Real-Time Multi-Currency Analytics:** Live dashboard grouping expenditures by currency (USD, INR, EUR, GBP) without mathematically blending disparate currencies.
* **Interactive Deadlines & Calendar View:** Chronological view of active return periods and warranty deadlines sorted by urgency (`CRITICAL`, `WARNING`, `SAFE`).
* **Scheduled Expiry Notifications:** Idempotent background job generating automated 30-day, 7-day, and 1-day reminders with duplicate-key database safeguards.
* **Strict Multi-Tenant IDOR Protection:** Multi-user boundary isolation ensuring User B can never inspect, modify, download, or delete User A's assets (returning `404 Not Found` for zero resource enumeration).
* **Soft Delete & Archival Flow:** Move expired or sold products to an archive with one-click restore or permanent cascading deletion.

---

## 🚀 Architectural Deep-Dive & Key Engineering Innovations

### 1. The "Zero-Config" Database Engine (Instant Local Evaluation)
Evaluators shouldn't have to install MongoDB locally or configure remote MongoDB Atlas credentials just to run a project. 
- In development and testing modes (`NODE_ENV !== 'production'`), ProofCart automatically detects whether a local MongoDB daemon is listening on `mongodb://localhost:27017`.
- If an external MongoDB instance is not detected, ProofCart dynamically spins up an isolated **in-memory MongoDB instance** (`mongodb-memory-server`) in milliseconds!
- All schemas, compound indexes, and aggregation pipelines operate identically to production MongoDB with **zero manual database configuration required**.

### 2. Month-End Clamping & Inclusive Expiry Day Policy
Standard JavaScript date calculations (`Date.setMonth(date.getMonth() + n)`) suffer from subtle month-overflow bugs:
- Adding 1 month to `January 31` natively causes the date to spill over into `March 2` or `March 3`. In warranty management, this causes premature or incorrect expiration dates.
- ProofCart implements an algorithmic `addMonthsClamped()` engine:
  - `2026-01-31` + 1 month clamps strictly to `2026-02-28`.
  - In a leap year (`2024-01-31`), it clamps accurately to `2024-02-29`.
- **Inclusive Expiry Policy:** A warranty expiring on `2026-06-30` remains `ACTIVE` through `23:59:59.999Z` of that day. ProofCart normalizes timestamps to UTC and evaluates status against the end of the calendar day.

### 3. Dual-Mode Authentication Architecture
Modern browsers (Chrome Privacy Sandbox, Safari ITP, Brave Shields) frequently block third-party cookies when frontend and backend origins differ.
- ProofCart solves this by issuing both an `HttpOnly`, `SameSite=none`, `Secure` session cookie (`proofcart_session`) **and** returning the JWT token in the JSON response payload.
- The frontend Axios client uses `withCredentials: true` while simultaneously appending `Authorization: Bearer <token>`.
- The backend authentication middleware inspects the cookie first; if blocked by browser privacy mechanisms, it seamlessly falls back to the Bearer header.

### 4. Zero-Leakage 404 IDOR Protection (Defense-in-Depth)
Insecure Direct Object Reference (IDOR) vulnerabilities often leak record existence when returning `403 Forbidden`.
- If an authenticated attacker requests `GET /api/v1/purchases/:foreignId`, receiving `403 Forbidden` confirms that `:foreignId` exists in the system.
- ProofCart scopes every database query strictly to `{ _id: id, userId: req.user.id }`. If no document matches both criteria, the API returns `404 DOCUMENT_NOT_FOUND`, preventing resource enumeration attacks.

### 5. Multi-Currency Financial Aggregation Pipeline
Real-world users purchase items in multiple currencies. Naively summing `$100` and `₹8,000` into `8,100` misrepresents user finances.
- ProofCart executes a MongoDB aggregation pipeline grouping items by currency:
  ```json
  [
    { "currency": "INR", "totalAmount": 95000, "count": 4 },
    { "currency": "USD", "totalAmount": 340, "count": 2 }
  ]
  ```
- The frontend analytics cards display currency-separated totals and multi-currency badge distributions with zero mathematical illusions.

---

## 🛠️ Setup & Run Locally

### Prerequisites
* **Node.js:** `v18.0.0` or higher (tested on `v22.23.2`)
* **npm:** `v9.0.0` or higher
* **Git**

---

### 1. Clone the Repository
```bash
git clone https://github.com/Poorna-Sai-Sriharsha/ProofCart.git
cd ProofCart
```

---

### 2. Install Dependencies
ProofCart includes convenient root scripts to install both client and server dependencies:

```bash
# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install

# Return to root directory
cd ..
```

---

### 3. Environment Configuration

#### Backend Environment (`server/.env`):
Create a file named `.env` in the `server/` directory:
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
> **Note on Database:** You do **not** need a local MongoDB server running. If `mongodb://localhost:27017` is unreachable, ProofCart automatically initializes an in-memory MongoDB database!

#### Frontend Environment (`client/.env`):
Create a file named `.env` in the `client/` directory:
```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

---

### 4. Start the Application

Open two separate terminals from the project root:

#### Terminal 1 — Start Backend Server:
```bash
npm run dev:server
```
*(Runs on [http://localhost:5000](http://localhost:5000) with hot-reload via `tsx watch`)*

#### Terminal 2 — Start Frontend Client:
```bash
npm run dev:client
```
*(Runs on [http://localhost:5173](http://localhost:5173) with Vite fast HMR)*

Visit **[http://localhost:5173](http://localhost:5173)** in your browser to explore ProofCart!

---

## 🧪 Automated Test Suite (85 Passing Tests)

ProofCart features an exhaustive test suite verifying mathematical correctness, API endpoints, IDOR security boundaries, database aggregation, and UI components.

```bash
# Run all tests across the entire monorepo
npm test

# Run backend tests only (76 tests)
npm run test:server

# Run frontend tests only (9 tests)
npm run test:client
```

### Test Suite Execution Summary

```
-------------------------------------------------------------------------------
 Test Suite File                           Type              Tests     Status
-------------------------------------------------------------------------------
 dateUtils.test.ts                         Unit Math          16       ✅ Passed
 health.test.ts                            Pre-flight API      2       ✅ Passed
 auth.test.ts                              Integration Auth   13       ✅ Passed
 purchase.test.ts                          CRUD & IDOR        12       ✅ Passed
 document.test.ts                          Private Vault       8       ✅ Passed
 service.test.ts                           Repairs & Claims    8       ✅ Passed
 dashboard.test.ts                         Aggregation/Jobs    7       ✅ Passed
 regression.test.ts                        Master QA RC       10       ✅ Passed
 components.test.tsx                       React RTL           9       ✅ Passed
-------------------------------------------------------------------------------
 TOTAL PASSING TESTS:                                         85       ✅ 100% PASS
-------------------------------------------------------------------------------
```

### Highlights of Test Coverage:
* ✅ **Date & Leap Year Math (16 tests):** Proves end-of-month clamping across leap years (`2024-01-31` → `2024-02-29`) and non-leap years (`2026-01-31` → `2026-02-28`).
* ✅ **Authentication Lifecycles (13 tests):** Validates email normalization, password hashing, session revocation upon password update, and Bearer fallback authentication.
* ✅ **IDOR Security Isolation (12 tests):** Proves User B cannot read, update, archive, or delete User A's purchases.
* ✅ **Document Vault Isolation (8 tests):** Proves unauthorized users receive `404` when requesting document downloads and verifies file type/size limits.
* ✅ **Referential Integrity Sequence (10 tests):** End-to-end regression proving cascading unlinks of attached documents and service logs upon permanent purchase deletion.

---

## 📂 Project Architecture

```
ProofCart/
├── client/                             # React 18 + Vite Frontend Application
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/                   # ProtectedRoute, AuthCard
│   │   │   ├── layout/                 # AppLayout, Header, Sidebar
│   │   │   └── ui/                     # Badge, Modal, EmptyState design tokens
│   │   ├── context/                    # AuthContext (session state & login flow)
│   │   ├── lib/                        # Axios singleton client with dual-auth interceptor
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx       # Live spending stats & upcoming deadline widgets
│   │   │   ├── PurchasesPage.tsx       # Search, filter, pagination, and inventory table
│   │   │   ├── AddPurchasePage.tsx     # Purchase creation with document attachments
│   │   │   ├── PurchaseDetailsPage.tsx # Detailed view, warranty card, services & documents
│   │   │   ├── WarrantyCalendarPage.tsx# Chronological timeline of expiring warranties
│   │   │   ├── ServiceHistoryPage.tsx  # Maintenance logs and warranty claims overview
│   │   │   ├── NotificationsPage.tsx   # Automated deadline alerts center
│   │   │   └── SettingsPage.tsx        # Profile management & password updates
│   │   ├── tests/                      # Component unit tests (React Testing Library)
│   │   └── types/                      # Domain TypeScript interfaces
│   └── package.json
│
├── server/                             # Node.js + Express.js TypeScript Backend
│   ├── src/
│   │   ├── config/                     # Zod environment validation & MongoMemoryServer
│   │   ├── jobs/                       # Scheduled background cron worker (reminders)
│   │   ├── middleware/                 # Auth, Zod validation, rateLimit, error handling
│   │   ├── modules/
│   │   │   ├── auth/                   # Registration, login, profile, password reset
│   │   │   ├── purchases/              # Asset CRUD, archive, search, pagination
│   │   │   ├── documents/              # IStorageProvider, upload & authorized stream
│   │   │   ├── services/               # Repair logs, maintenance, warranty claims
│   │   │   ├── dashboard/              # Multi-currency spending aggregation pipeline
│   │   │   ├── deadlines/              # Chronological calendar query engine
│   │   │   ├── notifications/          # Idempotent reminder generation with compound keys
│   │   │   └── regression/             # Master QA release regression suite
│   │   └── utils/                      # Date clamping, leap year math, ApiError class
│   └── package.json
│
├── docs/                               # Architectural & Technical Documentation
│   ├── API.md                          # REST API endpoint reference and schemas
│   ├── ARCHITECTURE.md                 # System design and database ER diagrams
│   ├── TESTING.md                      # Test matrix and execution guide
│   └── PRODUCTION_AUDIT_REPORT.md      # Deep security, UX, and performance audit
│
├── package.json                        # Monorepo management scripts
└── README.md                           # Master project documentation
```

---

## 🤖 Confirmation of Code0 AI-Assisted Development

> ### 📢 Official Confirmation of Code0 Usage
> **Code0** ([VS Code Extension Marketplace](https://marketplace.visualstudio.com/items?itemName=frigga.code0)) was actively utilized throughout the end-to-end development of **ProofCart**.
>
> In direct accordance with the StartupMeu assessment guidelines:
> - **Running the Test Suites:** Code0 and its integrated environment were used to run, monitor, and iteratively validate the automated test suites—including all **85 test cases** spanning date utility units, REST integration, IDOR security isolation, and React Testing Library component tests.
> - **Active Debugging & Troubleshooting:** Code0 was employed extensively to debug tricky full-stack defects, diagnose vitest execution failures, investigate date-overflow math edge cases, trace cross-origin cookie suppression issues, and troubleshoot cascading referential integrity deletions.
> - **Component & API Development:** Code0 assisted in scaffolding strongly typed schemas, designing RESTful endpoint controllers, and building responsive UI components and status badges.
> - **Git & Terminal Operations:** All Git operations—including repository initialization, branch management, semantic commit history, and GitHub remote pushes—were executed directly within the **Code0 integrated terminal**.

### AI Development Workflow & Engineering Judgment
Rather than using AI to generate opaque blocks of unverified code, Code0 was leveraged as an interactive pair-programmer to explore architectural alternatives, scaffold domain types, accelerate unit test generation, debug complex edge cases, and audit security boundaries.

The core engineering workflow followed a four-step cycle:
1. **Context-Rich Prompting:** Providing domain rules, security requirements, and boundary constraints to Code0.
2. **Critical Engineering Evaluation:** Inspecting AI suggestions against real-world production gotchas (such as JavaScript date math flaws, cross-origin cookie suppression, and resource enumeration risks).
3. **Interactive Debugging & Refactoring:** Utilizing Code0 to dissect stack traces, isolate failing tests, and refactor code to adhere strictly to defense-in-depth principles.
4. **Verifiable Test Execution:** Running test suites repeatedly within Code0 until all 85 tests passed cleanly with zero regressions.

---

## 🛠️ 5 Specific Tasks Developed with Code0

### Task 1: Date Clamping & Inclusive Expiry Day Engine (Algorithm Refactoring)
* **Goal:** Calculate calendar-month warranty durations that correctly handle variable month lengths and leap years without month-overflow bugs.
* **Code0 Initial Proposal:** Code0 initially recommended using native JavaScript `Date.setMonth(date.getMonth() + durationMonths)`.
* **Engineering Review & Issue Identified:** Identified that native `Date.setMonth()` causes severe date spillover bugs when adding months to end-of-month dates (e.g., `January 31` + 1 month rolls over into `March 2` or `March 3` instead of `February 28/29`).
* **Refinement & Solution:** Designed an authoritative `addMonthsClamped(date, months)` utility that calculates the target month's maximum valid day using `getDaysInMonth(year, month)` and clamps the day safely. Configured an inclusive expiry day policy where warranties remain `ACTIVE` through `23:59:59.999Z` of their expiration date.
* **Verification:** Generated 16 isolated unit tests in `server/src/utils/dateUtils.test.ts` testing 2024 leap years, 2026 non-leap years, and August 31 rollovers.

---

### Task 2: Dual-Mode Authentication Architecture (API Creation & Security)
* **Goal:** Enable reliable authentication across both same-origin local development and cross-origin environments where client and server may reside on different domains.
* **Code0 Initial Proposal:** Recommended relying exclusively on `HttpOnly` session cookies configured with `SameSite=none`.
* **Engineering Review & Issue Identified:** Modern browser privacy features (Safari ITP, Brave Shields, Chrome Privacy Sandbox) routinely block third-party cookies across distributed domains, causing silent session loss.
* **Refinement & Solution:** Architected a **dual-mode authentication mechanism**:
  1. The server sets an `HttpOnly`, `SameSite=none`, `Secure` cookie (`proofcart_session`).
  2. The server concurrently returns the JWT token in the JSON response body.
  3. The client Axios interceptor captures the token and attaches `Authorization: Bearer <token>` while preserving `withCredentials: true`.
  4. The server middleware inspects the cookie first, seamlessly falling back to the Bearer header if the cookie was suppressed.
* **Verification:** Built 13 integration tests in `auth.test.ts` validating successful authentication via both cookie and Bearer token headers.

---

### Task 3: Zero-Leakage 404 IDOR Protection (Database Integration & Authorization)
* **Goal:** Guarantee absolute data isolation between users across all purchases, documents, and service logs.
* **Code0 Initial Proposal:** Suggested returning `403 Forbidden` whenever a user queried a record ID that did not belong to their account.
* **Engineering Review & Issue Identified:** Returning `403 Forbidden` confirms to an attacker that the targeted record ID exists in the database, enabling automated ID harvesting and resource enumeration attacks.
* **Refinement & Solution:** Enforced strict multitenant database queries scoped to `{ _id: id, userId: req.user.id }`. If a record does not belong to the requesting user, the API responds with a generic `404 DOCUMENT_NOT_FOUND` rather than a `403`, eliminating information leakage.
* **Verification:** Implemented 12 integration tests in `purchase.test.ts` proving User B receives a `404` when attempting to access or delete User A's data.

---

### Task 4: Private Document Vault with Rollback Cleanup (Storage Architecture)
* **Goal:** Enable receipt and warranty invoice uploads without exposing sensitive user financial documents via public static web links.
* **Code0 Initial Proposal:** Suggested saving files directly to a public `public/uploads` directory using `multer.diskStorage` and returning static URLs.
* **Engineering Review & Issue Identified:** Invoices contain sensitive PII, physical addresses, and financial transaction numbers. Public URLs allow unauthorized access by guessing filenames.
* **Refinement & Solution:** Created a modular `IStorageProvider` abstraction. Files are assigned cryptographically random keys and stored in a private directory outside the public web root. Documents can only be downloaded via `GET /api/v1/documents/:id/download`, which validates user ownership before streaming. Added automatic file unlinking if database persistence fails during upload.
* **Verification:** Created 8 integration tests in `document.test.ts` testing file type whitelisting (PDF/JPEG/PNG), 5MB size limits, and authorized binary streaming.

---

### Task 5: Component Development & Accessible Dashboard UI (Frontend Engineering)
* **Goal:** Build reusable design system tokens and real-time dashboard widgets with responsive empty states and status indicators.
* **Code0 Initial Proposal:** Generated individual ad-hoc Tailwind styled elements across page files.
* **Engineering Review & Issue Identified:** Direct inline styling resulted in inconsistent color codes for warranty statuses across the dashboard, purchases table, and calendar views.
* **Refinement & Solution:** Refactored UI elements into reusable design system components (`Badge.tsx`, `Modal.tsx`, `EmptyState.tsx`). Standardized warranty status badges (`ACTIVE`, `EXPIRING_SOON`, `EXPIRED`, `NO_WARRANTY`) with semantic color tokens and accessible ARIA attributes.
* **Verification:** Wrote 9 React Testing Library component tests in `client/src/tests/components.test.tsx` verifying badge styling variants and empty state interactions.

---

## 🎯 Alignment with StartupMeu Evaluation Criteria

| Evaluation Criterion | Implementation in ProofCart |
|---|---|
| **MERN Proficiency** | Complete full-stack implementation using React 18, Vite, Node.js, Express.js, and MongoDB/Mongoose. Utilizes compound indexes (`userId + isArchived`), aggregation pipelines, and typed REST API contracts. |
| **Code Quality & Architecture** | Strict TypeScript throughout client and server. Feature-based modular monolith structure (`auth`, `purchases`, `documents`, `services`, `dashboard`, `notifications`). Zod input validation and centralized error handling. |
| **Problem Solving** | Solved real full-stack engineering challenges: month-end date clamping, cross-origin cookie suppression, zero-config in-memory database fallback, and multi-currency aggregation integrity. |
| **AI-Assisted Development** | Active, critical utilization of **Code0**. Used Code0 for component/API authoring, debugging stack traces and edge cases (e.g. `Date.setMonth` bug, cookie drops, IDOR leaks), and executing the **85-test automated test suite** directly in the Code0 environment. |
| **Git & GitHub Practices** | Clean semantic commit history (`feat:`, `fix:`, `test:`, `docs:`, `chore:`), structured monorepo organization, and all Git/GitHub operations executed via the **Code0 integrated terminal**. |
| **Technical Ownership** | Clear architectural rationale behind every decision documented in `docs/ARCHITECTURE.md`, `docs/API.md`, and `docs/TESTING.md`. Complete understanding of the entire codebase delivered. |

---

## ✅ Definition of Done Verification Checklist

- [x] **User Authentication:** Registration, login, profile management, and password update with BCrypt hashing.
- [x] **Dual-Mode Auth:** HttpOnly session cookies supported by Bearer token header fallback.
- [x] **Asset Inventory CRUD:** Create, Read, Update, Delete, Archive, and Restore purchases.
- [x] **Advanced Search & Filtering:** Full-text search across product name, model, retailer; multi-category and warranty status filters; paginated responses.
- [x] **Authoritative Date Engine:** Month-end clamping, leap year handling, and inclusive expiry day policy verified by unit tests.
- [x] **Return Deadline Engine:** Explicit return deadline overrides with priority precedence over automated periods.
- [x] **Private Document Vault:** Upload invoices/warranties (PDF/JPEG/PNG), authorized binary stream downloads, and orphan cleanup on failure.
- [x] **Service & Repair Records:** Log maintenance records, costs, and claim outcomes with cascading referential integrity.
- [x] **Multi-Currency Analytics:** Accurate aggregation grouping by currency without mixed sum illusions.
- [x] **Interactive Calendar:** Visual chronological view of upcoming warranty and return deadlines.
- [x] **Idempotent Background Jobs:** Automated scheduled reminder notifications (30d, 7d, 1d) with compound unique index safeguards.
- [x] **IDOR Security:** 100% multitenant query isolation returning `404` for unauthorized resources.
- [x] **Zero-Config Database:** Dynamic in-memory MongoDB fallback for instant local evaluation.
- [x] **Automated Test Suite:** 85 passing tests across unit, API integration, and frontend components.
- [x] **Documentation:** Comprehensive `README.md`, `API.md`, `ARCHITECTURE.md`, and `TESTING.md`.

---

## 👨‍💻 Author & Project Credits

**Author:** Poorna Sai Sriharsha Perina  
**Project:** ProofCart — Personal Purchase & Warranty Vault  
**Candidate Evaluation:** StartupMeu Software Engineer Intern – MERN Stack Assessment

