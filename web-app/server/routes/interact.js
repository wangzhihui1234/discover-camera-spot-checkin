const store = require('../lib/store')
const authLib = require('../lib/auth')
const { ApiError } = require('../lib/http')

function findSpot(db, id) {
  const spot = db.spots.find((s) => s.id === id)
  if (!spot) throw new ApiError(404, '机位不存在')
  return spot
}

module.exports = (router) => {
  // 点赞 / 取消点赞
  router.post('/api/spot/:id/like', async (ctx) => {
    const user = authLib.requireAuth(ctx.req)
    const db = store.load()
    const spot = findSpot(db, Number(ctx.params.id))

    const exist = db.likes.find((l) => l.spotId === spot.id && l.userId === user.id)
    let liked
    if (exist) {
      store.remove('likes', (l) => l.id === exist.id)
      liked = false
    } else {
      store.insert('likes', { spotId: spot.id, userId: user.id, createdAt: store.nowISO() })
      liked = true
    }

    const likeCount = Math.max(0, (spot.likeCount || 0) + (liked ? 1 : -1))
    store.update('spots', spot.id, { likeCount })
    return { liked, likeCount }
  })

  // 收藏 / 取消收藏
  router.post('/api/spot/:id/favorite', async (ctx) => {
    const user = authLib.requireAuth(ctx.req)
    const db = store.load()
    const spot = findSpot(db, Number(ctx.params.id))

    const exist = db.favorites.find((f) => f.spotId === spot.id && f.userId === user.id)
    let favorited
    if (exist) {
      store.remove('favorites', (f) => f.id === exist.id)
      favorited = false
    } else {
      store.insert('favorites', { spotId: spot.id, userId: user.id, createdAt: store.nowISO() })
      favorited = true
    }

    const favoriteCount = Math.max(0, (spot.favoriteCount || 0) + (favorited ? 1 : -1))
    store.update('spots', spot.id, { favoriteCount })
    return { favorited, favoriteCount }
  })

  // 我的点赞 / 收藏状态
  router.get('/api/spot/:id/status', async (ctx) => {
    const user = authLib.requireAuth(ctx.req)
    const db = store.load()
    const spotId = Number(ctx.params.id)
    return {
      liked: db.likes.some((l) => l.spotId === spotId && l.userId === user.id),
      favorited: db.favorites.some((f) => f.spotId === spotId && f.userId === user.id)
    }
  })

  // 评论列表
  router.get('/api/spot/:id/comments', async (ctx) => {
    const db = store.load()
    const spotId = Number(ctx.params.id)
    const list = db.comments
      .filter((c) => c.spotId === spotId)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .map((c) => {
        const author = db.users.find((u) => u.id === c.userId)
        return {
          id: c.id,
          content: c.content,
          createdAt: c.createdAt,
          nickname: author ? author.nickname || author.username : '用户',
          avatar: author ? author.avatar || '' : ''
        }
      })
    return { list, total: list.length }
  })

  // 发表评论
  router.post('/api/spot/:id/comments', async (ctx) => {
    const user = authLib.requireAuth(ctx.req)
    const db = store.load()
    const spot = findSpot(db, Number(ctx.params.id))

    const content = String(ctx.body.content || '').trim()
    if (!content) throw new ApiError(422, '评论内容不能为空')
    if (content.length > 500) throw new ApiError(422, '评论不能超过 500 字')

    store.insert('comments', {
      spotId: spot.id,
      userId: user.id,
      content,
      createdAt: store.nowISO()
    })
    store.update('spots', spot.id, { commentCount: (spot.commentCount || 0) + 1 })
    return null
  })
}
