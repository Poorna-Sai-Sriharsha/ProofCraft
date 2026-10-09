import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { connectDatabase, disconnectDatabase } from '../../config/database.js';
import { User } from '../auth/user.model.js';
import { Purchase } from '../purchases/purchase.model.js';
import { ServiceRecord } from './service.model.js';

describe('Service Records & IDOR Authorization Tests', () => {
  const app = createApp();

  let userAToken: string;
  let userBToken: string;
  let userAPurchaseId: string;

  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  beforeEach(async () => {
    await ServiceRecord.deleteMany({});
    await Purchase.deleteMany({});
    await User.deleteMany({});

    // Register User A
    const resA = await request(app).post('/api/v1/auth/register').send({
      name: 'User A',
      email: 'usera@example.com',
      password: 'Password123!',
    });
    userAToken = resA.body.data.token;

    // Register User B
    const resB = await request(app).post('/api/v1/auth/register').send({
      name: 'User B',
      email: 'userb@example.com',
      password: 'Password123!',
    });
    userBToken = resB.body.data.token;

    // Create purchase for User A
    const pA = await request(app)
      .post('/api/v1/purchases')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        productName: 'Samsung Refrigerator',
        category: 'Appliances',
        purchasePrice: 45000,
        purchaseDate: '2025-05-10',
      });
    userAPurchaseId = pA.body.data.id;
  });

  describe('Create Service Record & IDOR', () => {
    it('should create a valid service record for User A', async () => {
      const res = await request(app)
        .post(`/api/v1/purchases/${userAPurchaseId}/services`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          serviceDate: '2026-02-15',
          serviceProvider: 'Samsung Official Support',
          issueDescription: 'Cooling fan making noise',
          repairDescription: 'Replaced compressor fan assembly under warranty',
          repairCost: 0,
          warrantyClaimStatus: 'APPROVED',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.serviceProvider).toBe('Samsung Official Support');
      expect(res.body.data.warrantyClaimStatus).toBe('APPROVED');
    });

    it('CRITICAL: should reject User B adding service record to User A purchase (404 IDOR)', async () => {
      const res = await request(app)
        .post(`/api/v1/purchases/${userAPurchaseId}/services`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          serviceDate: '2026-02-15',
          serviceProvider: 'Unauthorized Tech',
          issueDescription: 'Attempted tamper',
          repairCost: 100,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should reject negative repair cost', async () => {
      const res = await request(app)
        .post(`/api/v1/purchases/${userAPurchaseId}/services`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          serviceDate: '2026-02-15',
          serviceProvider: 'Local Repair',
          issueDescription: 'General checkup',
          repairCost: -200,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Service Record Listing and Operations', () => {
    let serviceRecordId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post(`/api/v1/purchases/${userAPurchaseId}/services`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          serviceDate: '2026-03-01',
          serviceProvider: 'Samsung Care',
          issueDescription: 'Sensor error',
          repairCost: 1500,
          warrantyClaimStatus: 'PENDING',
        });
      serviceRecordId = res.body.data.id;
    });

    it('should list service records for product', async () => {
      const res = await request(app)
        .get(`/api/v1/purchases/${userAPurchaseId}/services`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].serviceProvider).toBe('Samsung Care');
    });

    it('should list all service records across user purchases', async () => {
      const res = await request(app)
        .get('/api/v1/services')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.meta.total).toBe(1);
    });

    it('CRITICAL: should reject User B accessing User A service record (404 IDOR)', async () => {
      const res = await request(app)
        .get(`/api/v1/services/${serviceRecordId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
    });

    it('should allow User A to update their service record', async () => {
      const res = await request(app)
        .patch(`/api/v1/services/${serviceRecordId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          warrantyClaimStatus: 'APPROVED',
          repairCost: 0,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.warrantyClaimStatus).toBe('APPROVED');
      expect(res.body.data.repairCost).toBe(0);
    });

    it('should allow User A to delete their service record', async () => {
      const res = await request(app)
        .delete(`/api/v1/services/${serviceRecordId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);

      const verifyRes = await request(app)
        .get(`/api/v1/services/${serviceRecordId}`)
        .set('Authorization', `Bearer ${userAToken}`);
      expect(verifyRes.status).toBe(404);
    });
  });
});
