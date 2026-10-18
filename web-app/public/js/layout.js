// 公共：顶部导航、提示条、HTML 转义

function escapeHtml(value) {
  return String(value === null || value === undefined ? '' : value).replace(/[&<>"']/g, (c) => {
    if (c === '&') return '&amp;'
    if (c === '<') return '&lt;'
    if (c === '>') return '&gt;'
    if (c === '"') return '&quot;'
    return '&#39;'
  })
}

function qs(name) {
  return new URLSearchParams(location.search).get(name) || ''
}

let toastTimer = null
function showToast(message) {
  let el = document.getElementById('app-toast')
  if (!el) {
    el = document.createElement('div')
    el.id = 'app-toast'
    el.style.cssText =
      'position:fixed;left:50%;top:76px;transform:translateX(-50%);z-index:9999;' +
      'background:rgba(31,36,48,.92);color:#fff;padding:9px 18px;border-radius:9px;' +
      'font-size:13.5px;max-width:80vw;text-align:center;transition:opacity .2s;'
    document.body.appendChild(el)
  }
  el.textContent = message
  el.style.opacity = '1'
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    el.style.opacity = '0'
  }, 2200)
}

const NAV_ITEMS = [
  { key: 'index', href: '/index.html', text: '发现机位' },
  { key: 'search', href: '/search.html', text: '搜索' },
  { key: 'publish', href: '/publish.html', text: '发布机位' },
  { key: 'mine', href: '/mine.html', text: '我的' }
]

function renderHeader(activeKey) {
  const host = document.getElementById('app-header')
  if (!host) return

  const user = Auth.user()
  const links = NAV_ITEMS.map(
    (item) =>
      `<a href="${item.href}" class="${item.key === activeKey ? 'active' : ''}">${item.text}</a>`
  ).join('')

  const right = user
    ? `<span class="who">你好，<b>${escapeHtml(user.nickname || user.username)}</b>` +
      (user.role === 1 ? '<span class="badge-admin">管理员</span>' : '') +
      `</span><button class="btn btn-sm" id="nav-logout">退出</button>`
    : `<button class="btn btn-sm btn-primary" id="nav-login">登录 / 注册</button>`

  host.className = 'app-header'
  host.innerHTML = `<div class="app-header-inner">
      <a class="brand" href="/index.html">机位<span>打卡</span></a>
      <nav class="nav-links">${links}</nav>
      <div class="nav-user">${right}</div>
    </div>`

  const loginBtn = document.getElementById('nav-login')
  if (loginBtn) loginBtn.addEventListener('click', () => Auth.gotoLogin())

  const logoutBtn = document.getElementById('nav-logout')
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      Auth.logout()
      showToast('已退出登录')
      setTimeout(() => location.reload(), 400)
    })
  }
}

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return String(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// 统一样式的机位卡片
function spotCardHtml(spot) {
  const cover = spot.coverUrl
    ? `<img src="${escapeHtml(spot.coverUrl)}" alt="${escapeHtml(spot.name)}" loading="lazy" />`
    : `<div class="no-img">暂无图片</div>`
  const tags = (spot.tagNames || [])
    .slice(0, 3)
    .map((t) => `<span class="tag-pill">${escapeHtml(t)}</span>`)
    .join('')
  return `<a class="spot-card" href="/detail.html?id=${spot.id}">
      <div class="spot-cover">${cover}</div>
      <div class="spot-body">
        <div class="spot-name">${escapeHtml(spot.name)}</div>
        <div class="spot-meta">
          <span>📍 ${escapeHtml(spot.city)}</span>
          <span>❤ ${spot.likeCount || 0}</span>
          <span>👁 ${spot.viewCount || 0}</span>
        </div>
        <div class="spot-tags">${tags}</div>
      </div>
    </a>`
}
