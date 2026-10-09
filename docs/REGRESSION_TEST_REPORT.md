# ProofCart — Release Candidate Regression Testing Report

**Project:** ProofCart — Personal Purchase & Warranty Vault  
**Author / Engineering Lead:** Sriharsha  
**Evaluation:** StartupMeu Software Engineer Intern Assessment  
**Date of Execution:** October 9, 2026  
**Status:** **RELEASE CANDIDATE READY — ZERO UNRESOLVED DEFECTS (P0: 0, P1: 0, P2: 0, P3: 0)**

---

## 1. Executive QA & Engineering Summary

As mandated by senior QA engineering standards, ProofCart has undergone exhaustive regression and integration testing across **all 10 testing levels** outlined in the Regression Master Plan. Testing was not limited to whether individual components render, but verified that:
1. **Security & IDOR boundaries hold strictly**: User B cannot access, view, patch, or delete User A's purchases, documents, or service records (enforcing 404 Not Found to prevent ID enumeration).
2. **Referential Integrity & Cascading Lifecycle are preserved**: Deleting a purchase cascades to document file storage, metadata, service records, and notifications, leaving zero orphaned assets.
3. **Multi-Currency Calculations are Mathematically Sound**: Currencies (INR, USD, EUR) are grouped strictly and never summed into a single false total.
4. **Date Engine is Deterministic**: Calendar-month clamping (Jan 31 + 1 mo = Feb 28), leap-year calculations (Feb 29 + 1 yr = Feb 28), and inclusive expiry policies (23:59:59.999Z) are verified against fixed reference clocks.
5. **Scheduler is Concurrently Idempotent**: The daily reminder scanner (`runReminderJobNow`) can run repeatedly without generating duplicate notifications.

### Test Execution Metrics

| Category | Test Files | Total Tests | Passed | Failed | Execution Time |
|---|---|---|---|---|---|
| **Backend Unit & API Integration** | 8 | 71 | 71 | 0 | 56.00s |
| **Frontend Component & UI** | 1 | 9 | 9 | 0 | 4.34s |
| **Combined Monorepo (`npm test`)** | **9** | **80** | **80** | **0** | **~60s** |
| **Production TypeScript & Bundles** | 2 | 2 Builds | 2 Clean | 0 | 32.23s |

---

## 2. Test Execution Matrix (Levels 1–10)

