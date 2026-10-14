import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';

const root = fileURLToPath(new URL('.', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
export function serve(port = 0, assets = {}) {
  const server = createServer(async (request, response) => {
    const path = new URL(request.url, 'http://localhost').pathname;
    if (assets[path]) {
      response.writeHead(200, { 'Content-Type': assets[path].type, 'Cache-Control': 'no-store' });
      response.end(assets[path].body); return;
    }
    const file = resolve(root, '.' + (path === '/' ? '/index.html' : path));
    if (!file.startsWith(root.endsWith(sep) ? root : root + sep)) { response.writeHead(403).end(); return; }
    try {
      const body = await readFile(file);
      response.writeHead(200, { 'Content-Type': types[extname(file)] || 'text/plain', 'Cache-Control': 'no-store' });
      response.end(body);
    } catch { response.writeHead(404).end(); }
  });
  return new Promise(resolveServer => server.listen(port, '127.0.0.1', () => resolveServer(server)));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = await serve(Number(process.argv.find(arg => arg.startsWith('--port='))?.split('=')[1] || 0));
  console.log(`Translation lab: http://127.0.0.1:${server.address().port}/`);
}
