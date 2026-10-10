import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const root = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.txt':'text/plain; charset=utf-8','.json':'application/json'};
const server = http.createServer(async (request, response) => {
  try {
    let name = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (name.endsWith('/')) name += 'index.html';
    const resolved = path.resolve(root, '.' + name);
    if (!resolved.startsWith(path.resolve(root) + path.sep)) { response.writeHead(403); return response.end(); }
    const contents = await readFile(resolved);
    response.writeHead(200, {'Content-Type': types[path.extname(resolved)] || 'application/octet-stream','Cache-Control':'no-cache'}); response.end(contents);
  } catch { response.writeHead(404); response.end('Not found'); }
});
server.listen(4173, '127.0.0.1', () => console.log('Local: http://127.0.0.1:4173'));
