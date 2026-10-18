// 后端接口封装（同源请求，无需配置 BaseURL）
const TOKEN_KEY = 'spot_token'
const USER_KEY = 'spot_user'

const Api = {
  token() {
    return localStorage.getItem(TOKEN_KEY) || ''
  },

  async request(method, path, body) {
    const headers = { 'Content-Type': 'application/json' }
    const token = this.token()
    if (token) headers.Authorization = 'Bearer ' + token

    let res
    try {
      res = await fetch(path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body)
      })
    } catch (e) {
      throw new Error('无法连接后端服务。请确认已执行 npm start，并通过 http://localhost:3000 打开页面。')
    }

    let json = null
    try {
      json = await res.json()
    } catch (e) {
      throw new Error('服务端返回格式异常（HTTP ' + res.status + '）')
    }

    if (json && json.code === 0) return json.data

    // 登录态失效，清掉本地缓存
    if (json && json.code === 401) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    }

    throw new Error((json && json.message) || '请求失败')
  },

  get(path) {
    return this.request('GET', path)
  },
  post(path, body) {
    return this.request('POST', path, body || {})
  },
  put(path, body) {
    return this.request('PUT', path, body || {})
  },

  // 图片：先读成 base64，再提交给后端转存
  async upload(file) {
    if (!file || !/^image\//.test(file.type)) {
      throw new Error('只能上传图片文件（jpg / png / webp / gif）')
    }
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(new Error('读取图片失败'))
      reader.readAsDataURL(file)
    })
    const data = await this.post('/api/upload', { dataUrl })
    return data.url
  }
}
