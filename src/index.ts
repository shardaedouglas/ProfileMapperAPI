import express, { Request, Response } from 'express';
import { MatchRequestSchema, MatchResponse } from './types';
import { matchProfiles } from './matching';
import { ZodError } from 'zod';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.post('/match', (req: Request, res: Response) => {
  try {
    const data = MatchRequestSchema.parse(req.body);
    const matches = matchProfiles(data.person, data.profiles);
    const response: MatchResponse = { matches };
    res.json(response);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: 'Validation Error',
        details: error.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
      });
      return;
    }
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

// Keep process alive
process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});

// Prevent exit on Windows
if (process.platform === 'win32') {
  process.stdin.resume();
}
