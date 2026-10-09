import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { createApp } from '../../app.js';
import { connectDatabase, disconnectDatabase } from '../../config/database.js';
import { User } from '../auth/user.model.js';
import { Purchase } from '../purchases/purchase.model.js';
import { PurchaseDocument } from '../documents/document.model.js';
import { ServiceRecord } from '../services/service.model.js';
import { Notification } from '../notifications/notification.model.js';
import { runReminderJobNow } from '../../jobs/reminderJob.js';
import { addMonthsClamped, calculateWarrantyStatus } from '../../utils/dateUtils.js';

describe('Level 4–10 Master Regression Test Suite (QA Release Candidate)', () => {
  const app = createApp();

  let userAToken: string;
  let userBToken: string;
  let userAId: string;
  let userBId: string;

  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  beforeEach(async () => {
    await Notification.deleteMany({});
    await ServiceRecord.deleteMany({});
    await PurchaseDocument.deleteMany({});
    await Purchase.deleteMany({});
    await User.deleteMany({});

    // Register User A (Primary Owner)
    const resA = await request(app).post('/api/v1/auth/register').send({
      name: 'QA Lead User A',
      email: 'qa.user.a@example.com',
      password: 'StrongPassword123!',
    });
    userAToken = resA.body.data.token;
    userAId = resA.body.data.user.id;

    // Register User B (Adversary / Cross-User Tester)
    const resB = await request(app).post('/api/v1/auth/register').send({
      name: 'QA Adversary User B',
      email: 'qa.user.b@example.com',
      password: 'StrongPassword123!',
    });
    userBToken = resB.body.data.token;
    userBId = resB.body.data.user.id;
  });

  // =========================================================================
  // 1. COMPLEX LIFECYCLE & MUTATION INTEGRITY (Part 15.2, E2E-002)
  // =========================================================================
  describe('REG-001: End-to-End Lifecycle & Referential Integrity Sequence', () => {
    it('executes: Create -> Document -> Service -> Archive -> Restore -> Delete with zero state leaks', async () => {
      // 1. Create Purchase
      const purchaseRes = await request(app)
        .post('/api/v1/purchases')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          productName: 'MacBook Pro M3',
          brand: 'Apple',
          category: 'ELECTRONICS',
          purchaseDate: '2026-01-15',
          purchasePrice: 199900,
          currency: 'INR',
          warrantyDurationMonths: 12,
        });
      expect(purchaseRes.status).toBe(201);
      const purchaseId = purchaseRes.body.data.id;

      // 2. Upload Invoice Document (mounted on /api/v1/purchases/:id/documents)
      const testFilePath = path.join(process.cwd(), 'temp-reg-invoice.pdf');
      fs.writeFileSync(testFilePath, '%PDF-1.4 Mock Invoice Content for Regression');

      const docRes = await request(app)
        .post(`/api/v1/purchases/${purchaseId}/documents`)
        .set('Authorization', `Bearer ${userAToken}`)
        .attach('file', testFilePath);
      expect(docRes.status).toBe(201);
      const docId = docRes.body.data.id;
      if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);

      // 3. Add Service Record (mounted on /api/v1/purchases/:id/services)
      const serviceRes = await request(app)
        .post(`/api/v1/purchases/${purchaseId}/services`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          serviceDate: '2026-06-10',
          serviceProvider: 'Apple Care Mumbai',
          issueDescription: 'Battery optimization diagnostic',
          repairCost: 0,
          warrantyClaimStatus: 'APPROVED',
        });
      expect(serviceRes.status).toBe(201);
      const serviceId = serviceRes.body.data.id;

      // 4. Verify Active Dashboard Metrics
      let summaryRes = await request(app)
        .get('/api/v1/dashboard/summary')
        .set('Authorization', `Bearer ${userAToken}`);
      expect(summaryRes.body.data.totalPurchases).toBe(1);
      expect(summaryRes.body.data.totalSpentByCurrency[0]).toEqual({ currency: 'INR', amount: 199900 });

      // 5. Archive Purchase
      const archiveRes = await request(app)
        .patch(`/api/v1/purchases/${purchaseId}/archive`)
        .set('Authorization', `Bearer ${userAToken}`);
      expect(archiveRes.status).toBe(200);

      // 6. Verify Excluded from Active Dashboard
      summaryRes = await request(app)
        .get('/api/v1/dashboard/summary')
        .set('Authorization', `Bearer ${userAToken}`);
      expect(summaryRes.body.data.totalPurchases).toBe(0);
      expect(summaryRes.body.data.totalSpentByCurrency).toHaveLength(0);

      // 7. Restore Purchase
      const restoreRes = await request(app)
        .patch(`/api/v1/purchases/${purchaseId}/restore`)
        .set('Authorization', `Bearer ${userAToken}`);
      expect(restoreRes.status).toBe(200);

      summaryRes = await request(app)
        .get('/api/v1/dashboard/summary')
        .set('Authorization', `Bearer ${userAToken}`);
      expect(summaryRes.body.data.totalPurchases).toBe(1);

      // 8. Delete Purchase
      const deleteRes = await request(app)
        .delete(`/api/v1/purchases/${purchaseId}`)
        .set('Authorization', `Bearer ${userAToken}`);
      expect(deleteRes.status).toBe(200);

      // 9. Verify Cascading Inaccessibility: deleted purchase, document, and service cannot be fetched
      const getDeletedPurchase = await request(app)
        .get(`/api/v1/purchases/${purchaseId}`)
        .set('Authorization', `Bearer ${userAToken}`);
      expect(getDeletedPurchase.status).toBe(404);

      const getDeletedDoc = await request(app)
        .get(`/api/v1/documents/${docId}/download`)
        .set('Authorization', `Bearer ${userAToken}`);
      expect(getDeletedDoc.status).toBe(404);

      const getDeletedService = await request(app)
        .patch(`/api/v1/services/${serviceId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ repairCost: 500 });
      expect(getDeletedService.status).toBe(404);
    });
  });

  // =========================================================================
  // 2. MULTI-CURRENCY STRICT GROUPING & ISOLATION (Part 9.2)
  // =========================================================================
  describe('REG-002: Multi-Currency Arithmetic & Anti-Summing Verification', () => {
    it('strictly separates INR, USD, and EUR into discrete currency totals', async () => {
      // Purchase 1: INR 10,000
      await request(app).post('/api/v1/purchases').set('Authorization', `Bearer ${userAToken}`).send({
        productName: 'Monitor',
        category: 'ELECTRONICS',
        purchaseDate: '2026-02-01',
        purchasePrice: 10000,
        currency: 'INR',
        warrantyDurationMonths: 12,
      });

      // Purchase 2: USD 100
      await request(app).post('/api/v1/purchases').set('Authorization', `Bearer ${userAToken}`).send({
        productName: 'Headphones',
        category: 'AUDIO',
        purchaseDate: '2026-02-05',
        purchasePrice: 100,
        currency: 'USD',
        warrantyDurationMonths: 6,
      });

      // Purchase 3: EUR 50
      await request(app).post('/api/v1/purchases').set('Authorization', `Bearer ${userAToken}`).send({
        productName: 'Desk Mat',
        category: 'HOME',
        purchaseDate: '2026-02-10',
        purchasePrice: 50,
        currency: 'EUR',
        warrantyDurationMonths: 0,
      });

      const res = await request(app)
        .get('/api/v1/dashboard/summary')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      const spending = res.body.data.totalSpentByCurrency;

      // Must have exactly 3 separate objects, never mathematically summed into 10,150
      expect(spending).toHaveLength(3);
      expect(spending).toEqual(
        expect.arrayContaining([
          { currency: 'INR', amount: 10000 },
          { currency: 'USD', amount: 100 },
          { currency: 'EUR', amount: 50 },
        ])
      );
    });
  });

  // =========================================================================
  // 3. IDOR DEFENSE MATRIX (Part 13.1, E2E-006)
  // =========================================================================
  describe('REG-003: Comprehensive IDOR Attack Vector Penetration Matrix', () => {
    it('ensures User B receives 404 for all User A resources with zero data leak', async () => {
      // User A creates purchase
      const pRes = await request(app)
        .post('/api/v1/purchases')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          productName: 'Confidential Server',
          category: 'COMPUTING',
          purchaseDate: '2026-03-01',
          purchasePrice: 500000,
          currency: 'INR',
          warrantyDurationMonths: 36,
        });
      expect(pRes.status).toBe(201);
      const pId = pRes.body.data.id;

      // User A adds service record
      const sRes = await request(app)
        .post(`/api/v1/purchases/${pId}/services`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          serviceDate: '2026-04-01',
          serviceProvider: 'Internal Team',
          issueDescription: 'Classified upgrade',
        });
      expect(sRes.status).toBe(201);
      const sId = sRes.body.data.id;

      // 1. User B cannot view User A's purchase
      const attackGetPurchase = await request(app)
        .get(`/api/v1/purchases/${pId}`)
        .set('Authorization', `Bearer ${userBToken}`);
      expect(attackGetPurchase.status).toBe(404);

      // 2. User B cannot edit User A's purchase
      const attackPatchPurchase = await request(app)
        .patch(`/api/v1/purchases/${pId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ purchasePrice: 1 });
      expect(attackPatchPurchase.status).toBe(404);

      // 3. User B cannot delete User A's purchase
      const attackDeletePurchase = await request(app)
        .delete(`/api/v1/purchases/${pId}`)
        .set('Authorization', `Bearer ${userBToken}`);
      expect(attackDeletePurchase.status).toBe(404);

      // 4. User B cannot create service record under User A's purchase
      const attackCreateService = await request(app)
        .post(`/api/v1/purchases/${pId}/services`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          serviceDate: '2026-04-02',
          serviceProvider: 'Maintenance Staff',
          issueDescription: 'Hacked record',
        });
      expect(attackCreateService.status).toBe(404);

      // 5. User B cannot edit User A's service record
      const attackPatchService = await request(app)
        .patch(`/api/v1/services/${sId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ issueDescription: 'Tampered' });
      expect(attackPatchService.status).toBe(404);

      // 6. User B dashboard shows 0 purchases and 0 spend
      const userBDashboard = await request(app)
        .get('/api/v1/dashboard/summary')
        .set('Authorization', `Bearer ${userBToken}`);
      expect(userBDashboard.body.data.totalPurchases).toBe(0);
      expect(userBDashboard.body.data.totalSpentByCurrency).toHaveLength(0);
    });
  });

  // =========================================================================
  // 4. SCHEDULER IDEMPOTENCY & CONCURRENCY (Part 10.3, Part 16.2)
  // =========================================================================
  describe('REG-004: Reminder Job Concurrency & Idempotency Check', () => {
    it('executes reminder scan multiple times without generating duplicate notifications', async () => {
      // Create a purchase expiring in 7 days
      const referenceDate = new Date();
      const in7Days = new Date(referenceDate);
      in7Days.setDate(in7Days.getDate() + 7);

      await request(app)
        .post('/api/v1/purchases')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          productName: 'Expiring Item',
          category: 'ELECTRONICS',
          purchaseDate: '2025-10-09',
          purchasePrice: 15000,
          currency: 'INR',
          warrantyExpiryDate: in7Days.toISOString().split('T')[0],
          warrantyStatus: 'ACTIVE',
        });

      // Run reminder job pass 1
      const count1 = await runReminderJobNow();
      expect(count1).toBeGreaterThanOrEqual(1);

      // Run reminder job pass 2 immediately (Simulate duplicate cron execution)
      const count2 = await runReminderJobNow();
      // Should create 0 new notifications because unique index { purchaseId, type, reminderDaysBefore } prevents duplicates
      expect(count2).toBe(0);

      // Total notifications in DB for User A must exist
      const notifRes = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${userAToken}`);
      expect(Array.isArray(notifRes.body.data)).toBe(true);
      expect(notifRes.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // 5. DATE BOUNDARY & LEAP YEAR CORNER CASES (Part 6.2)
  // =========================================================================
  describe('REG-005: Date Engine Precision & Boundary Limits', () => {
    it('verifies leap year clamping and inclusive expiry policy', () => {
      // Leap year: 2024-02-29 + 12 months = 2025-02-28
      const leapStart = new Date('2024-02-29T00:00:00.000Z');
      const leapEnd = addMonthsClamped(leapStart, 12);
      expect(leapEnd.toISOString().split('T')[0]).toBe('2025-02-28');

      // Month end clamping: 2026-01-31 + 1 month = 2026-02-28
      const jan31 = new Date('2026-01-31T00:00:00.000Z');
      const febEnd = addMonthsClamped(jan31, 1);
      expect(febEnd.toISOString().split('T')[0]).toBe('2026-02-28');

      // Inclusive expiration day policy: Expiry on today is ACTIVE through 23:59:59.999Z
      const today = new Date('2026-10-09T14:30:00.000Z');
      const expiryToday = new Date('2026-10-09T00:00:00.000Z');
      const statusToday = calculateWarrantyStatus({ warrantyExpiryDate: expiryToday, referenceDate: today });
      expect(statusToday).toBe('ACTIVE');

      // Yesterday is EXPIRED
      const expiryYesterday = new Date('2026-10-08T00:00:00.000Z');
      const statusYesterday = calculateWarrantyStatus({ warrantyExpiryDate: expiryYesterday, referenceDate: today });
      expect(statusYesterday).toBe('EXPIRED');
    });
  });
});
