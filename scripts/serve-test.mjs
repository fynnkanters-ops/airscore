// Test-Server: liefert out/ unter /airscore/ aus, um den GitHub-Pages-Unterpfad
// lokal zu simulieren.  node scripts/serve-test.mjs
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'out');
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.txt':'text/plain', '.ico':'image/x-icon' };

const server = createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.startsWith('/airscore')) p = p.slice('/airscore'.length);
  if (p === '' || p === '/') p = '/index.html';
  let file = join(root, p);
  try {
    const s = await stat(file).catch(() => null);
    if (s && s.isDirectory()) file = join(file, 'index.html');
    else if (!s && !extname(p)) file = join(root, p, 'index.html');
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('404');
  }
});
server.listen(4173, () => console.log('Test-Server: http://localhost:4173/airscore/'));
