const store = require('../lib/store')
const authLib = require('../lib/auth')
const { ApiError } = require('../lib/http')

const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/

module.exports = (router) => {
  // 注册
  router.post('/api/auth/register', async (ctx) => {
    const name = String(ctx.body.username || '').trim()
    const password = String(ctx.body.password || '')
    const nickname = String(ctx.body.nickname || '').trim()

    if (!USERNAME_RE.test(name)) {
      throw new ApiError(422, '用户名需为 3-20 位字母、数字或下划线')
    }
    if (password.length < 6) throw new ApiError(422, '密码至少 6 位')

    const db = store.load()
    if (db.users.some((u) => u.username.toLowerCase() === name.toLowerCase())) {
      throw new ApiError(422, '该用户名已被注册')
    }

    const salt = authLib.makeSalt()
    const user = store.insert('users', {
      username: name,
      salt,
      passwordHash: authLib.hashPassword(password, salt),
      nickname: nickname || name,
      avatar: '',
      bio: '',
      role: db.users.length === 0 ? 1 : 0, // 第一个注册的用户自动成为管理员
      status: 1,
      createdAt: store.nowISO()
    })

    return { token: authLib.signToken(user), user: authLib.publicUser(user) }
  })

  // 登录
  router.post('/api/auth/login', async (ctx) => {
    const name = String(ctx.body.username || '').trim()
    const password = String(ctx.body.password || '')
    if (!name || !password) throw new ApiError(422, '请输入用户名和密码')

    const db = store.load()
    const user = db.users.find((u) => u.username.toLowerCase() === name.toLowerCase())
    if (!user || !authLib.verifyPassword(password, user)) {
      throw new ApiError(422, '用户名或密码不正确')
    }
    if (user.status !== 1) throw new ApiError(403, '账号已被禁用')

    return { token: authLib.signToken(user), user: authLib.publicUser(user) }
  })

  // 当前登录用户
  router.get('/api/auth/me', async (ctx) => {
    const user = authLib.requireAuth(ctx.req)
    return { user: authLib.publicUser(user) }
  })

  // 修改资料
  router.put('/api/auth/profile', async (ctx) => {
    const user = authLib.requireAuth(ctx.req)
    const patch = {}
    if (ctx.body.nickname !== undefined) patch.nickname = String(ctx.body.nickname).trim().slice(0, 32)
    if (ctx.body.avatar !== undefined) patch.avatar = String(ctx.body.avatar)
    if (ctx.body.bio !== undefined) patch.bio = String(ctx.body.bio).slice(0, 140)

    const updated = store.update('users', user.id, patch)
    return { user: authLib.publicUser(updated) }
  })
}
