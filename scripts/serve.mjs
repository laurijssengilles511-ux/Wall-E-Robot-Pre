import http from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../dist/', import.meta.url))
const port = Number(process.env.PORT || 4173)
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.pdf': 'application/pdf', '.txt': 'text/plain; charset=utf-8', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.xlsm': 'application/vnd.ms-excel.sheet.macroEnabled.12', '.stl': 'application/octet-stream', '.glb': 'model/gltf-binary', '.json': 'application/json', '.woff2': 'font/woff2' }
try { await stat(path.join(root, 'index.html')) } catch { console.error('请先运行 npm run build，或使用提供的完整 dist 文件夹。'); process.exit(1) }
const server = http.createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return }
  try {
    const urlPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
    const filename = path.resolve(root, `.${urlPath === '/' ? '/index.html' : urlPath}`)
    const relative = path.relative(root, filename)
    if (relative.startsWith('..') || path.isAbsolute(relative)) { response.writeHead(403); response.end(); return }
    const buffer = await readFile(filename)
    response.writeHead(200, { 'Content-Type': types[path.extname(filename).toLowerCase()] || 'application/octet-stream', 'Content-Length': buffer.length, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-cache' })
    response.end(request.method === 'HEAD' ? undefined : buffer)
  } catch { response.writeHead(404); response.end('Not found') }
})
server.listen(port, '127.0.0.1', () => console.log(`瓦力机器人作品集已就绪：http://127.0.0.1:${port}`))
server.on('error', error => { console.error(error.message); process.exitCode = 1 })
