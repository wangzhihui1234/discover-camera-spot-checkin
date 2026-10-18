const store = require('../lib/store')
const authLib = require('../lib/auth')
const { ApiError } = require('../lib/http')

function tagNamesOf(db, tagIds) {
  return (tagIds || [])
    .map((id) => {
      const tag = db.tags.find((t) => t.id === id)
      return tag ? tag.name : null
    })
    .filter(Boolean)
}

function authorNameOf(db, spot) {
  if (spot.isOfficial) return '官方推荐'
  const author = db.users.find((u) => u.id === spot.userId)
  return author ? author.nickname || author.username : '用户'
}

// 机位对外结构
function shape(db, spot) {
  return {
    id: spot.id,
    name: spot.name,
    city: spot.city,
    latitude: spot.latitude,
    longitude: spot.longitude,
    address: spot.address,
    coverUrl: spot.coverUrl,
    description: spot.description,
    shootTime: spot.shootTime,
    status: spot.status,
    rejectReason: spot.rejectReason,
    isOfficial: spot.isOfficial,
    viewCount: spot.viewCount,
    likeCount: spot.likeCount,
    favoriteCount: spot.favoriteCount,
    commentCount: spot.commentCount,
    media: spot.media || [],
    tagIds: spot.tagIds || [],
    tagNames: tagNamesOf(db, spot.tagIds),
    authorName: authorNameOf(db, spot),
    createdAt: spot.createdAt
  }
}

module.exports = (router) => {
  // 列表：关键词 / 城市 / 标签 / 地图范围 / 分页（只返回已通过）
  router.get('/api/spot', async (ctx) => {
    const db = store.load()
    const q = ctx.query
    const page = Math.max(1, Number(q.page) || 1)
    const pageSize = Math.min(200, Math.max(1, Number(q.pageSize) || 20))

    let list = db.spots.filter((s) => s.status === 1)

    if (q.city) list = list.filter((s) => s.city === q.city)

    if (q.tagId) {
      const tagId = Number(q.tagId)
      list = list.filter((s) => (s.tagIds || []).includes(tagId))
    }

    if (q.swLat != null && q.neLat != null && q.swLng != null && q.neLng != null) {
      const swLat = Number(q.swLat)
      const neLat = Number(q.neLat)
      const swLng = Number(q.swLng)
      const neLng = Number(q.neLng)
      list = list.filter(
        (s) => s.latitude >= swLat && s.latitude <= neLat && s.longitude >= swLng && s.longitude <= neLng
      )
    }

    if (q.keyword) {
      const kw = String(q.keyword).trim().toLowerCase()
      list = list.filter((s) =>
        [s.name, s.city, s.address, s.description].some((v) =>
          String(v || '').toLowerCase().includes(kw)
        )
      )
    }

    list.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    const total = list.length
    const start = (page - 1) * pageSize

    return {
      list: list.slice(start, start + pageSize).map((s) => shape(db, s)),
      total,
      page,
      pageSize
    }
  })

  // 我的分享（必须注册在 /api/spot/:id 之前）
  router.get('/api/spot/mine', async (ctx) => {
    const user = authLib.requireAuth(ctx.req)
    const db = store.load()
    const list = db.spots
      .filter((s) => s.userId === user.id)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .map((s) => shape(db, s))
    return { list, total: list.length }
  })

  // 我的收藏
  router.get('/api/spot/favorites', async (ctx) => {
    const user = authLib.requireAuth(ctx.req)
    const db = store.load()
    const ids = db.favorites.filter((f) => f.userId === user.id).map((f) => f.spotId)
    const list = ids
      .map((id) => db.spots.find((s) => s.id === id))
      .filter((s) => s && s.status === 1)
      .map((s) => shape(db, s))
    return { list, total: list.length }
  })

  // 详情（浏览量 +1）
  router.get('/api/spot/:id', async (ctx) => {
    const db = store.load()
    const id = Number(ctx.params.id)
    const spot = db.spots.find((s) => s.id === id)
    if (!spot) throw new ApiError(404, '机位不存在')

    store.update('spots', id, { viewCount: (spot.viewCount || 0) + 1 })
    return { spot: shape(db, spot) }
  })

  // 发布（默认待审核）
  router.post('/api/spot', async (ctx) => {
    const user = authLib.requireAuth(ctx.req)
    const body = ctx.body

    const name = String(body.name || '').trim()
    const city = String(body.city || '').trim()
    const latitude = Number(body.latitude)
    const longitude = Number(body.longitude)

    if (!name) throw new ApiError(422, '请填写机位名称')
    if (!city) throw new ApiError(422, '请填写城市')
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new ApiError(422, '请选择机位坐标')
    }

    const media = (Array.isArray(body.media) ? body.media : [])
      .filter((m) => m && m.url)
      .slice(0, 9)
      .map((m, i) => ({ type: m.type === 2 ? 2 : 1, url: String(m.url), sort: i }))

    const tagIds = (Array.isArray(body.tagIds) ? body.tagIds : [])
      .map(Number)
      .filter((id) => store.load().tags.some((t) => t.id === id))

    const now = store.nowISO()
    const spot = store.insert('spots', {
      userId: user.id,
      name: name.slice(0, 60),
      city: city.slice(0, 20),
      latitude,
      longitude,
      address: String(body.address || '').slice(0, 120),
      description: String(body.description || '').slice(0, 1000),
      shootTime: String(body.shootTime || '').slice(0, 40),
      coverUrl: media.length ? media[0].url : '',
      media,
      tagIds,
      status: 0,
      rejectReason: '',
      isOfficial: 0,
      viewCount: 0,
      likeCount: 0,
      favoriteCount: 0,
      commentCount: 0,
      createdAt: now,
      updatedAt: now
    })

    return { id: spot.id, status: spot.status }
  })
}

module.exports.shape = shape
