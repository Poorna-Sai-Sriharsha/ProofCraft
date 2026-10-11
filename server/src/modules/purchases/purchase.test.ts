import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { connectDatabase, disconnectDatabase } from '../../config/database.js';
import { User } from '../auth/user.model.js';
import { Purchase } from './purchase.model.js';

describe('Purchase APIs & IDOR Cross-User Authorization Tests', () => {
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
    await Purchase.deleteMany({});
    await User.deleteMany({});

    // Register User A
    const resA = await request(app).post('/api/v1/auth/register').send({
      name: 'User A',
      email: 'usera@example.com',
      password: 'Password123!',
    });
    userAToken = resA.body.data.token;
    userAId = resA.body.data.user.id;

    // Register User B
    const resB = await request(app).post('/api/v1/auth/register').send({
      name: 'User B',
      email: 'userb@example.com',
      password: 'Password123!',
    });
    userBToken = resB.body.data.token;
    userBId = resB.body.data.user.id;
  });

  describe('POST /api/v1/purchases', () => {
    it('should create a purchase and compute warranty expiry and return deadline', async () => {
      const payload = {
        productName: 'Dell XPS 15',
        brand: 'Dell',
        category: 'Electronics',
        purchasePrice: 120000,
        currency: 'INR',
        purchaseDate: '2026-01-15',
        retailer: 'Dell India Store',
        returnWindowDays: 14,
        warrantyStatus: 'ACTIVE',
        warrantyDurationMonths: 12,
        warrantyProvider: 'Dell CompleteCare',
        notes: 'Office workstation',
      };

      const res = await request(app)
        .post('/api/v1/purchases')
        .set('Authorization', `Bearer ${userAToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.productName).toBe('Dell XPS 15');
      expect(res.body.data.purchasePrice).toBe(120000);
      expect(res.body.data.currency).toBe('INR');

      // Check calculated dates
      expect(res.body.data.returnDeadline).toBeDefined();
      expect(res.body.data.warrantyExpiryDate).toBeDefined();
      // Jan 15 2026 + 12 months = Jan 15 2027
      expect(res.body.data.warrantyExpiryDate.startsWith('2027-01-15')).toBe(true);
    });

    it('should reject purchase with negative price', async () => {
      const res = await request(app)
        .post('/api/v1/purchases')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          productName: 'Bad Item',
          category: 'Misc',
          purchasePrice: -500,
          purchaseDate: '2026-01-15',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject purchase with missing product name', async () => {
      const res = await request(app)
        .post('/api/v1/purchases')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          category: 'Misc',
          purchasePrice: 100,
          purchaseDate: '2026-01-15',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/purchases with search, filter, and pagination', () => {
    beforeEach(async () => {
      // Seed purchases for User A
      await request(app)
        .post('/api/v1/purchases')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          productName: 'Sony WH-1000XM5 Headphones',
          brand: 'Sony',
          category: 'Audio',
          purchasePrice: 28000,
          currency: 'INR',
          purchaseDate: '2026-02-10',
          warrantyDurationMonths: 12,
        });

      await request(app)
        .post('/api/v1/purchases')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          productName: 'Logitech MX Master 3S',
          brand: 'Logitech',
          category: 'Accessories',
          purchasePrice: 8500,
          currency: 'INR',
          purchaseDate: '2026-03-01',
          warrantyDurationMonths: 24,
        });

      // Seed purchase for User B
      await request(app)
        .post('/api/v1/purchases')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          productName: 'Apple iPhone 16 Pro',
          brand: 'Apple',
          category: 'Mobile',
          purchasePrice: 119900,
          currency: 'INR',
          purchaseDate: '2026-04-01',
        });
    });

    it('should list only User A purchases and support search', async () => {
      const res = await request(app)
        .get('/api/v1/purchases?search=Sony')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].productName).toContain('Sony');
      expect(res.body.meta.total).toBe(1);
    });

    it('should filter by category', async () => {
      const res = await request(app)
        .get('/api/v1/purchases?category=Accessories')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].productName).toContain('Logitech');
    });

    it('should not leak User B purchases to User A in list query', async () => {
      const res = await request(app)
        .get('/api/v1/purchases')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      const containsApple = res.body.data.some((p: any) => p.productName.includes('iPhone'));
      expect(containsApple).toBe(false);
    });
  });

  describe('MANDATORY IDOR Cross-User Authorization Verification (Part 14.4)', () => {
    let userAPurchaseId: string;

    beforeEach(async () => {
      const createRes = await request(app)
        .post('/api/v1/purchases')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          productName: 'MacBook Pro M3 Max',
          brand: 'Apple',
          category: 'Computers',
          purchasePrice: 349900,
          currency: 'INR',
          purchaseDate: '2026-01-20',
          warrantyDurationMonths: 36,
        });
      userAPurchaseId = createRes.body.data.id;
    });

    it('User A can view their own purchase', async () => {
      const res = await request(app)
        .get(`/api/v1/purchases/${userAPurchaseId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.productName).toBe('MacBook Pro M3 Max');
    });

    it('CRITICAL: User B cannot view User A purchase (returns 404)', async () => {
      const res = await request(app)
        .get(`/api/v1/purchases/${userAPurchaseId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('PURCHASE_NOT_FOUND');
    });

    it('CRITICAL: User B cannot update User A purchase (returns 404)', async () => {
      const res = await request(app)
        .patch(`/api/v1/purchases/${userAPurchaseId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ productName: 'Hacked Product Name' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('PURCHASE_NOT_FOUND');
    });

    it('CRITICAL: User B cannot archive User A purchase (returns 404)', async () => {
      const res = await request(app)
        .patch(`/api/v1/purchases/${userAPurchaseId}/archive`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('CRITICAL: User B cannot delete User A purchase (returns 404)', async () => {
      const res = await request(app)
        .delete(`/api/v1/purchases/${userAPurchaseId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);

      // Verify the record is still intact for User A
      const verifyRes = await request(app)
        .get(`/api/v1/purchases/${userAPurchaseId}`)
        .set('Authorization', `Bearer ${userAToken}`);
      expect(verifyRes.status).toBe(200);
    });

    it('User A can successfully archive, restore, and delete their own purchase', async () => {
      // Archive
      const archiveRes = await request(app)
        .patch(`/api/v1/purchases/${userAPurchaseId}/archive`)
        .set('Authorization', `Bearer ${userAToken}`);
      expect(archiveRes.status).toBe(200);
      expect(archiveRes.body.data.archivedAt).toBeDefined();

      // Restore
      const restoreRes = await request(app)
        .patch(`/api/v1/purchases/${userAPurchaseId}/restore`)
        .set('Authorization', `Bearer ${userAToken}`);
      expect(restoreRes.status).toBe(200);
      expect(restoreRes.body.data.archivedAt).toBeFalsy();

      // Delete
      const deleteRes = await request(app)
        .delete(`/api/v1/purchases/${userAPurchaseId}`)
        .set('Authorization', `Bearer ${userAToken}`);
      expect(deleteRes.status).toBe(200);
    });

    it('UX-09: should filter purchases by onlyArchived', async () => {
      // Archive purchase
      await request(app)
        .patch(`/api/v1/purchases/${userAPurchaseId}/archive`)
        .set('Authorization', `Bearer ${userAToken}`);

      // Default query excludes archived
      const activeRes = await request(app)
        .get('/api/v1/purchases')
        .set('Authorization', `Bearer ${userAToken}`);
      expect(activeRes.body.data.length).toBe(0);

      // onlyArchived=true returns archived items
      const archivedRes = await request(app)
        .get('/api/v1/purchases?onlyArchived=true')
        .set('Authorization', `Bearer ${userAToken}`);
      expect(archivedRes.body.data.length).toBe(1);
      expect(archivedRes.body.data[0].id).toBe(userAPurchaseId);
    });

    it('SaaS-04: should export purchases to CSV with correct headers and data', async () => {
      const res = await request(app)
        .get('/api/v1/purchases/export')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('proofcart_inventory.csv');
      expect(res.text).toContain('ID,Product Name,Brand,Category');
      expect(res.text).toContain('MacBook Pro M3 Max');
    });
  });
});
