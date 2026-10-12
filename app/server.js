import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

const AGENT_URL = process.env.AGENT_URL;
if (!AGENT_URL) {
  console.error('AGENT_URL environment variable is required');
  process.exit(1);
}

// Proxy /api/agent/* → agent CF app
app.use(
  '/api/agent',
  createProxyMiddleware({
    target: AGENT_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/agent': '' },
  })
);

// Serve React build
app.use(express.static(join(__dirname, 'dist')));

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`UI server listening on port ${port}`));
