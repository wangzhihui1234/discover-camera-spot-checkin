const { createRouter } = require('../lib/http')

const authRoutes = require('./auth')
const dictRoutes = require('./dict')
const interactRoutes = require('./interact')
const spotRoutes = require('./spot')
const uploadRoutes = require('./upload')
const adminRoutes = require('./admin')

function buildRouter() {
  const router = createRouter()

  authRoutes(router)
  dictRoutes(router)

  // 互动路由含 /api/spot/:id/like 等两段路径，先挂载避免被 /api/spot/:id 抢走
  interactRoutes(router)
  // spot 内部已保证 /mine、/favorites 注册在 /:id 之前
  spotRoutes(router)

  uploadRoutes(router)
  adminRoutes(router)

  return router
}

module.exports = { buildRouter }
