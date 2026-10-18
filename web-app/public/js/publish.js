// 发布机位
let pickMap = null
let pickMarker = null
let pickedLatLng = null
let selectedTagIds = []
let uploadedImages = []

document.addEventListener('DOMContentLoaded', async () => {
  renderHeader('publish')

  if (!Auth.isLoggedIn()) {
    document.getElementById('err').style.display = 'block'
    document.getElementById('err').innerHTML =
      '发布机位需要先登录。 <a href="/login.html?redirect=%2Fpublish.html" style="text-decoration:underline">去登录 / 注册</a>'
    document.getElementById('submit').disabled = true
  }

  initMap()
  await loadTags()
  await loadCities()

  document.getElementById('uploader').addEventListener('click', (e) => {
    if (e.target.id === 'up-add') document.getElementById('file-input').click()
  })
  document.getElementById('file-input').addEventListener('change', onFilesPicked)
  document.getElementById('use-location').addEventListener('click', useMyLocation)
  document.getElementById('submit').addEventListener('click', submit)
  renderUploader()
})

function initMap() {
  if (!MapUtil.available()) {
    document.getElementById('map-tip').style.display = 'block'
    return
  }
  pickMap = MapUtil.create('map-pick', [31.2304, 121.4737], 11)
  pickMap.on('click', (e) => {
    setPicked(e.latlng.lat, e.latlng.lng)
  })
}

function setPicked(lat, lng) {
  pickedLatLng = { lat, lng }
  if (!pickMap) return
  const point = [lat, lng]
  if (pickMarker) {
    pickMarker.setLatLng(point)
  } else {
    pickMarker = L.marker(point, { icon: MapUtil.pinIcon(true) }).addTo(pickMap)
  }
  document.getElementById('pick-info').textContent =
    '已选坐标：' + lat.toFixed(5) + ', ' + lng.toFixed(5)
}

function useMyLocation() {
  if (!navigator.geolocation) return showToast('当前浏览器不支持定位')
  showToast('正在获取位置…')
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      setPicked(lat, lng)
      if (pickMap) pickMap.setView([lat, lng], 14)
    },
    () => showToast('定位失败，请在地图上手动选择位置')
  )
}

async function loadTags() {
  try {
    const data = await Api.get('/api/tag')
    const host = document.getElementById('tags')
    host.innerHTML = data.list
      .map((t) => `<div class="chip" data-id="${t.id}">${escapeHtml(t.name)}</div>`)
      .join('')
    host.querySelectorAll('.chip').forEach((el) => {
      el.addEventListener('click', () => {
        const id = Number(el.dataset.id)
        if (selectedTagIds.includes(id)) {
          selectedTagIds = selectedTagIds.filter((x) => x !== id)
          el.classList.remove('active')
        } else {
          selectedTagIds.push(id)
          el.classList.add('active')
        }
      })
    })
  } catch (e) {
    showToast(e.message)
  }
}

async function loadCities() {
  try {
    const data = await Api.get('/api/city')
    document.getElementById('city-list').innerHTML = data.list
      .map((c) => `<option value="${escapeHtml(c.name)}"></option>`)
      .join('')
  } catch (e) {
    /* 城市列表失败不阻塞发布 */
  }
}

async function onFilesPicked(e) {
  const files = Array.from(e.target.files || [])
  e.target.value = ''
  if (!files.length) return

  const remain = 9 - uploadedImages.length
  if (remain <= 0) return showToast('最多上传 9 张图片')

  showToast('正在上传…')
  for (const file of files.slice(0, remain)) {
    try {
      const url = await Api.upload(file)
      uploadedImages.push(url)
      renderUploader()
    } catch (err) {
      showToast(err.message)
      break
    }
  }
}

function renderUploader() {
  const host = document.getElementById('uploader')
  host.innerHTML =
    uploadedImages
      .map(
        (url, i) =>
          `<div class="up-item"><img src="${escapeHtml(url)}" alt="" />
            <button class="del" data-index="${i}" title="删除">×</button></div>`
      )
      .join('') + (uploadedImages.length < 9 ? '<div class="up-add" id="up-add">＋</div>' : '')

  host.querySelectorAll('.del').forEach((btn) => {
    btn.addEventListener('click', () => {
      uploadedImages.splice(Number(btn.dataset.index), 1)
      renderUploader()
    })
  })
}

async function submit() {
  const errBox = document.getElementById('err')
  errBox.style.display = 'none'

  const name = document.getElementById('name').value.trim()
  const city = document.getElementById('city').value.trim()
  const address = document.getElementById('address').value.trim()
  const description = document.getElementById('description').value.trim()
  const shootTime = document.getElementById('shootTime').value.trim()

  const fail = (msg) => {
    errBox.textContent = msg
    errBox.style.display = 'block'
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!name) return fail('请填写机位名称')
  if (!city) return fail('请填写城市')
  if (!pickedLatLng) return fail('请在地图上点击选择机位位置')

  const button = document.getElementById('submit')
  button.disabled = true
  button.textContent = '提交中…'

  try {
    await Api.post('/api/spot', {
      name,
      city,
      address,
      description,
      shootTime,
      latitude: pickedLatLng.lat,
      longitude: pickedLatLng.lng,
      media: uploadedImages.map((url) => ({ type: 1, url })),
      tagIds: selectedTagIds
    })
    showToast('已提交，等待管理员审核')
    setTimeout(() => location.replace('/mine.html'), 800)
  } catch (e) {
    fail(e.message)
    button.disabled = false
    button.textContent = '提交审核'
  }
}
