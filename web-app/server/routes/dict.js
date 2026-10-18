const store = require('../lib/store')

module.exports = (router) => {
  router.get('/api/tag', async () => {
    const db = store.load()
    return { list: db.tags.slice().sort((a, b) => a.sort - b.sort) }
  })

  router.get('/api/city', async () => {
    const db = store.load()
    return { list: db.cities.slice().sort((a, b) => a.sort - b.sort) }
  })
}
