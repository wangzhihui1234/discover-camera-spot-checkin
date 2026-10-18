// 图片上传：前端把图片读成 base64 dataURL 传过来，这里解码后写入 uploads/
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { ApiError } = require('./http')

const ROOT = path.join(__dirname, '..', '..')
const UPLOAD_DIR = path.join(ROOT, 'uploads')

const MIME_EXT = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif'
}

const MAX_BYTES = 8 * 1024 * 1024 // 单张 8MB

function saveDataUrl(dataUrl) {
  const matched = /^data:([^;]+);base64,([\s\S]+)$/.exec(String(dataUrl || ''))
  if (!matched) throw new ApiError(422, '图片数据格式不正确')

  const mime = matched[1].toLowerCase()
  const ext = MIME_EXT[mime]
  if (!ext) throw new ApiError(422, '只支持 jpg / png / webp / gif 格式的图片')

  const buffer = Buffer.from(matched[2], 'base64')
  if (!buffer.length) throw new ApiError(422, '图片内容为空')
  if (buffer.length > MAX_BYTES) throw new ApiError(422, '单张图片不能超过 8MB')

  const d = new Date()
  const sub = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
  const dir = path.join(UPLOAD_DIR, sub)
  fs.mkdirSync(dir, { recursive: true })

  const name = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`
  fs.writeFileSync(path.join(dir, name), buffer)

  return `/uploads/${sub}/${name}`
}

module.exports = { saveDataUrl, UPLOAD_DIR }
