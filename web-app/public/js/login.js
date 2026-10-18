// 登录 / 注册
let mode = 'login'

document.addEventListener('DOMContentLoaded', () => {
  renderHeader('')

  // 已登录直接回跳
  if (Auth.isLoggedIn()) {
    location.replace(redirectTarget())
    return
  }

  document.getElementById('tab-login').addEventListener('click', () => setMode('login'))
  document.getElementById('tab-register').addEventListener('click', () => setMode('register'))
  document.getElementById('submit-btn').addEventListener('click', submit)
  document.getElementById('password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submit()
  })
})

function redirectTarget() {
  const target = qs('redirect')
  return target && target.startsWith('/') ? target : '/index.html'
}

function setMode(next) {
  mode = next
  document.getElementById('tab-login').classList.toggle('active', mode === 'login')
  document.getElementById('tab-register').classList.toggle('active', mode === 'register')
  document.getElementById('nickname-field').style.display = mode === 'register' ? 'block' : 'none'
  document.getElementById('submit-btn').textContent = mode === 'login' ? '登录' : '注册并登录'
  hideError()
}

function showError(message) {
  const box = document.getElementById('auth-error')
  box.textContent = message
  box.style.display = 'block'
}

function hideError() {
  document.getElementById('auth-error').style.display = 'none'
}

async function submit() {
  hideError()
  const username = document.getElementById('username').value.trim()
  const password = document.getElementById('password').value
  const nickname = document.getElementById('nickname').value.trim()

  if (!username) return showError('请输入用户名')
  if (!password) return showError('请输入密码')

  const button = document.getElementById('submit-btn')
  button.disabled = true
  button.textContent = '处理中…'

  try {
    const data =
      mode === 'login'
        ? await Api.post('/api/auth/login', { username, password })
        : await Api.post('/api/auth/register', { username, password, nickname })

    Auth.save(data.token, data.user)
    showToast(mode === 'login' ? '登录成功' : '注册成功')
    setTimeout(() => location.replace(redirectTarget()), 400)
  } catch (e) {
    showError(e.message)
    button.disabled = false
    button.textContent = mode === 'login' ? '登录' : '注册并登录'
  }
}
