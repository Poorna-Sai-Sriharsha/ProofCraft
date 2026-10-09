# ProofCart REST API Specification (v1)

Base URL: `/api/v1`

All responses follow a standard envelope:
- **Success:**
  ```json
  {
    "success": true,
    "data": { ... },
    "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 } // (for paginated endpoints)
  }
  ```
- **Error:**
  ```json
  {
    "success": false,
    "error": {
      "code": "ERROR_CODE",
      "message": "Human-readable description.",
      "details": []
    }
  }
  ```

---

## 1. System & Health

### `GET /api/v1/health`
Checks server and database connection status.
- **Access:** Public
- **Response (200 / 503):**
  ```json
  {
    "success": true,
    "data": {
      "status": "healthy",
      "service": "proofcart-api",
      "version": "1.0.0",
      "database": "connected",
      "timestamp": "2026-10-09T20:50:00.000Z",
      "uptimeSeconds": 142
    }
  }
  ```

---

## 2. Authentication (`/api/v1/auth`)

### `POST /api/v1/auth/register`
Registers a new user and issues a session cookie + Bearer token.
- **Access:** Public
- **Rate Limit:** 30 requests / 15 minutes
- **Body:**
  ```json
  {
    "name": "Sriharsha Perin",
    "email": "sriharsha@proofcart.dev",
    "password": "Password123!"
  }
  ```
