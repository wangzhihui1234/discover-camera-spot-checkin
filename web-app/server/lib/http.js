// 极简 HTTP 工具：统一返回、错误类型、请求体解析、路由匹配

function send(res, body, status = 200) {
  const data = Buffer.from(JSON.stringify(body), 'utf8')
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': data.length,
    'Cache-Control': 'no-store'
  })
  res.end(data)
}

const ok = (data = null) => ({ code: 0, message: 'ok', data })
const fail = (code, message) => ({ code, message, data: null })

// 业务异常：throw new ApiError(422, '缺少字段')
class ApiError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

function readBody(req, limit = 24 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > limit) {
        reject(new ApiError(413, '请求体过大（图片请压缩后再上传）'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

async function readJson(req) {
  const raw = await readBody(req)
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch (e) {
    throw new ApiError(422, '请求体不是合法 JSON')
  }
}

// 路由表：按注册顺序匹配，支持 :param
function createRouter() {
  const routes = []

  const add = (method, pattern, handler) => {
    const keys = []
    const source = pattern.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, (_, key) => {
      keys.push(key)
      return '([^/]+)'
    })
    routes.push({ method, regex: new RegExp('^' + source + '$'), keys, handler })
  }

  return {
    get: (pattern, handler) => add('GET', pattern, handler),
    post: (pattern, handler) => add('POST', pattern, handler),
    put: (pattern, handler) => add('PUT', pattern, handler),
    match(method, pathname) {
      for (const route of routes) {
        if (route.method !== method) continue
        const m = route.regex.exec(pathname)
        if (!m) continue
        const params = {}
        route.keys.forEach((key, i) => {
          params[key] = decodeURIComponent(m[i + 1])
        })
        return { handler: route.handler, params }
      }
      return null
    }
  }
}

module.exports = { send, ok, fail, ApiError, readJson, createRouter }
