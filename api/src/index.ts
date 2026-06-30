import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { default: express } = await import('express');
const { default: cors } = await import('cors');
const { adminRouter } = await import('./routes/admin.js');
const { publicRouter } = await import('./routes/public.js');

const app = express();
const PORT = parseInt(process.env.API_PORT || '3001');

app.use(cors());
app.use(express.json());

app.use('/api/admin', adminRouter);
app.use('/api', publicRouter);

app.get('/api/health', (_req: any, res: any) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`zkGate API running on http://localhost:${PORT}`);
  console.log(`Admin: http://localhost:${PORT}/api/admin`);
  console.log(`Public: http://localhost:${PORT}/api`);
});