- **Response (201):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "670691234abcd5678ef01234",
        "name": "Sriharsha Perin",
        "email": "sriharsha@proofcart.dev"
      },
      "token": "eyJhbGciOi..."
    }
  }
  ```

### `POST /api/v1/auth/login`
Authenticates credentials.
- **Access:** Public
- **Body:**
  ```json
  {
    "email": "sriharsha@proofcart.dev",
    "password": "Password123!"
  }
  ```
- **Response (200):** Same user & token format as registration.

### `POST /api/v1/auth/logout`
Invalidates session and clears the `proofcart_session` cookie.
- **Access:** Public

### `GET /api/v1/auth/me`
Retrieves current authenticated user profile.
- **Access:** Authenticated (Cookie or `Authorization: Bearer <token>`)

### `PATCH /api/v1/auth/profile`
Updates user profile name.
- **Access:** Authenticated
- **Body:** `{ "name": "Updated Name" }`

### `PATCH /api/v1/auth/password`
Changes account password.
- **Access:** Authenticated
- **Body:**
  ```json
  {
    "currentPassword": "OldPassword123!",
    "newPassword": "NewPassword123!"
  }
  ```

### `DELETE /api/v1/auth/account`
Permanently deletes account and cascades removal of all purchases, documents, and logs.
- **Access:** Authenticated

---

## 3. Purchases (`/api/v1/purchases`)

All purchase operations strictly enforce user ownership.

### `POST /api/v1/purchases`
Creates a purchase and calculates warranty expiry, return deadline, and live warranty status.
- **Access:** Authenticated
- **Body:**
  ```json
  {
    "productName": "Dell XPS 15",
    "brand": "Dell",
    "category": "Electronics",
    "purchasePrice": 120000,
    "currency": "INR",
    "purchaseDate": "2026-01-15",
    "retailer": "Dell India",
    "returnWindowDays": 14,
    "warrantyStatus": "ACTIVE",
    "warrantyDurationMonths": 24,
    "warrantyProvider": "Dell ProSupport",
    "notes": "Work laptop"
  }
  ```

### `GET /api/v1/purchases`
Lists purchases for authenticated user.
- **Access:** Authenticated
- **Query Parameters:**
  - `page`: default `1`
  - `limit`: default `10`
  - `search`: string (matches productName, brand, modelNumber, serialNumber, retailer)
  - `category`: string filter
  - `status`: `ACTIVE` | `EXPIRED` | `NONE` | `UNKNOWN`
  - `startDate`, `endDate`: date range filters
  - `sortBy`: `purchaseDate` | `purchasePrice` | `productName` | `warrantyExpiryDate` | `createdAt`
  - `sortOrder`: `desc` | `asc`
  - `includeArchived`: `true` | `false` (default false)

### `GET /api/v1/purchases/:id`
Retrieves details of a single purchase record. Returns 404 if not found or belongs to another user (IDOR prevention).

### `PATCH /api/v1/purchases/:id`
Updates purchase details and recalculates dates if modified.

### `PATCH /api/v1/purchases/:id/archive`
Archives a purchase (hiding it from dashboard totals).

### `PATCH /api/v1/purchases/:id/restore`
Restores an archived purchase.

### `DELETE /api/v1/purchases/:id`
Permanently deletes purchase and all attached documents and service logs.

---

## 4. Documents (`/api/v1/purchases/:id/documents` and `/api/v1/documents`)

### `POST /api/v1/purchases/:id/documents`
Uploads a document attached to a purchase.
- **Access:** Authenticated (Owner of purchase)
- **Form Data:**
  - `file`: Binary file (PDF, JPEG, PNG, WEBP, up to 5MB)
  - `documentType`: `INVOICE` | `WARRANTY_CERTIFICATE` | `SERVICE_RECEIPT` | `OTHER`

### `GET /api/v1/purchases/:id/documents`
Lists metadata of documents attached to a purchase.

### `GET /api/v1/documents/:id/download`
Streams authorized file download directly from server storage with `Content-Disposition`.
- **Security:** Requires valid session. Returns 404 if accessed by unauthorized users. Raw URLs are never exposed.

### `DELETE /api/v1/documents/:id`
Removes document from database and unlinks physical file from storage.

---

## 5. Service & Repair Records (`/api/v1/services` and `/api/v1/purchases/:id/services`)

### `POST /api/v1/purchases/:id/services`
Logs maintenance or repair history.
- **Access:** Authenticated (Owner of purchase)
- **Body:**
  ```json
  {
    "serviceDate": "2026-03-01",
    "serviceProvider": "Samsung Authorized Center",
    "issueDescription": "Sensor replacement",
    "repairDescription": "Replaced thermostat sensor",
    "repairCost": 1200,
    "warrantyClaimStatus": "APPROVED"
  }
  ```

### `GET /api/v1/purchases/:id/services`
Lists service logs for one product.

### `GET /api/v1/services`
Lists all service records across all user purchases (paginated).

### `PATCH /api/v1/services/:id`
Updates a service record.

### `DELETE /api/v1/services/:id`
Deletes a service record.

---

## 6. Dashboard & Deadlines (`/api/v1/dashboard` & `/api/v1/deadlines`)

### `GET /api/v1/dashboard/summary`
Returns dashboard summary metrics computed from live database records:
```json
{
  "totalPurchases": 12,
  "totalSpentByCurrency": [{ "currency": "INR", "amount": 142000 }],
  "activeWarranties": 7,
  "expiringSoon": 2,
  "expiredWarranties": 2,
  "unknownWarranty": 1,
  "noWarranty": 0
}
```

### `GET /api/v1/dashboard/spending`
Returns aggregated expenditure grouped by category per currency.

### `GET /api/v1/dashboard/warranties`
Returns warranty health distribution breakdown.

### `GET /api/v1/dashboard/recent-purchases`
Returns top 5 most recent active purchases.

### `GET /api/v1/deadlines?days=90`
Returns upcoming warranty expiry and return deadlines sorted chronologically (nearest first).

---

## 7. Notifications (`/api/v1/notifications`)

### `GET /api/v1/notifications`
Lists reminders for authenticated user.

### `GET /api/v1/notifications/unread-count`
Returns count of unread notifications.

### `PATCH /api/v1/notifications/:id/read`
Marks single notification as read.

### `PATCH /api/v1/notifications/read-all`
Marks all user notifications as read.

### `DELETE /api/v1/notifications/:id`
Deletes a notification.
