// 打卡机位分享平台 · 网页版服务（零依赖，只用 Node 内置模块）
const http = require('http')
const fs = require('fs')
const path = require('path')
const { URL } = require('url')

const { send, ok, fail, ApiError, readJson } = require('./lib/http')
const { buildRouter } = require('./routes')
const store = require('./lib/store')

const PORT = Number(process.env.PORT) || 3000
const ROOT = path.join(__dirname, '..')
const PUBLIC_DIR = path.join(ROOT, 'public')
const UPLOAD_DIR = path.join(ROOT, 'uploads')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif'
}

const router = buildRouter()

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS')
}

function sendFile(res, filePath, status = 200) {
  const ext = path.extname(filePath).toLowerCase()
  const data = fs.readFileSync(filePath)
  res.writeHead(status, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Content-Length': data.length,
    'Cache-Control': ext === '.html' ? 'no-store' : 'public, max-age=3600'
  })
  res.end(data)
}

function resolveSafePath(rootDir, relative) {
  const full = path.resolve(rootDir, '.' + path.sep + relative)
  if (full !== rootDir && !full.startsWith(rootDir + path.sep)) return null
  return full
}

function tryStatic(res, pathname) {
  // 上传的图片
  if (pathname.startsWith('/uploads/')) {
    const filePath = resolveSafePath(UPLOAD_DIR, pathname.slice('/uploads/'.length))
    if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      sendFile(res, filePath)
      return true
    }
    return false
  }

  // 网页静态资源
  const relative = pathname === '/' ? 'index.html' : pathname.slice(1)
  const filePath = resolveSafePath(PUBLIC_DIR, relative)
  if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    sendFile(res, filePath)
    return true
  }
  return false
}

async function handleApi(req, res, pathname) {
  const matched = router.match(req.method, pathname)
  if (!matched) {
    send(res, fail(404, `接口不存在: ${req.method} ${pathname}`))
    return
  }

  const url = new URL(req.url, 'http://localhost')
  const query = {}
  url.searchParams.forEach((value, key) => {
    query[key] = value
  })

  const ctx = { req, params: matched.params, query, body: {} }
  if (req.method === 'POST' || req.method === 'PUT') {
    ctx.body = await readJson(req)
  }

  const data = await matched.handler(ctx)
  send(res, ok(data === undefined ? null : data))
}

const server = http.createServer(async (req, res) => {
  cors(res)

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  let pathname = '/'
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
  } catch (e) {
    pathname = '/'
  }

  try {
    if (pathname.startsWith('/api/')) {
      await handleApi(req, res, pathname)
      return
    }

    if (tryStatic(res, pathname)) return

    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end('<h1>404</h1><p>页面不存在</p><p><a href="/">返回首页</a></p>')
  } catch (err) {
    const code = err instanceof ApiError ? err.code : 500
    if (code === 500) console.error('[server error]', err)
    send(res, fail(code, err.message || '服务端错误'))
  }
})

// 先加载数据（首次会写入种子数据），再监听端口
store.load()

server.listen(PORT, () => {
  console.log('')
  console.log('✔ 打卡机位分享平台（网页版）已启动')
  console.log(`  请在浏览器打开： http://localhost:${PORT}`)
  console.log(`  数据文件： ${store.DB_FILE}`)
  console.log('')
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`✘ 端口 ${PORT} 已被占用，请关掉占用程序，或用 PORT=3001 npm start 换端口`)
  } else {
    console.error('✘ 服务启动失败：', err.message)
  }
  process.exit(1)
})
