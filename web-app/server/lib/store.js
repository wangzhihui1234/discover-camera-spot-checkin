// JSON 文件存储：整个数据库是一个 db.json，读入内存 + 变更后落盘
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { seed } = require('./seed')

const ROOT = path.join(__dirname, '..', '..')
const DATA_DIR = path.join(ROOT, 'data')
const DB_FILE = path.join(DATA_DIR, 'db.json')

let db = null

function createEmpty() {
  return {
    version: 1,
    // 签名密钥：首次生成后固定，保证重启后已签发的 token 仍有效
    secret: crypto.randomBytes(32).toString('hex'),
    users: [],
    spots: [],
    tags: [],
    cities: [],
    likes: [],
    favorites: [],
    comments: []
  }
}

function load() {
  if (db) return db

  fs.mkdirSync(DATA_DIR, { recursive: true })

  if (fs.existsSync(DB_FILE)) {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
  } else {
    db = createEmpty()
    seed(db)
    flush()
    console.log(`✔ 已生成初始数据：${db.tags.length} 个标签 / ${db.cities.length} 个城市 / ${db.spots.length} 个官方机位`)
  }
  return db
}

function flush() {
  if (!db) return
  const tmp = DB_FILE + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8')
  fs.renameSync(tmp, DB_FILE)
}

function nextId(collection) {
  const list = db[collection]
  if (!list.length) return 1
  return list.reduce((max, item) => (item.id > max ? item.id : max), 0) + 1
}

function insert(collection, doc) {
  const row = Object.assign({ id: nextId(collection) }, doc)
  db[collection].push(row)
  flush()
  return row
}

function find(collection, predicate) {
  return db[collection].find(predicate) || null
}

function update(collection, id, patch) {
  const row = find(collection, (item) => item.id === id)
  if (!row) return null
  Object.assign(row, patch)
  flush()
  return row
}

function remove(collection, predicate) {
  const list = db[collection]
  const index = list.findIndex(predicate)
  if (index === -1) return null
  const [row] = list.splice(index, 1)
  flush()
  return row
}

const nowISO = () => new Date().toISOString()

module.exports = { load, flush, insert, find, update, remove, nextId, nowISO, DB_FILE }
