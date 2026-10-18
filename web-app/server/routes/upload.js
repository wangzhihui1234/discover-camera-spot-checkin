const authLib = require('../lib/auth')
const { saveDataUrl } = require('../lib/upload')
const { ApiError } = require('../lib/http')

module.exports = (router) => {
  // 图片上传：前端把文件读成 base64 dataURL 提交，后端解码后存到 uploads/
  router.post('/api/upload', async (ctx) => {
    authLib.requireAuth(ctx.req)
    if (!ctx.body.dataUrl) throw new ApiError(422, '缺少图片数据 dataUrl')
    const url = saveDataUrl(ctx.body.dataUrl)
    return { url }
  })
}
