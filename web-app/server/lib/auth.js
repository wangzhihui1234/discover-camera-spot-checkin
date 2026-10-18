// 密码哈希（scrypt）+ 无状态签名 token（HMAC-SHA256）
const crypto = require('crypto')
const store = require('./store')
const { ApiError } = require('./http')

const TOKEN_TTL = 7 * 24 * 60 * 60 * 1000 // 7 天

function hashPassword(password, salt) {
  return crypto.scryptSync(String(password), salt, 32).toString('hex')
}

function makeSalt() {
  return crypto.randomBytes(16).toString('hex')
}

function verifyPassword(password, user) {
  const expected = Buffer.from(user.passwordHash, 'hex')
  const actual = Buffer.from(hashPassword(password, user.salt), 'hex')
  if (expected.length !== actual.length) return false
  return crypto.timingSafeEqual(expected, actual)
}

const b64url = (input) =>
  Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const b64urlDecode = (str) =>
  Buffer.from(String(str).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')

function signer() {
  return store.load().secret
}

function signToken(user) {
  const body = b64url(
    JSON.stringify({ uid: user.id, username: user.username, exp: Date.now() + TOKEN_TTL })
  )
  const sig = b64url(crypto.createHmac('sha256', signer()).update(body).digest())
  return `${body}.${sig}`
}

function verifyToken(token) {
  if (!token || token.indexOf('.') === -1) return null
  const [body, sig] = String(token).split('.')
  const expect = b64url(crypto.createHmac('sha256', signer()).update(body).digest())
  if (sig !== expect) return null
  try {
    const payload = JSON.parse(b64urlDecode(body))
    if (!payload.exp || payload.exp < Date.now()) return null
    return payload
  } catch (e) {
    return null
  }
}

// 从请求头取当前用户（未登录返回 null）
function currentUser(req) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  const payload = verifyToken(token)
  if (!payload) return null
  const db = store.load()
  return db.users.find((u) => u.id === payload.uid) || null
}

function requireAuth(req) {
  const user = currentUser(req)
  if (!user) throw new ApiError(401, '未登录或登录已过期')
  if (user.status !== 1) throw new ApiError(403, '账号已被禁用')
  return user
}

function requireAdmin(req) {
  const user = requireAuth(req)
  if (user.role !== 1) throw new ApiError(403, '无权限，需要管理员')
  return user
}

// 对外输出的用户字段（不含密码）
function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname || '',
    avatar: user.avatar || '',
    bio: user.bio || '',
    role: user.role,
    createdAt: user.createdAt
  }
}

module.exports = {
  hashPassword,
  makeSalt,
  verifyPassword,
  signToken,
  currentUser,
  requireAuth,
  requireAdmin,
  publicUser
}
