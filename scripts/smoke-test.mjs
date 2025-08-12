// Minimal smoke test: build is expected to be done by npm script before running this.
// Starts `vite preview`, waits for it to be reachable, fetches '/', and asserts title contains 'POB Planner'.
import http from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const host = process.env.SMOKE_HOST || '127.0.0.1';
const port = Number(process.env.SMOKE_PORT || 5180);
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 30000);

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode || 0, body: data }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function waitForServer(url, deadline) {
  let lastErr = null;
  while (Date.now() < deadline) {
    try {
      const res = await httpGet(url);
      if (res.status >= 200 && res.status < 500) return res;
    } catch (err) {
      lastErr = err;
    }
    await delay(300);
  }
  if (lastErr) throw lastErr;
  throw new Error('Timeout waiting for preview server');
}

function killProcessTree(child) {
  if (!child) return;
  try {
    child.kill();
  } catch {}
}

function contentTypeFor(fp) {
  const ext = path.extname(fp).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.svg': return 'image/svg+xml';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.ico': return 'image/x-icon';
    case '.json': return 'application/json; charset=utf-8';
    case '.map': return 'application/json; charset=utf-8';
    case '.txt': return 'text/plain; charset=utf-8';
    case '.woff2': return 'font/woff2';
    default: return 'application/octet-stream';
  }
}

function createStaticServer(rootDir) {
  return http.createServer((req, res) => {
    try {
      const u = new URL(req.url || '/', `http://${req.headers.host}`);
      let pathname = decodeURIComponent(u.pathname);
      if (pathname.includes('..')) pathname = '/';
      let filePath = path.join(rootDir, pathname);
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(rootDir, 'index.html');
      }
      const ct = contentTypeFor(filePath);
      res.statusCode = 200;
      res.setHeader('Content-Type', ct);
      res.setHeader('Cache-Control', 'no-store');
      fs.createReadStream(filePath).pipe(res);
    } catch (err) {
      res.statusCode = 500;
      res.end('Server error');
    }
  });
}

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const cwd = path.resolve(__dirname, '..');
  const distDir = path.join(cwd, 'dist');
  const url = `http://${host}:${port}/`;

  if (!fs.existsSync(distDir)) {
    console.error('dist/ not found. Run: npm run build');
    process.exit(2);
    return;
  }

  const server = createStaticServer(distDir);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => resolve());
  });

  const deadline = Date.now() + timeoutMs;
  try {
    const res = await waitForServer(url, deadline);
    const body = res.body || (await httpGet(url)).body;
    const ok = body.includes('<title>POB Planner</title>') || body.includes('POB Planner');
    if (!ok) {
      throw new Error(
        `Smoke assertion failed: expected 'POB Planner' in HTML.\nFirst 500 chars:\n${body.slice(0, 500)}`
      );
    }
    console.log('SMOKE PASS: server responded and title detected');
    process.exitCode = 0;
  } catch (err) {
    console.error('SMOKE FAIL:', err?.message || String(err));
    process.exitCode = 1;
  } finally {
    await new Promise((r) => server.close(() => r()));
  }
}

main();
