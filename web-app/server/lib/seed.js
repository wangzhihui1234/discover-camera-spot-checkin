// 种子数据：6 个风格标签 + 10 个热门城市 + 6 个官方机位
// 只在首次创建 data/db.json 时写入
// 每个官方机位都带一张实拍封面（图片在 public/images/seed/ 下）

function seed(db) {
  const tags = ['人像', '夜景', '街拍', '日落', '建筑', '城市天际线']
  tags.forEach((name, i) => db.tags.push({ id: i + 1, name, sort: i + 1 }))

  const cities = ['上海', '北京', '广州', '深圳', '杭州', '成都', '重庆', '西安', '南京', '武汉']
  cities.forEach((name, i) => db.cities.push({ id: i + 1, name, sort: i + 1 }))

  const spotSeeds = [
    {
      name: '外滩万国建筑群观景台',
      city: '上海',
      latitude: 31.24,
      longitude: 121.4903,
      address: '中山东一路',
      description:
        '站在外滩看对岸只是一半，真正出片的是蓝调时刻拍这一侧的万国建筑群：海关大楼钟楼、浦发银行大楼穹顶、和平饭店一字排开，江面上还有游船划过。建议日落后 20 分钟开拍，天空呈钴蓝色、建筑灯光已亮，冷暖对比最漂亮。',
      shootTime: '日落后 20 分钟（蓝调时刻）',
      cover: '/images/seed/waitan.jpg',
      tagIds: [5, 6]
    },
    {
      name: '故宫角楼',
      city: '北京',
      latitude: 39.9144,
      longitude: 116.397,
      address: '景山前街',
      description:
        '护城河畔拍角楼是经典机位，关键在对称构图与倒影。人像建议站在河沿石栏旁，让角楼落在画面左上或右上三分之一处；清晨与日落光线最柔，无风时水面倒影完整。',
      shootTime: '日出 / 日落（无风时倒影最佳）',
      cover: '/images/seed/gugong-jiaolou.png',
      tagIds: [5, 1]
    },
    {
      name: '广州塔·花城广场',
      city: '广州',
      latitude: 23.1066,
      longitude: 113.3245,
      address: '花城广场',
      description:
        '花城广场的水池边是拍广州塔的最佳前景：用池水做倒影，左右两侧是珠江新城双塔（西塔、东塔），画面非常满。建议 19:30 后灯全开，长曝光 2-4 秒把水面拍平。',
      shootTime: '夜晚（19:30 后灯光全开）',
      cover: '/images/seed/guangzhou-tower.jpg',
      tagIds: [6, 2]
    },
    {
      name: '深圳湾公园',
      city: '深圳',
      latitude: 22.5374,
      longitude: 114.1063,
      address: '滨海大道',
      description:
        '退潮时走到乱石滩上，左边是深圳湾大桥方向的长桥，右侧是城市天际线，日落时分天空层次非常丰富。人站在石滩上做剪影，或者只拍环境和云，都不会出错。',
      shootTime: '日落（退潮时段）',
      cover: '/images/seed/shenzhen-bay.png',
      tagIds: [4, 6]
    },
    {
      name: '西湖·集贤亭',
      city: '杭州',
      latitude: 30.2489,
      longitude: 120.1552,
      address: '湖滨路（一公园湖边）',
      description:
        '湖滨一带的湖中亭，用垂柳做前景框住亭子，远处是连绵山影。阴雨天反而更出片：天色灰蓝、湖面起浪，配上湿漉漉的石板路，是很典型的江南烟雨感。',
      shootTime: '清晨或阴雨天',
      cover: '/images/seed/xihu.png',
      tagIds: [1, 5]
    },
    {
      name: '成都太古里',
      city: '成都',
      latitude: 30.653,
      longitude: 104.083,
      address: '中纱帽街（近春熙路站）',
      description:
        '太古里的挑高玻璃楼与川西风格黑瓦坡屋顶混搭，是现代与传统的对撞。地铁春熙路站 C 口出来往大慈寺方向走，找那根黑色艺术立柱当前景，人形走过时抓拍最有氛围。',
      shootTime: '全天（傍晚灯光与天色叠加更好）',
      cover: '/images/seed/chengdu-taikooli.png',
      tagIds: [3, 5]
    }
  ]

  const now = new Date().toISOString()
  spotSeeds.forEach((s, i) => {
    db.spots.push({
      id: i + 1,
      userId: 0,
      name: s.name,
      city: s.city,
      latitude: s.latitude,
      longitude: s.longitude,
      address: s.address,
      description: s.description,
      shootTime: s.shootTime,
      coverUrl: s.cover,
      media: [{ type: 1, url: s.cover, sort: 0 }],
      tagIds: s.tagIds,
      status: 1,
      rejectReason: '',
      isOfficial: 1,
      viewCount: 0,
      likeCount: 0,
      favoriteCount: 0,
      commentCount: 0,
      createdAt: now,
      updatedAt: now
    })
  })
}

module.exports = { seed }
