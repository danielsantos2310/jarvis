import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve('dist-demo');
createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url!, 'http://localhost').pathname;
    if (!pathname.startsWith('/jarvis/')) throw new Error('Missing');
    const path = resolve(root, decodeURIComponent(pathname.slice(8)) || 'index.html');
    if (!path.startsWith(root + sep)) throw new Error('Missing');
    const content = await readFile(path);
    res.setHeader('Content-Type', ({'.html':'text/html','.js':'text/javascript','.css':'text/css'} as Record<string,string>)[extname(path)] || 'application/octet-stream');
    res.end(content);
  } catch { res.statusCode = 404; res.end('Not found'); }
}).listen(3099, '127.0.0.1');
