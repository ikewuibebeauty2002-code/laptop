import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { initializeDatabase } from './server/db';
import { createApiRouter } from './server/routes/api';

async function startServer() {
  initializeDatabase();

  const app = express();
  const port = Number(process.env.PORT) || 3000;

  // Paystack webhook needs raw body parsing before express.json()
  app.use('/api/paystack/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json({ limit: '5mb' }));
  app.use(cookieParser());

  // Serve uploaded product & category media
  const publicDir = path.resolve(process.cwd(), 'public');
  app.use('/uploads', express.static(path.join(publicDir, 'uploads')));

  // Mount REST API
  app.use('/api', createApiRouter());

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) {
        next();
        return;
      }
      try {
        const htmlPath = path.resolve(process.cwd(), 'index.html');
        let template = fs.readFileSync(htmlPath, 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`ZuriVolt Gadgets server running at http://localhost:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
