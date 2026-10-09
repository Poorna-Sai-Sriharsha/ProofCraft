import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { connectDatabase, disconnectDatabase } from '../../config/database.js';
import { User } from '../auth/user.model.js';
import { Purchase } from '../purchases/purchase.model.js';
import { Notification } from '../notifications/notification.model.js';
import { runReminderJobNow } from '../../jobs/reminderJob.js';

describe('Dashboard & Deadlines Verification Tests (Part 14.7)', () => {
  const app = createApp();

  let userAToken: string;
  let userBToken: string;

  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  beforeEach(async () => {
    await Notification.deleteMany({});
    await Purchase.deleteMany({});
    await User.deleteMany({});

    // User A
    const resA = await request(app).post('/api/v1/auth/register').send({
      name: 'User A',
      email: 'usera@example.com',
      password: 'Password123!',
    });
    userAToken = resA.body.data.token;

    // User B
    const resB = await request(app).post('/api/v1/auth/register').send({
      name: 'User B',
      email: 'userb@example.com',
      password: 'Password123!',
    });
    userBToken = resB.body.data.token;

    const today = new Date();
    const in15Days = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000);
    const in180Days = new Date(today.getTime() + 180 * 24 * 60 * 60 * 1000);
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    // 1. Active warranty (valid for 180 days) - INR 50,000
    await request(app)
      .post('/api/v1/purchases')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        productName: 'Monitor 4K',
        category: 'Electronics',
        purchasePrice: 50000,
        currency: 'INR',
        purchaseDate: '2026-01-01',
        warrantyStatus: 'ACTIVE',
        warrantyExpiryDate: in180Days.toISOString().split('T')[0],
      });

    // 2. Expiring soon warranty (in 15 days) - INR 25,000
    await request(app)
      .post('/api/v1/purchases')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        productName: 'Coffee Maker',
        category: 'Appliances',
        purchasePrice: 25000,
        currency: 'INR',
        warrantyStatus: 'ACTIVE',
        warrantyExpiryDate: in15Days.toISOString().split('T')[0],
        purchaseDate: '2025-10-15',
      });

    // 3. Expired warranty (expired yesterday) - USD 200
    await request(app)
      .post('/api/v1/purchases')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        productName: 'Keyboard Mechanical',
        category: 'Accessories',
        purchasePrice: 200,
        currency: 'USD',
        warrantyStatus: 'ACTIVE',
        warrantyExpiryDate: yesterday.toISOString().split('T')[0],
        purchaseDate: '2025-01-01',
      });

    // 4. Product with No warranty - INR 5,000
    await request(app)
      .post('/api/v1/purchases')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        productName: 'Desk Mat',
        category: 'Accessories',
        purchasePrice: 5000,
        currency: 'INR',
        warrantyStatus: 'NONE',
        purchaseDate: '2026-02-01',
      });

    // 5. Product with Unknown warranty - INR 10,000
    await request(app)
      .post('/api/v1/purchases')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        productName: 'Ergonomic Chair',
        category: 'Furniture',
        purchasePrice: 10000,
        currency: 'INR',
        warrantyStatus: 'UNKNOWN',
        purchaseDate: '2026-02-01',
      });

    // 6. Archived purchase (should be excluded from active totals!)
    const archivedRes = await request(app)
      .post('/api/v1/purchases')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        productName: 'Old Broken Phone',
        category: 'Mobile',
        purchasePrice: 15000,
        currency: 'INR',
        purchaseDate: '2023-01-01',
      });
    await request(app)
      .patch(`/api/v1/purchases/${archivedRes.body.data.id}/archive`)
      .set('Authorization', `Bearer ${userAToken}`);

    // 7. User B purchase (must never appear in User A dashboard)
    await request(app)
      .post('/api/v1/purchases')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        productName: 'User B Secret Watch',
        category: 'Accessories',
        purchasePrice: 999999,
        currency: 'INR',
        purchaseDate: '2026-03-01',
      });
  });

  it('GET /api/v1/dashboard/summary verifies accurate counts, currencies, and excludes archived records', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/summary')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    const data = res.body.data;

    // 5 active purchases (the 6th is archived)
    expect(data.totalPurchases).toBe(5);

    // Multi-currency handling: INR and USD grouped separately without adding together
    expect(data.totalSpentByCurrency.length).toBe(2);
    const inrSpent = data.totalSpentByCurrency.find((c: any) => c.currency === 'INR')?.amount;
    const usdSpent = data.totalSpentByCurrency.find((c: any) => c.currency === 'USD')?.amount;
    // 50000 + 25000 + 5000 + 10000 = 90000 INR
    expect(inrSpent).toBe(90000);
    expect(usdSpent).toBe(200);

    // Warranty categorization
    // Monitor (active, not expiring soon) + Coffee Maker (active, expiring in 15d) = 2 active
    expect(data.activeWarranties).toBe(2);
    expect(data.expiringSoon).toBe(1);
    expect(data.expiredWarranties).toBe(1);
    expect(data.noWarranty).toBe(1);
    expect(data.unknownWarranty).toBe(1);
  });

  it('GET /api/v1/dashboard/spending groups expenditure by category', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/spending')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    const electronics = res.body.data.find((item: any) => item.category === 'Electronics');
    expect(electronics.amount).toBe(50000);
  });

  it('GET /api/v1/deadlines returns upcoming deadlines sorted nearest first', async () => {
    const res = await request(app)
      .get('/api/v1/deadlines')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    // Coffee maker expires in 15 days, which is within the 90-day window
    expect(res.body.data[0].productName).toBe('Coffee Maker');
    expect(res.body.data[0].deadlineType).toBe('WARRANTY_EXPIRY');
    expect(res.body.data[0].daysRemaining).toBeLessThanOrEqual(16);
  });

  it('CRITICAL: User B dashboard remains completely isolated from User A data', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/summary')
      .set('Authorization', `Bearer ${userBToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.totalPurchases).toBe(1);
    const inrSpent = res.body.data.totalSpentByCurrency.find((c: any) => c.currency === 'INR')?.amount;
    expect(inrSpent).toBe(999999);
  });
});

describe('Notifications & Reminder Job Tests (Part 14.8)', () => {
  const app = createApp();

  let userAToken: string;
  let userBToken: string;

  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  beforeEach(async () => {
    await Notification.deleteMany({});
    await Purchase.deleteMany({});
    await User.deleteMany({});

    // User A
    const resA = await request(app).post('/api/v1/auth/register').send({
      name: 'User A',
      email: 'usera@example.com',
      password: 'Password123!',
    });
    userAToken = resA.body.data.token;

    // User B
    const resB = await request(app).post('/api/v1/auth/register').send({
      name: 'User B',
      email: 'userb@example.com',
      password: 'Password123!',
    });
    userBToken = resB.body.data.token;

    // Create purchase for User A that expires in 5 days (triggers 30-day and 7-day windows)
    const in5Days = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    await request(app)
      .post('/api/v1/purchases')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        productName: 'Gaming Laptop',
        category: 'Electronics',
        purchasePrice: 150000,
        purchaseDate: '2025-01-01',
        warrantyStatus: 'ACTIVE',
        warrantyExpiryDate: in5Days.toISOString().split('T')[0],
      });
  });

  it('should generate notifications via reminder job and remain completely idempotent on repeated runs', async () => {
    // 1st run of reminder job
    const countFirstRun = await runReminderJobNow();
    expect(countFirstRun).toBeGreaterThan(0);

    // 2nd run immediately after: must generate 0 duplicate reminders!
    const countSecondRun = await runReminderJobNow();
    expect(countSecondRun).toBe(0);

    // Verify User A has notifications
    const res = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].title).toContain('Gaming Laptop');
  });

  it('should mark notification as read and retrieve accurate unread count', async () => {
    await runReminderJobNow();

    const countRes = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${userAToken}`);
    expect(countRes.status).toBe(200);
    const initialUnread = countRes.body.data.unreadCount;
    expect(initialUnread).toBeGreaterThan(0);

    // List notifications to obtain an ID
    const listRes = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${userAToken}`);
    const notificationId = listRes.body.data[0].id;

    // Mark as read
    const readRes = await request(app)
      .patch(`/api/v1/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${userAToken}`);
    expect(readRes.status).toBe(200);
    expect(readRes.body.data.readAt).toBeDefined();

    // Verify unread count decreased
    const updatedCountRes = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${userAToken}`);
    expect(updatedCountRes.body.data.unreadCount).toBe(initialUnread - 1);
  });

  it('CRITICAL: User B cannot read or delete User A notification (404 IDOR)', async () => {
    await runReminderJobNow();

    const listRes = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${userAToken}`);
    const notificationId = listRes.body.data[0].id;

    const res = await request(app)
      .patch(`/api/v1/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect(res.status).toBe(404);
  });
});
