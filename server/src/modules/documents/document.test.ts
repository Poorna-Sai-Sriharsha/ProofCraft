import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { connectDatabase, disconnectDatabase } from '../../config/database.js';
import { User } from '../auth/user.model.js';
import { Purchase } from '../purchases/purchase.model.js';
import { PurchaseDocument } from './document.model.js';

describe('Document Management & IDOR Security Tests', () => {
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
    await PurchaseDocument.deleteMany({});
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
        productName: 'Sony Camera',
        category: 'Electronics',
        purchasePrice: 85000,
        purchaseDate: '2026-01-10',
      });
    userAPurchaseId = pA.body.data.id;
  });

  describe('Document Upload & IDOR checks', () => {
    it('should allow User A to upload a valid PDF invoice', async () => {
      const buffer = Buffer.from('%PDF-1.4 test invoice content');

      const res = await request(app)
        .post(`/api/v1/purchases/${userAPurchaseId}/documents`)
        .set('Authorization', `Bearer ${userAToken}`)
        .field('documentType', 'INVOICE')
        .attach('file', buffer, 'invoice.pdf');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.originalFilename).toBe('invoice.pdf');
      expect(res.body.data.documentType).toBe('INVOICE');
      expect(res.body.data.storageKey).toBeUndefined(); // Storage key hidden
    });

    it('CRITICAL: should reject User B uploading document to User A purchase (404 IDOR)', async () => {
      const buffer = Buffer.from('%PDF-1.4 malicious invoice');

      const res = await request(app)
        .post(`/api/v1/purchases/${userAPurchaseId}/documents`)
        .set('Authorization', `Bearer ${userBToken}`)
        .field('documentType', 'INVOICE')
        .attach('file', buffer, 'malicious.pdf');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should reject unsupported file types (e.g. text/plain)', async () => {
      const buffer = Buffer.from('plain text file');

      const res = await request(app)
        .post(`/api/v1/purchases/${userAPurchaseId}/documents`)
        .set('Authorization', `Bearer ${userAToken}`)
        .attach('file', buffer, 'notes.txt');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('SEC-06: should reject spoofed files where content signature does not match MIME type', async () => {
      // Named .pdf and sent as application/pdf, but contains non-PDF bytes
      const fakePdfBuffer = Buffer.from('NOT_A_REAL_PDF_HEADER_JUST_TEXT');

      const res = await request(app)
        .post(`/api/v1/purchases/${userAPurchaseId}/documents`)
        .set('Authorization', `Bearer ${userAToken}`)
        .field('documentType', 'INVOICE')
        .attach('file', fakePdfBuffer, 'spoofed.pdf');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_FILE_SIGNATURE');
    });
  });

  describe('Document Authorized Download & IDOR Protection', () => {
    let documentId: string;

    beforeEach(async () => {
      const buffer = Buffer.from('%PDF-1.4 private customer warranty certificate');
      const uploadRes = await request(app)
        .post(`/api/v1/purchases/${userAPurchaseId}/documents`)
        .set('Authorization', `Bearer ${userAToken}`)
        .field('documentType', 'WARRANTY_CERTIFICATE')
        .attach('file', buffer, 'warranty_cert.pdf');

      documentId = uploadRes.body.data.id;
    });

    it('should allow User A to download their own document stream', async () => {
      const res = await request(app)
        .get(`/api/v1/documents/${documentId}/download`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.headers['content-disposition']).toContain('warranty_cert.pdf');
      expect(res.body).toBeDefined();
    });

    it('CRITICAL: should reject unauthenticated download request (401)', async () => {
      const res = await request(app).get(`/api/v1/documents/${documentId}/download`);
      expect(res.status).toBe(401);
    });

    it('CRITICAL: should reject User B downloading User A private invoice (404 IDOR)', async () => {
      const res = await request(app)
        .get(`/api/v1/documents/${documentId}/download`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DOCUMENT_NOT_FOUND');
    });

    it('CRITICAL: should reject User B deleting User A document (404 IDOR)', async () => {
      const res = await request(app)
        .delete(`/api/v1/documents/${documentId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);

      // Verify still accessible by User A
      const verifyRes = await request(app)
        .get(`/api/v1/documents/${documentId}/download`)
        .set('Authorization', `Bearer ${userAToken}`);
      expect(verifyRes.status).toBe(200);
    });

    it('should allow User A to delete their document', async () => {
      const res = await request(app)
        .delete(`/api/v1/documents/${documentId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Should now be 404
      const verifyRes = await request(app)
        .get(`/api/v1/documents/${documentId}/download`)
        .set('Authorization', `Bearer ${userAToken}`);
      expect(verifyRes.status).toBe(404);
    });
  });
});
