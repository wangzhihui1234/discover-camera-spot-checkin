// 搜索页：关键词 + 城市 + 标签
let activeTagId = ''

document.addEventListener('DOMContentLoaded', async () => {
  renderHeader('search')

  document.getElementById('search-btn').addEventListener('click', doSearch)
  document.getElementById('keyword').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSearch()
  })
  document.getElementById('city').addEventListener('change', doSearch)

  await loadOptions()
  doSearch()
})

async function loadOptions() {
  try {
    const [tags, cities] = await Promise.all([Api.get('/api/tag'), Api.get('/api/city')])

    const tagHost = document.getElementById('tags')
    tagHost.innerHTML =
      `<div class="chip active" data-id="">全部风格</div>` +
      tags.list
        .map((t) => `<div class="chip" data-id="${t.id}">${escapeHtml(t.name)}</div>`)
        .join('')

    tagHost.querySelectorAll('.chip').forEach((el) => {
      el.addEventListener('click', () => {
        activeTagId = el.dataset.id
        tagHost.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c === el))
        doSearch()
      })
    })

    const citySelect = document.getElementById('city')
    cities.list.forEach((c) => {
      const option = document.createElement('option')
      option.value = c.name
      option.textContent = c.name
      citySelect.appendChild(option)
    })
  } catch (e) {
    document.getElementById('results').innerHTML =
      '<div class="error-box" style="grid-column:1/-1">' + escapeHtml(e.message) + '</div>'
  }
}

async function doSearch() {
  const keyword = document.getElementById('keyword').value.trim()
  const city = document.getElementById('city').value
  const host = document.getElementById('results')
  const info = document.getElementById('result-info')

  info.textContent = '搜索中…'
  host.innerHTML = ''

  const params = new URLSearchParams({ pageSize: '200' })
  if (keyword) params.set('keyword', keyword)
  if (city) params.set('city', city)
  if (activeTagId) params.set('tagId', activeTagId)

  try {
    const data = await Api.get('/api/spot?' + params.toString())
    info.textContent = '共找到 ' + data.total + ' 个机位'
    host.innerHTML = data.list.length
      ? data.list.map(spotCardHtml).join('')
      : '<div class="empty" style="grid-column:1/-1">没有匹配的机位，换个关键词试试</div>'
  } catch (e) {
    info.textContent = ''
    host.innerHTML = '<div class="error-box" style="grid-column:1/-1">' + escapeHtml(e.message) + '</div>'
  }
}
