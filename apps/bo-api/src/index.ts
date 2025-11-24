import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { createDashboardRouter } from './routes/dashboard';
import { createContentsRouter } from './routes/contents';
import { createUsersRouter } from './routes/users';
import { createRecordsRouter } from './routes/records';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors({
  origin: ['http://localhost:4000'], // Admin FE
  credentials: true
}));
app.use(express.json());

// Supabase Admin Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing Supabase credentials in .env');
  console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('✅ Supabase Admin Client initialized');

// Routes
app.use('/api/dashboard', createDashboardRouter(supabase));
app.use('/api/contents', createContentsRouter(supabase));
app.use('/api/users', createUsersRouter(supabase));
app.use('/api/records', createRecordsRouter(supabase));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'admin-api',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`✅ Admin API Server running on http://localhost:${PORT}`);
  console.log(`📊 Dashboard: /api/dashboard`);
  console.log(`📚 Contents: /api/contents`);
  console.log(`👥 Users: /api/users`);
  console.log(`📝 Records: /api/records`);
});