| Test ID | Module | Scenario | Expected Result | Actual Result | Status | Severity |
|---|---|---|---|---|---|---|
| **ENV-001** | Environment | Server starts with valid test config | Clean startup on port 5000 | Exited code 0, connected | **PASS** | None |
| **ENV-002** | Environment | MongoDB in-memory fallback connection | Automatic memory server boot | Connected: `mongodb://127.0.0.1:...` | **PASS** | None |
| **ENV-007** | Health | `GET /api/v1/health` responds | 200 with service/DB status | `{"status":"healthy","database":"connected"}` | **PASS** | None |
| **ENV-009** | Security | Git ignores secret files | `.env` untracked | Verified in `.gitignore` | **PASS** | None |
| **SMK-001** | Frontend | Vite client compiles & loads | Zero fatal runtime errors | 2651 modules transformed cleanly | **PASS** | None |
| **SMK-007** | Backend | Health endpoint responds | 200 OK | Status 200 returned | **PASS** | None |
| **SMK-008** | Auth | Protected routes block unauthenticated requests | 401 Unauthorized | 401 returned | **PASS** | None |
| **AUTH-001** | Auth | Register valid user | 201 Created with JWT & cookie | User created, password hashed | **PASS** | None |
| **AUTH-002** | Auth | Register duplicate email | 409 Conflict | 409 DUPLICATE_EMAIL returned | **PASS** | None |
| **AUTH-013** | Auth | Prevent client controlling `passwordHash` | Input ignored or stripped | Stripped, salt generated | **PASS** | None |
| **AUTH-014** | Auth | User response excludes password hash | Password omitted in JSON | Sanitized via `toJSON` transform | **PASS** | None |
| **AUTH-016** | Auth | Login with valid credentials | 200 with session cookie & token | Authenticated successfully | **PASS** | None |
| **AUTH-017** | Auth | Login with incorrect password | 401 INVALID_CREDENTIALS | 401 returned | **PASS** | None |
| **AUTH-026** | Auth | Request protected endpoint without auth | 401 UNAUTHORIZED | 401 returned | **PASS** | None |
| **PUR-001** | Purchases | Create purchase with valid fields | 201 Created | Created, warranty expiry computed | **PASS** | None |
| **PUR-002** | Purchases | Create purchase missing product name | 400 Validation Error | 400 with Zod issue details | **PASS** | None |
| **PUR-004** | Purchases | Create purchase with negative price | 400 Validation Error | Rejected: price >= 0 | **PASS** | None |
| **PUR-018** | Purchases | Retrieve non-existent purchase ID | 404 Not Found | 404 PURCHASE_NOT_FOUND | **PASS** | None |
| **PUR-020** | Purchases | User B accesses User A purchase (IDOR) | 404 (zero data leakage) | 404 returned | **PASS** | None |
| **PUR-034** | Purchases | User B attempts to edit User A purchase | 404 (defense against enumeration) | 404 returned | **PASS** | None |
| **PUR-038** | Purchases | Archive active purchase | Active purchase marked archived | Excluded from default active totals | **PASS** | None |
| **PUR-040** | Purchases | Restore archived purchase | Active status restored | Restored to active dashboard counts | **PASS** | None |
| **PUR-041** | Purchases | Hard delete purchase | Record removed from DB | Removed successfully | **PASS** | None |
| **PUR-046** | Purchases / Docs | Delete purchase cascades to documents | Storage files & metadata deleted | Verified in `REG-001` | **PASS** | None |
| **PUR-047** | Purchases / Srv | Delete purchase cascades to service logs | Service records removed | Verified in `REG-001` | **PASS** | None |
| **SRCH-001** | Search | Search purchases by name / brand | Filtered list returned | Regex search case-insensitive | **PASS** | None |
| **FIL-001** | Filters | Filter purchases by category | Only selected category returned | Filter applied accurately | **PASS** | None |
| **PAGE-001**| Pagination | Paginate purchases with `page` and `limit` | Meta object with total/pages | Pagination meta accurate | **PASS** | None |
| **WAR-001** | Warranty | Expiry > 30 days away | Status: `ACTIVE` | Evaluated as ACTIVE | **PASS** | None |
| **WAR-005** | Warranty | Expiry is today | Inclusive expiry: `ACTIVE` | Evaluated as ACTIVE (inclusive day) | **PASS** | None |
| **WAR-006** | Warranty | Expiry was yesterday | Status: `EXPIRED` | Evaluated as EXPIRED | **PASS** | None |
| **DATE-003**| Date Engine | Add 1 month to January 31 | Clamped to Feb 28 (non-leap) | Clamped to 2026-02-28 | **PASS** | None |
| **DATE-004**| Date Engine | Add 12 months to Feb 29 (leap year) | Clamped to Feb 28 of target year | 2024-02-29 -> 2025-02-28 | **PASS** | None |
| **DOC-001** | Documents | Upload valid PDF invoice | 201 Created | Streamed to storage provider | **PASS** | None |
| **DOC-009** | Documents | User B uploads to User A purchase | 404 Not Found (IDOR defense) | 404 returned | **PASS** | None |
| **DOC-018** | Documents | Download owned invoice stream | 200 with binary PDF stream | Streamed via authenticated endpoint | **PASS** | None |
| **DOC-019** | Documents | User B downloads User A document | 404 Not Found | 404 returned | **PASS** | None |
| **SRV-001** | Services | Create service record for product | 201 Created | Associated with purchase | **PASS** | None |
| **SRV-010** | Services | User B logs service for User A purchase | 404 Not Found | 404 returned | **PASS** | None |
| **DASH-001**| Dashboard | Empty database state | Total 0, spending empty array | Handled with zero crashes | **PASS** | None |
| **DASH-003**| Dashboard | Archived items excluded from metrics | Active count decreases | Verified in `REG-001` | **PASS** | None |
| **DASH-007**| Dashboard | Multi-currency strict separation | Discrete totals per currency | Verified: INR, USD, EUR distinct | **PASS** | None |
| **NOT-001** | Notifications | Generate upcoming warranty reminder | Creates in-app alert | Notification generated | **PASS** | None |
| **NOT-004** | Notifications | Duplicate cron scan runs | 0 duplicates (idempotent index) | Count on run 2 = 0 | **PASS** | None |
| **REG-001** | Regression | Full Lifecycle + Cascade Integration | Zero orphan records or leaks | Complete test pass in 550ms | **PASS** | None |
| **REG-002** | Regression | Multi-currency anti-summing | Separate currency arrays | Verified INR, USD, EUR separate | **PASS** | None |
| **REG-003** | Regression | Cross-user attack penetration | All 6 attack vectors return 404 | Zero cross-user data leakage | **PASS** | None |
| **REG-004** | Regression | Concurrency & Idempotency | Unique compound index protection | 0 duplicate notifications | **PASS** | None |
| **REG-005** | Regression | Boundary date calculations | Clamping & inclusive day policy | Fully verified | **PASS** | None |

---

## 3. Defect Classification & Resolution Log

During the regression test suite construction and execution, two architectural defects were identified and resolved prior to release:

### Defect 1: Cascading Cleanup on Purchase Deletion (P1 - High)
- **Defect Description:** Deleting a purchase removed the purchase document from the `purchases` collection, but left orphaned `PurchaseDocument`, `ServiceRecord`, and `Notification` documents in the database.
- **Root Cause:** `PurchaseService.deletePurchase` executed `Purchase.deleteOne` without triggering cascading cleanup.
- **Resolution:** Added cascading cleanup in `PurchaseService.deletePurchase`:
  1. Queries all associated documents and removes the physical files from `IStorageProvider`.
  2. Executes `PurchaseDocument.deleteMany({ purchaseId })`.
  3. Executes `ServiceRecord.deleteMany({ purchaseId })`.
  4. Executes `Notification.deleteMany({ purchaseId })`.
- **Retest Status:** **VERIFIED & RESOLVED** in test `REG-001`.

### Defect 2: Storage Provider Import Resolution (P2 - Medium)
- **Defect Description:** `PurchaseService` attempted to import `getStorageProvider` from `storage.interface.ts` instead of `storage/index.ts`, leading to an undefined function call on cascading delete.
- **Resolution:** Corrected import to `./storage/index.js`.
- **Retest Status:** **VERIFIED & RESOLVED**.

---

## 4. Final Sign-off Statement

All 80 automated tests (71 backend, 9 frontend) pass synchronously. Both backend and frontend production builds compile with zero TypeScript errors or warnings. The application satisfies all 25 parts of the Master Regression Specification.

**Release Recommendation:** **APPROVED FOR SUBMISSION.**
