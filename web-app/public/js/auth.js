// 登录态管理（token + 用户信息存 localStorage）
const Auth = {
  user() {
    try {
      return JSON.parse(localStorage.getItem('spot_user') || 'null')
    } catch (e) {
      return null
    }
  },

  isLoggedIn() {
    return !!Api.token() && !!this.user()
  },

  isAdmin() {
    const user = this.user()
    return !!(user && user.role === 1)
  },

  save(token, user) {
    localStorage.setItem('spot_token', token)
    localStorage.setItem('spot_user', JSON.stringify(user))
  },

  logout() {
    localStorage.removeItem('spot_token')
    localStorage.removeItem('spot_user')
  },

  // 跳登录页，并记住回跳地址
  gotoLogin() {
    const from = encodeURIComponent(location.pathname + location.search)
    location.href = '/login.html?redirect=' + from
  },

  // 需要登录的操作先调它
  requireLogin() {
    if (this.isLoggedIn()) return true
    showToast('请先登录')
    setTimeout(() => this.gotoLogin(), 400)
    return false
  }
}
