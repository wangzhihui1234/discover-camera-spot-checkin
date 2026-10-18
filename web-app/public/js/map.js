// 地图封装（Leaflet + 高德瓦片，无需申请 key）
// 若 CDN 未加载成功，available() 返回 false，页面会给出降级提示

const MAP_TILE_URL =
  'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}'

const MapUtil = {
  available() {
    return typeof L !== 'undefined'
  },

  create(elementId, center, zoom) {
    if (!this.available()) return null
    const map = L.map(elementId, { zoomControl: true, attributionControl: false }).setView(
      center,
      zoom || 5
    )
    L.tileLayer(MAP_TILE_URL, { subdomains: ['1', '2', '3', '4'], maxZoom: 18 }).addTo(map)
    return map
  },

  // 根据机位点位自动缩放到合适视野
  fitSpots(map, spots) {
    if (!map || !spots.length) return
    const points = spots.map((s) => [Number(s.latitude), Number(s.longitude)])
    if (points.length === 1) {
      map.setView(points[0], 14)
      return
    }
    map.fitBounds(L.latLngBounds(points).pad(0.25))
  },

  pinIcon(selected) {
    return L.divIcon({
      className: '',
      html:
        '<div style="width:16px;height:16px;border-radius:50%;background:' +
        (selected ? '#ff4d5e' : '#3b6ef5') +
        ';border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.35)"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    })
  }
}
