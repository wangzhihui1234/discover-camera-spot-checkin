// 我的：个人信息 + 我的分享 / 我的收藏 + 管理员审核
const STATUS_TEXT = { 0: '待审核', 1: '已通过', 2: '已驳回' }

let currentTab = 'mine'

document.addEventListener('DOMContentLoaded', async () => {
  renderHeader('mine')

  if (!Auth.isLoggedIn()) {
    document.getElementById('content').innerHTML = `
      <div class="card empty">
        <p>登录后可以查看「我的分享」和「我的收藏」</p>
        <button class="btn btn-primary" onclick="Auth.gotoLogin()">去登录 / 注册</button>
      </div>`
    return
  }

  renderShell()
  await Promise.all([loadMine(), loadFavorites(), Auth.isAdmin() ? loadPending() : Promise.resolve()])
})

function renderShell() {
  const user = Auth.user()
  const initial = escapeHtml((user.nickname || user.username || '?').slice(0, 1).toUpperCase())

  document.getElementById('content').innerHTML = `
    <div class="card profile-head">
      <div class="profile-avatar">${initial}</div>
      <div>
        <div style="font-size:17px;font-weight:700">
          ${escapeHtml(user.nickname || user.username)}
          ${user.role === 1 ? '<span class="badge-admin">管理员</span>' : ''}
        </div>
        <div style="color:#6b7280;font-size:13px">账号：${escapeHtml(user.username)}</div>
      </div>
    </div>

    ${
      user.role === 1
        ? `<div id="admin-block">
             <h2 class="section-title">待审核机位</h2>
             <div id="pending-list"></div>
           </div>`
        : ''
    }

    <div class="tabs">
      <button id="tab-mine" class="active">我的分享</button>
      <button id="tab-fav">我的收藏</button>
    </div>
    <div id="list-host"></div>`

  document.getElementById('tab-mine').addEventListener('click', () => switchTab('mine'))
  document.getElementById('tab-fav').addEventListener('click', () => switchTab('fav'))
}

function switchTab(tab) {
  currentTab = tab
  document.getElementById('tab-mine').classList.toggle('active', tab === 'mine')
  document.getElementById('tab-fav').classList.toggle('active', tab === 'fav')
  renderList()
}

let mineData = []
let favData = []

async function loadMine() {
  try {
    const data = await Api.get('/api/spot/mine')
    mineData = data.list || []
  } catch (e) {
    mineData = []
    showToast(e.message)
  }
  renderList()
}

async function loadFavorites() {
  try {
    const data = await Api.get('/api/spot/favorites')
    favData = data.list || []
  } catch (e) {
    favData = []
  }
  if (currentTab === 'fav') renderList()
}

function renderList() {
  const host = document.getElementById('list-host')
  if (!host) return

  if (currentTab === 'mine') {
    host.innerHTML = mineData.length
      ? `<div class="grid">${mineData
          .map(
            (s) => `<div style="position:relative">
              ${spotCardHtml(s)}
              <span class="status-pill status-${s.status}" style="position:absolute;top:10px;right:10px">${
              STATUS_TEXT[s.status] || ''
            }</span>
              ${
                s.status === 2 && s.rejectReason
                  ? `<div style="color:#dc2626;font-size:12.5px;margin-top:6px">驳回原因：${escapeHtml(
                      s.rejectReason
                    )}</div>`
                  : ''
              }
            </div>`
          )
          .join('')}</div>`
      : '<div class="card empty">还没有分享过机位，去「发布机位」分享第一个吧</div>'
    return
  }

  host.innerHTML = favData.length
    ? `<div class="grid">${favData.map(spotCardHtml).join('')}</div>`
    : '<div class="card empty">还没有收藏的机位</div>'
}

async function loadPending() {
  const host = document.getElementById('pending-list')
  if (!host) return
  try {
    const data = await Api.get('/api/admin/spot')
    if (!data.list.length) {
      host.innerHTML = '<div class="card empty" style="padding:22px">暂无待审核的机位</div>'
      return
    }
    host.innerHTML = data.list
      .map(
        (s) => `<div class="review-row">
          <div class="thumb">${
            s.coverUrl ? `<img src="${escapeHtml(s.coverUrl)}" alt="" />` : ''
          }</div>
          <div class="info">
            <b>${escapeHtml(s.name)}</b>
            <small>${escapeHtml(s.city)} · 由 ${escapeHtml(s.authorName)} 提交 · ${escapeHtml(
          s.description || '无描述'
        )}</small>
          </div>
          <div style="display:flex;gap:8px;flex:none">
            <a class="btn btn-sm" href="/detail.html?id=${s.id}" target="_blank">预览</a>
            <button class="btn btn-sm btn-primary" data-approve="${s.id}">通过</button>
            <button class="btn btn-sm btn-danger" data-reject="${s.id}">驳回</button>
          </div>
        </div>`
      )
      .join('')

    host.querySelectorAll('[data-approve]').forEach((btn) => {
      btn.addEventListener('click', () => review(Number(btn.dataset.approve), 'approve'))
    })
    host.querySelectorAll('[data-reject]').forEach((btn) => {
      btn.addEventListener('click', () => review(Number(btn.dataset.reject), 'reject'))
    })
  } catch (e) {
    host.innerHTML = '<div class="error-box">' + escapeHtml(e.message) + '</div>'
  }
}

async function review(id, action) {
  let reason = ''
  if (action === 'reject') {
    reason = window.prompt('请输入驳回原因（可留空）') || ''
  }
  try {
    await Api.post('/api/admin/spot/' + id + '/review', { action, reason })
    showToast(action === 'approve' ? '已通过' : '已驳回')
    await Promise.all([loadPending(), loadMine(), loadFavorites()])
  } catch (e) {
    showToast(e.message)
  }
}
