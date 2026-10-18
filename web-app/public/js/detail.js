// 机位详情：图集 / 信息 / 点赞收藏 / 评论
let spot = null
let images = []
let activeImage = 0
let liked = false
let favorited = false
let detailMap = null
let detailMarker = null

document.addEventListener('DOMContentLoaded', init)

async function init() {
  renderHeader('')

  const id = Number(qs('id'))
  const host = document.getElementById('content')

  if (!id) {
    host.innerHTML = '<div class="card empty">缺少机位 id</div>'
    return
  }

  try {
    const data = await Api.get('/api/spot/' + id)
    spot = data.spot
  } catch (e) {
    host.innerHTML = '<div class="card empty">' + escapeHtml(e.message) + '</div>'
    return
  }

  images = (spot.media || []).map((m) => m.url).filter(Boolean)
  if (!images.length && spot.coverUrl) images = [spot.coverUrl]

  render()
  loadComments()

  if (Auth.isLoggedIn()) loadStatus()
}

function render() {
  const host = document.getElementById('content')
  const hero = images.length
    ? `<img id="hero-img" src="${escapeHtml(images[0])}" alt="${escapeHtml(spot.name)}" />`
    : '<span>暂无图片</span>'

  const thumbs =
    images.length > 1
      ? `<div class="thumbs">${images
          .map(
            (url, i) =>
              `<img src="${escapeHtml(url)}" data-index="${i}" class="${
                i === 0 ? 'active' : ''
              }" alt="" />`
          )
          .join('')}</div>`
      : ''

  const tags = (spot.tagNames || [])
    .map((t) => `<span class="tag-pill">${escapeHtml(t)}</span>`)
    .join(' ')

  host.innerHTML = `
    <div class="detail-layout">
      <div>
        <div class="detail-hero">
          <div class="hero-main" id="hero-main">${hero}</div>
          ${thumbs}
        </div>

        <div class="card" style="padding:18px;margin-top:18px">
          <h2 class="section-title">评论区（<span id="comment-count">${spot.commentCount || 0}</span>）</h2>
          <div id="comments"><div class="empty" style="padding:20px">加载中…</div></div>
          <div class="comment-form">
            <input id="comment-input" class="input" placeholder="写下你的评论…" maxlength="500" />
            <button id="comment-submit" class="btn btn-primary">发送</button>
          </div>
        </div>
      </div>

      <div>
        <div class="card detail-panel">
          <h1>${escapeHtml(spot.name)}</h1>
          <div style="color:#6b7280;font-size:13px">
            📍 ${escapeHtml(spot.city)}${spot.address ? ' · ' + escapeHtml(spot.address) : ''}
            ${spot.isOfficial ? '<span class="badge-admin">官方</span>' : ''}
          </div>
          <div style="margin-top:10px">${tags}</div>

          <div class="actions">
            <button id="like-btn" class="action-btn like">
              <span id="like-icon">♡</span> 点赞 <span id="like-count">${spot.likeCount || 0}</span>
            </button>
            <button id="fav-btn" class="action-btn">
              <span id="fav-icon">☆</span> 收藏 <span id="fav-count">${spot.favoriteCount || 0}</span>
            </button>
          </div>

          <div class="info-row"><span class="k">浏览</span><span>${spot.viewCount || 0} 次</span></div>
          ${
            spot.shootTime
              ? `<div class="info-row"><span class="k">拍摄建议</span><span>${escapeHtml(
                  spot.shootTime
                )}</span></div>`
              : ''
          }
          ${
            spot.description
              ? `<div class="info-row"><span class="k">攻略</span><span>${escapeHtml(
                  spot.description
                )}</span></div>`
              : ''
          }
          <div class="info-row"><span class="k">发布者</span><span>${escapeHtml(
            spot.authorName
          )}</span></div>
          <div class="info-row"><span class="k">发布时间</span><span>${formatTime(
            spot.createdAt
          )}</span></div>

          <div id="map-detail" style="height:180px;border-radius:10px;margin-top:14px;overflow:hidden;background:#eef2f9"></div>
          <a class="btn" style="display:block;text-align:center;margin-top:10px"
             href="https://uri.amap.com/marker?position=${spot.longitude},${spot.latitude}&name=${encodeURIComponent(
    spot.name
  )}&src=web" target="_blank" rel="noopener">在高德地图中打开 / 导航</a>
        </div>
      </div>
    </div>`

  // 主图切换
  host.querySelectorAll('.thumbs img').forEach((el) => {
    el.addEventListener('click', () => {
      activeImage = Number(el.dataset.index)
      document.getElementById('hero-img').src = images[activeImage]
      host.querySelectorAll('.thumbs img').forEach((t) => t.classList.toggle('active', t === el))
    })
  })

  // 小地图
  if (MapUtil.available()) {
    detailMap = MapUtil.create('map-detail', [Number(spot.latitude), Number(spot.longitude)], 14)
    detailMarker = L.marker([Number(spot.latitude), Number(spot.longitude)], {
      icon: MapUtil.pinIcon(true)
    }).addTo(detailMap)
  } else {
    document.getElementById('map-detail').style.display = 'none'
  }

  document.getElementById('like-btn').addEventListener('click', toggleLike)
  document.getElementById('fav-btn').addEventListener('click', toggleFavorite)
  document.getElementById('comment-submit').addEventListener('click', addComment)
}

async function loadStatus() {
  try {
    const data = await Api.get('/api/spot/' + spot.id + '/status')
    liked = data.liked
    favorited = data.favorited
    paintActions()
  } catch (e) {
    /* 静默失败 */
  }
}

function paintActions() {
  const likeBtn = document.getElementById('like-btn')
  const favBtn = document.getElementById('fav-btn')
  if (!likeBtn || !favBtn) return
  likeBtn.classList.toggle('active', liked)
  favBtn.classList.toggle('active', favorited)
  document.getElementById('like-icon').textContent = liked ? '❤' : '♡'
  document.getElementById('fav-icon').textContent = favorited ? '★' : '☆'
}

async function toggleLike() {
  if (!Auth.requireLogin()) return
  try {
    const data = await Api.post('/api/spot/' + spot.id + '/like')
    liked = data.liked
    document.getElementById('like-count').textContent = data.likeCount
    paintActions()
  } catch (e) {
    showToast(e.message)
  }
}

async function toggleFavorite() {
  if (!Auth.requireLogin()) return
  try {
    const data = await Api.post('/api/spot/' + spot.id + '/favorite')
    favorited = data.favorited
    document.getElementById('fav-count').textContent = data.favoriteCount
    paintActions()
  } catch (e) {
    showToast(e.message)
  }
}

async function loadComments() {
  const host = document.getElementById('comments')
  try {
    const data = await Api.get('/api/spot/' + spot.id + '/comments')
    document.getElementById('comment-count').textContent = data.total
    host.innerHTML = data.list.length
      ? data.list
          .map(
            (c) => `<div class="comment">
              <div class="avatar">${
                c.avatar
                  ? `<img src="${escapeHtml(c.avatar)}" alt="" />`
                  : escapeHtml((c.nickname || '?').slice(0, 1))
              }</div>
              <div>
                <div class="nick">${escapeHtml(c.nickname)}<span class="time">${formatTime(
              c.createdAt
            )}</span></div>
                <div class="content">${escapeHtml(c.content)}</div>
              </div>
            </div>`
          )
          .join('')
      : '<div class="empty" style="padding:20px">还没有评论，来占个沙发～</div>'
  } catch (e) {
    host.innerHTML = '<div class="error-box">' + escapeHtml(e.message) + '</div>'
  }
}

async function addComment() {
  if (!Auth.requireLogin()) return
  const input = document.getElementById('comment-input')
  const content = input.value.trim()
  if (!content) return showToast('评论内容不能为空')

  const button = document.getElementById('comment-submit')
  button.disabled = true
  try {
    await Api.post('/api/spot/' + spot.id + '/comments', { content })
    input.value = ''
    await loadComments()
    showToast('评论成功')
  } catch (e) {
    showToast(e.message)
  } finally {
    button.disabled = false
  }
}
