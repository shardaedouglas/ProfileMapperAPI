import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import { Server } from 'http';
import { MatchRequestSchema } from '../src/types';
import { matchProfiles } from '../src/matching';

// Import the app setup
const app = express();
app.use(express.json());

app.post('/match', (req, res) => {
  try {
    const validation = MatchRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validation.error.errors,
      });
    }
    const { person, profiles } = validation.data;
    const matches = matchProfiles(person, profiles);
    return res.json({ matches });
  } catch (error) {
    console.error('Error processing request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Test helpers
let server: Server;
let baseUrl: string;

async function makeRequest(path: string, options: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const data = await response.json();
  return { status: response.status, data };
}

describe('API Integration Tests', () => {
  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(() => {
    server.close();
  });

  // ==================== HEALTH CHECK ====================
  
  describe('GET /health', () => {
    it('returns ok status', async () => {
      const { status, data } = await makeRequest('/health');
      expect(status).toBe(200);
      expect(data).toEqual({ status: 'ok' });
    });
  });

  // ==================== VALID REQUESTS ====================

  describe('POST /match - valid requests', () => {
    it('spec example request', async () => {
      const { status, data } = await makeRequest('/match', {
        method: 'POST',
        body: JSON.stringify({
          person: {
            name: 'Jane Doe',
            email: 'jane.doe@example.com',
            location: 'San Francisco, CA',
            employer: 'Acme Corp',
          },
          profiles: [
            {
              platform: 'linkedin',
              username: 'janedoe',
              display_name: 'Jane Doe',
              bio: 'Software Engineer at Acme Corp',
              location: 'San Francisco Bay Area',
            },
            {
              platform: 'twitter',
              username: 'jdoe1985',
              display_name: 'J. Doe',
              bio: 'Coffee enthusiast',
              location: 'NYC',
            },
          ],
        }),
      });

      expect(status).toBe(200);
      expect(data.matches).toBeDefined();
      expect(data.matches.length).toBe(2);
      expect(data.matches[0].profile.platform).toBe('linkedin');
      expect(data.matches[0].score).toBeGreaterThanOrEqual(0.9);
      expect(data.matches[0].factors).toBeDefined();
    });

    it('minimal valid request (name only)', async () => {
      const { status, data } = await makeRequest('/match', {
        method: 'POST',
        body: JSON.stringify({
          person: { name: 'Jane' },
          profiles: [{ platform: 'x', username: 'jane', displayName: 'Jane' }],
        }),
      });

      expect(status).toBe(200);
      expect(data.matches[0].score).toBe(1);
    });

    it('all person fields populated', async () => {
      const { status, data } = await makeRequest('/match', {
        method: 'POST',
        body: JSON.stringify({
          person: {
            name: 'Jane Doe',
            email: 'janedoe@example.com',
            phone: '555-123-4567',
            location: 'San Francisco',
            dateOfBirth: '1990-05-15',
            employer: 'Acme Corp',
            jobTitle: 'Software Engineer',
          },
          profiles: [
            {
              platform: 'linkedin',
              username: 'janedoe',
              displayName: 'Jane Doe',
              bio: 'Software Engineer at Acme Corp | Born 1990 | 5551234567',
              location: 'San Francisco, CA',
              profileUrl: 'https://linkedin.com/in/janedoe',
            },
          ],
        }),
      });

      expect(status).toBe(200);
      expect(data.matches[0].score).toBeGreaterThanOrEqual(0.95);
      
      // Verify all factors are reported
      expect(data.matches[0].factors).toHaveProperty('name_match');
      expect(data.matches[0].factors).toHaveProperty('email_username_match');
      expect(data.matches[0].factors).toHaveProperty('location_match');
      expect(data.matches[0].factors).toHaveProperty('employer_in_bio');
      expect(data.matches[0].factors).toHaveProperty('job_title_in_bio');
      expect(data.matches[0].factors).toHaveProperty('phone_in_bio');
      expect(data.matches[0].factors).toHaveProperty('dob_match');
    });

    it('snake_case field names', async () => {
      const { status, data } = await makeRequest('/match', {
        method: 'POST',
        body: JSON.stringify({
          person: { name: 'Jane Doe' },
          profiles: [
            {
              platform: 'linkedin',
              username: 'janedoe',
              display_name: 'Jane Doe',
              profile_url: 'https://linkedin.com/in/janedoe',
            },
          ],
        }),
      });

      expect(status).toBe(200);
      expect(data.matches[0].score).toBe(1);
    });

    it('multiple emails array', async () => {
      const { status, data } = await makeRequest('/match', {
        method: 'POST',
        body: JSON.stringify({
          person: {
            name: 'Jane',
            email: ['work@company.com', 'janedoe@personal.com'],
          },
          profiles: [{ platform: 'x', username: 'janedoe', displayName: 'Jane' }],
        }),
      });

      expect(status).toBe(200);
      expect(data.matches[0].factors.email_username_match).toBe(1);
    });

    it('multiple phones array', async () => {
      const { status, data } = await makeRequest('/match', {
        method: 'POST',
        body: JSON.stringify({
          person: {
            name: 'Jane',
            phone: ['555-111-1111', '555-222-2222'],
          },
          profiles: [
            {
              platform: 'x',
              username: 'jane',
              displayName: 'Jane',
              bio: 'Call me at 5552222222',
            },
          ],
        }),
      });

      expect(status).toBe(200);
      expect(data.matches[0].factors.phone_in_bio).toBe(1);
    });

    it('20 profiles (maximum allowed)', async () => {
      const profiles = Array.from({ length: 20 }, (_, i) => ({
        platform: 'test',
        username: `user${i}`,
        displayName: `User ${i}`,
      }));
      
      const { status, data } = await makeRequest('/match', {
        method: 'POST',
        body: JSON.stringify({
          person: { name: 'Test User' },
          profiles,
        }),
      });

      expect(status).toBe(200);
      expect(data.matches.length).toBe(20);
    });
  });

  // ==================== INVALID REQUESTS ====================

  describe('POST /match - invalid requests', () => {
    it('missing person object', async () => {
      const { status, data } = await makeRequest('/match', {
        method: 'POST',
        body: JSON.stringify({
          profiles: [{ platform: 'x', username: 'test', displayName: 'Test' }],
        }),
      });

      expect(status).toBe(400);
      expect(data.error).toBe('Invalid request');
    });

    it('missing profiles array', async () => {
      const { status, data } = await makeRequest('/match', {
        method: 'POST',
        body: JSON.stringify({
          person: { name: 'Test' },
        }),
      });

      expect(status).toBe(400);
      expect(data.error).toBe('Invalid request');
    });

    it('empty profiles array', async () => {
      const { status, data } = await makeRequest('/match', {
        method: 'POST',
        body: JSON.stringify({
          person: { name: 'Test' },
          profiles: [],
        }),
      });

      expect(status).toBe(400);
      expect(data.error).toBe('Invalid request');
    });

    it('too many profiles (21)', async () => {
      const profiles = Array.from({ length: 21 }, (_, i) => ({
        platform: 'test',
        username: `user${i}`,
        displayName: `User ${i}`,
      }));
      
      const { status, data } = await makeRequest('/match', {
        method: 'POST',
        body: JSON.stringify({
          person: { name: 'Test' },
          profiles,
        }),
      });

      expect(status).toBe(400);
      expect(data.error).toBe('Invalid request');
    });

    it('empty person object', async () => {
      const { status, data } = await makeRequest('/match', {
        method: 'POST',
        body: JSON.stringify({
          person: {},
          profiles: [{ platform: 'x', username: 'test', displayName: 'Test' }],
        }),
      });

      // Empty person should still work - just returns 0 scores
      expect(status).toBe(200);
    });

    it('profile missing required platform', async () => {
      const { status, data } = await makeRequest('/match', {
        method: 'POST',
        body: JSON.stringify({
          person: { name: 'Test' },
          profiles: [{ username: 'test', displayName: 'Test' }],
        }),
      });

      expect(status).toBe(400);
      expect(data.error).toBe('Invalid request');
    });

    it('profile missing required username', async () => {
      const { status, data } = await makeRequest('/match', {
        method: 'POST',
        body: JSON.stringify({
          person: { name: 'Test' },
          profiles: [{ platform: 'x', displayName: 'Test' }],
        }),
      });

      expect(status).toBe(400);
      expect(data.error).toBe('Invalid request');
    });

    it('empty body', async () => {
      const { status, data } = await makeRequest('/match', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      expect(status).toBe(400);
    });

    it('malformed JSON', async () => {
      const response = await fetch(`${baseUrl}/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{ invalid json }',
      });
      expect(response.status).toBe(400);
    });
  });

  // ==================== SCORE VALIDATION ====================

  describe('Score validation', () => {
    it('scores are between 0 and 1', async () => {
      const { status, data } = await makeRequest('/match', {
        method: 'POST',
        body: JSON.stringify({
          person: { name: 'Random Name' },
          profiles: [
            { platform: 'a', username: 'completely_different', displayName: 'No Match' },
            { platform: 'b', username: 'random', displayName: 'Random Name' },
          ],
        }),
      });

      expect(status).toBe(200);
      data.matches.forEach((result: any) => {
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
        
        Object.values(result.factors).forEach((factor: any) => {
          expect(factor).toBeGreaterThanOrEqual(0);
          expect(factor).toBeLessThanOrEqual(1);
        });
      });
    });

    it('results are sorted by score descending', async () => {
      const { status, data } = await makeRequest('/match', {
        method: 'POST',
        body: JSON.stringify({
          person: { name: 'Jane Doe', employer: 'Acme' },
          profiles: [
            { platform: 'c', username: 'noname', displayName: 'Someone Else' },
            { platform: 'a', username: 'jane', displayName: 'Jane', bio: 'Works at Acme' },
            { platform: 'b', username: 'janedoe', displayName: 'Jane Doe', bio: 'Engineer at Acme Corp' },
          ],
        }),
      });

      expect(status).toBe(200);
      for (let i = 1; i < data.matches.length; i++) {
        expect(data.matches[i - 1].score).toBeGreaterThanOrEqual(data.matches[i].score);
      }
    });
  });

  // ==================== EDGE CASES ====================

  describe('Edge cases', () => {
    it('unicode characters in all fields', async () => {
      const { status, data } = await makeRequest('/match', {
        method: 'POST',
        body: JSON.stringify({
          person: {
            name: 'José García',
            location: 'São Paulo',
            employer: 'Société Générale',
          },
          profiles: [
            {
              platform: 'linkedin',
              username: 'josegarcia',
              displayName: 'José García',
              location: 'São Paulo, Brazil',
              bio: 'Working at Société Générale',
            },
          ],
        }),
      });

      expect(status).toBe(200);
      expect(data.matches[0].score).toBeGreaterThanOrEqual(0.9);
    });

    it('very long bio text', async () => {
      const longBio = 'Software Engineer at Acme Corp. ' + 'This is padding. '.repeat(500);
      
      const { status, data } = await makeRequest('/match', {
        method: 'POST',
        body: JSON.stringify({
          person: { name: 'Jane', employer: 'Acme Corp' },
          profiles: [{ platform: 'x', username: 'jane', displayName: 'Jane', bio: longBio }],
        }),
      });

      expect(status).toBe(200);
      expect(data.matches[0].factors.employer_in_bio).toBe(1);
    });

    it('special characters in names', async () => {
      const { status, data } = await makeRequest('/match', {
        method: 'POST',
        body: JSON.stringify({
          person: { name: "O'Connor-Smith" },
          profiles: [{ platform: 'x', username: 'oconnor', displayName: "O'Connor-Smith" }],
        }),
      });

      expect(status).toBe(200);
      expect(data.matches[0].factors.name_match).toBe(1);
    });

    it('profile_url field is passed through', async () => {
      const { status, data } = await makeRequest('/match', {
        method: 'POST',
        body: JSON.stringify({
          person: { name: 'Test' },
          profiles: [
            {
              platform: 'linkedin',
              username: 'test',
              displayName: 'Test',
              profile_url: 'https://linkedin.com/in/test',
            },
          ],
        }),
      });

      expect(status).toBe(200);
      expect(data.matches[0].profile.profile_url).toBe('https://linkedin.com/in/test');
    });
  });
});
