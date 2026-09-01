import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from './server.js';

function binaryParser(res, callback) {
  res.setEncoding('binary');
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => { callback(null, Buffer.from(data, 'binary')); });
}

const validPayload = {
  candidateName: 'Jane Doe',
  candidateEmail: 'jane@example.com',
  candidateContact: '+919876543210',
  designation: 'Senior Data Scientist',
  ctcLakhs: 12.5,
  dateOfJoining: '2027-01-01',
  postingLocation: 'ganit_office',
  retentionPay: { mode: 'manual', amount: 0 },
  relocationBonus: { mode: 'manual', amount: 0 }
};

describe('POST /api/preview', () => {
  it('returns computed values for a valid payload', async () => {
    const res = await request(app).post('/api/preview').send(validPayload);
    expect(res.status).toBe(200);
    expect(res.body.values.NAME).toBe('Jane Doe');
    expect(res.body.values.CTC_WORDS).toBe('Twelve lakh fifty thousand');
    expect(res.body.flags.RETENTION_PAY_LINE).toBe(false);
  });

  it('returns 400 for an invalid payload', async () => {
    const res = await request(app).post('/api/preview').send({ ...validPayload, candidateEmail: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });
});

describe('POST /api/generate', () => {
  it('returns a zip containing pdf and docx for a valid payload', async () => {
    const res = await request(app)
      .post('/api/generate')
      .buffer(true)
      .parse(binaryParser)
      .send(validPayload);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/zip');
    expect(Buffer.isBuffer(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  }, 30000);

  it('returns 400 for an invalid payload without generating documents', async () => {
    const res = await request(app).post('/api/generate').send({ ...validPayload, ctcLakhs: 500 });
    expect(res.status).toBe(400);
  });
});
