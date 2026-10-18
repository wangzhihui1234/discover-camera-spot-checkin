// 首页：地图打点 + 机位列表
let mapInstance = null
const markerMap = {}
let spotList = []
let selectedId = null

document.addEventListener('DOMContentLoaded', init)

async function init() {
  renderHeader('index')

  if (MapUtil.available()) {
    mapInstance = MapUtil.create('map-main', [34.5, 108.9], 4)
  } else {
    document.getElementById('map-fallback').style.display = 'flex'
  }

  const listHost = document.getElementById('spot-list')
  const countText = document.getElementById('count-text')

  try {
    const data = await Api.get('/api/spot?pageSize=200')
    spotList = data.list || []
  } catch (e) {
    countText.textContent = '加载失败'
    listHost.innerHTML =
      '<div class="list-scroll"><div class="error-box">' + escapeHtml(e.message) + '</div></div>'
    return
  }

  renderList()
  renderMarkers()
}

function renderList() {
  const host = document.getElementById('spot-list')
  document.getElementById('count-text').textContent = '共 ' + spotList.length + ' 个机位'

  if (!spotList.length) {
    host.innerHTML = '<div class="empty">还没有机位，去「发布机位」分享第一个吧</div>'
    return
  }

  host.innerHTML = spotList
    .map(
      (s) => `<div class="spot-row" data-id="${s.id}">
        <div class="row-title">${escapeHtml(s.name)}</div>
        <div class="row-meta">
          <span>📍 ${escapeHtml(s.city)}</span>
          <span>❤ ${s.likeCount || 0}</span>
          <span>👁 ${s.viewCount || 0}</span>
        </div>
      </div>`
    )
    .join('')

  host.querySelectorAll('.spot-row').forEach((el) => {
    el.addEventListener('click', () => selectSpot(Number(el.dataset.id)))
  })
}

function renderMarkers() {
  if (!mapInstance) return

  spotList.forEach((s) => {
    const marker = L.marker([Number(s.latitude), Number(s.longitude)], {
      icon: MapUtil.pinIcon(false),
      title: s.name
    })
    marker.bindPopup(
      `<b>${escapeHtml(s.name)}</b><br/><span style="color:#6b7280">${escapeHtml(s.city)}</span><br/>` +
        `<a href="/detail.html?id=${s.id}">查看详情 →</a>`
    )
    marker.on('click', () => selectSpot(s.id, true))
    marker.addTo(mapInstance)
    markerMap[s.id] = marker
  })

  MapUtil.fitSpots(mapInstance, spotList)
}

function selectSpot(id, fromMarker) {
  selectedId = id

  document.querySelectorAll('.spot-row').forEach((el) => {
    el.classList.toggle('active', Number(el.dataset.id) === id)
  })

  const spot = spotList.find((s) => s.id === id)
  if (!spot) return

  if (mapInstance) {
    mapInstance.panTo([Number(spot.latitude), Number(spot.longitude)])
    Object.keys(markerMap).forEach((key) => {
      markerMap[key].setIcon(MapUtil.pinIcon(Number(key) === id))
    })
    if (!fromMarker) markerMap[id].openPopup()
  }

  const active = document.querySelector('.spot-row.active')
  if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
}
