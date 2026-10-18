const store = require('../lib/store')
const authLib = require('../lib/auth')
const { ApiError } = require('../lib/http')
const { shape } = require('./spot')

module.exports = (router) => {
  // 待审核列表
  router.get('/api/admin/spot', async (ctx) => {
    authLib.requireAdmin(ctx.req)
    const db = store.load()
    const list = db.spots
      .filter((s) => s.status === 0)
      .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
      .map((s) => shape(db, s))
    return { list, total: list.length }
  })

  // 审核：approve 通过 / reject 驳回
  router.post('/api/admin/spot/:id/review', async (ctx) => {
    authLib.requireAdmin(ctx.req)
    const db = store.load()
    const id = Number(ctx.params.id)

    const spot = db.spots.find((s) => s.id === id)
    if (!spot) throw new ApiError(404, '机位不存在')

    const action = ctx.body.action
    if (action !== 'approve' && action !== 'reject') {
      throw new ApiError(422, 'action 需为 approve 或 reject')
    }

    const status = action === 'approve' ? 1 : 2
    const rejectReason = action === 'reject' ? String(ctx.body.reason || '').slice(0, 200) : ''

    store.update('spots', id, { status, rejectReason, updatedAt: store.nowISO() })
    return { status }
  })
}
