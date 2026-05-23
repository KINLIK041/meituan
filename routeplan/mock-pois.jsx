// ─── 全量 POI 数据（29个商家/景点，覆盖6个场景所有路线）────────────
// 每个 POI 的 images 数组：[外景, 内景/产品, 特写, 氛围]
// 命名规则: images/stores/{slug}-{1..4}.jpg

const ALL_PLACES = {

// ═══ 展览 / 文化 ═══
'城东微展厅': {
  id: 'p-chenxi', name: '城东微展厅 · 当代城市影像', short: '城东微展厅', category: '展览',
  rating: 4.7, review_count: 1284, avg_price: 30,
  opening_hours: '10:00 - 19:00', current_status: '当前开放中', current_status_short: '开放中',
  status_tone: 'green', wait_time: '无需排队',
  tags: ['出片好看', '适合拍照', '人不多', '安静'], risk_tags: ['闭馆较早'],
  recommendation_reason: '离地铁口8分钟，展厅不大，"出片好看、不挤"，逛完正好饭点。',
  lng: 116.4600, lat: 39.9325,
  images: ['images/stores/chenxi-exhibition-1.jpg','images/stores/chenxi-exhibition-2.jpg','images/stores/chenxi-exhibition-3.jpg','images/stores/chenxi-exhibition-4.jpg'],
  address: '朝阳区团结湖北路3号', mock_x: 28, mock_y: 22,
},

'798 街区漫步': {
  id: 'p-798', name: '798 艺术街区', short: '798 街区漫步', category: '街区 / 展览',
  rating: 4.6, review_count: 5620, avg_price: 0,
  opening_hours: '全天开放', current_status: '当前开放中', current_status_short: '开放中',
  status_tone: 'green', wait_time: '无需排队',
  tags: ['出片好看', '网红打卡', '艺术氛围', '逛逛走走'], risk_tags: ['下午光线最好'],
  recommendation_reason: '几百个画廊和艺术空间，随手拍都是大片，适合慢慢逛。',
  lng: 116.4950, lat: 39.9840,
  images: ['images/stores/798-art-district-1.jpg','images/stores/798-art-district-2.jpg','images/stores/798-art-district-3.jpg','images/stores/798-art-district-4.jpg'],
  address: '朝阳区酒仙桥路4号', mock_x: 55, mock_y: 12,
},

'城西胶片小展': {
  id: 'p-westfilm', name: '城西胶片小展', short: '城西胶片小展', category: '展览',
  rating: 4.5, review_count: 876, avg_price: 45,
  opening_hours: '10:00 - 18:00', current_status: '当前开放中', current_status_short: '开放中',
  status_tone: 'green', wait_time: '无需排队',
  tags: ['出片好看', '文艺', '安静'], risk_tags: ['周一闭馆'],
  recommendation_reason: '小众胶片摄影展，光线柔和，适合安静约会。',
  lng: 116.3200, lat: 39.9100,
  images: ['images/stores/west-film-exhibition-1.jpg','images/stores/west-film-exhibition-2.jpg','images/stores/west-film-exhibition-3.jpg','images/stores/west-film-exhibition-4.jpg'],
  address: '海淀区中关村大街42号', mock_x: 35, mock_y: 25,
},

'城市互动展': {
  id: 'p-cityex', name: '城市互动科技展', short: '城市互动展', category: '展览',
  rating: 4.7, review_count: 2103, avg_price: 80,
  opening_hours: '09:30 - 17:30', current_status: '当前开放中', current_status_short: '开放中',
  status_tone: 'green', wait_time: '需提前预约',
  tags: ['互动体验', '亲子友好', '科技感'], risk_tags: ['需提前预约', '记得带身份证'],
  recommendation_reason: '沉浸式互动展览，孩子能专注玩2小时以上。',
  lng: 116.4700, lat: 39.9200,
  images: ['images/stores/city-interactive-exhibition-1.jpg','images/stores/city-interactive-exhibition-2.jpg','images/stores/city-interactive-exhibition-3.jpg','images/stores/city-interactive-exhibition-4.jpg'],
  address: '朝阳区光华路9号', mock_x: 60, mock_y: 40,
},

// ═══ 餐厅 / 烤肉 ═══
'山野炭火烤肉': {
  id: 'p-shanye', name: '山野炭火烤肉（团结湖店）', short: '山野炭火烤肉', category: '烤肉',
  rating: 4.6, review_count: 3412, avg_price: 95,
  opening_hours: '11:30 - 22:30', current_status: '当前营业中 · 预计等位15分钟', current_status_short: '等位约15分',
  status_tone: 'amber', wait_time: '约15分钟',
  tags: ['适合朋友聚会', '分量足', '离地铁近', '适合聊天', '服务好'], risk_tags: ['晚高峰可能等位', '环境偏热闹'],
  recommendation_reason: '人均95，靠近地铁口，"分量足、适合一群人吃"，已预留取号时间。',
  lng: 116.4655, lat: 39.9270,
  images: ['images/stores/shanye-kaorou-1.jpg','images/stores/shanye-kaorou-2.jpg','images/stores/shanye-kaorou-3.jpg','images/stores/shanye-kaorou-4.jpg'],
  address: '朝阳区团结湖南路12号', mock_x: 52, mock_y: 60,
},

// ═══ 咖啡 / 甜品 ═══
'慢岛甜品咖啡': {
  id: 'p-mandao', name: '慢岛 · 甜品咖啡', short: '慢岛甜品咖啡', category: '咖啡 / 甜品',
  rating: 4.8, review_count: 902, avg_price: 38,
  opening_hours: '11:00 - 22:00', current_status: '当前营业中', current_status_short: '营业中',
  status_tone: 'green', wait_time: '无需排队',
  tags: ['适合聊天', '环境安静', '出片好看', '甜品好吃'], risk_tags: [],
  recommendation_reason: '吃完走6分钟就到，环境安静，"提拉米苏"和"窗边位"被提到最多。',
  lng: 116.4625, lat: 39.9310,
  images: ['images/stores/mandao-dessert-1.jpg','images/stores/mandao-dessert-2.jpg','images/stores/mandao-dessert-3.jpg','images/stores/mandao-dessert-4.jpg'],
  address: '朝阳区团结湖东街5号', mock_x: 80, mock_y: 30,
},

'独椅咖啡': {
  id: 'p-duyi', name: '独椅咖啡', short: '独椅咖啡', category: '咖啡',
  rating: 4.6, review_count: 765, avg_price: 35,
  opening_hours: '09:00 - 22:00', current_status: '当前营业中', current_status_short: '营业中',
  status_tone: 'green', wait_time: '无需排队',
  tags: ['安静', '适合发呆', '不催台', '咖啡好喝'], risk_tags: ['周末人略多'],
  recommendation_reason: '一个人的角落，"不催台"，可以从下午坐到傍晚。',
  lng: 116.4550, lat: 39.9350,
  images: ['images/stores/duyi-coffee-1.jpg','images/stores/duyi-coffee-2.jpg','images/stores/duyi-coffee-3.jpg','images/stores/duyi-coffee-4.jpg'],
  address: '东城区东四北大街22号', mock_x: 45, mock_y: 45,
},

'雨夜咖啡 · 窗边位': {
  id: 'p-rainynight', name: '雨夜咖啡 · 窗边位', short: '雨夜咖啡 · 窗边位', category: '咖啡',
  rating: 4.7, review_count: 1208, avg_price: 48,
  opening_hours: '10:00 - 23:00', current_status: '当前营业中', current_status_short: '营业中',
  status_tone: 'green', wait_time: '无需排队',
  tags: ['安静', '适合聊天', '夜景好看', '出片好看'], risk_tags: [],
  recommendation_reason: '窗边位看城市夜景，氛围感满分，约会首选。',
  lng: 116.3350, lat: 39.9050,
  images: ['images/stores/rainy-night-cafe-1.jpg','images/stores/rainy-night-cafe-2.jpg','images/stores/rainy-night-cafe-3.jpg','images/stores/rainy-night-cafe-4.jpg'],
  address: '海淀区成府路28号', mock_x: 70, mock_y: 55,
},

'街角面包店': {
  id: 'p-cornerbakery', name: '街角面包房', short: '街角面包店', category: '面包 / 简餐',
  rating: 4.5, review_count: 543, avg_price: 25,
  opening_hours: '07:00 - 21:00', current_status: '当前营业中', current_status_short: '营业中',
  status_tone: 'green', wait_time: '无需排队',
  tags: ['面包好吃', '价格实惠', '可外带'], risk_tags: [],
  recommendation_reason: '刚出炉的可颂配一杯美式，微散步的完美收尾。',
  lng: 116.4400, lat: 39.9380,
  images: ['images/stores/corner-bakery-1.jpg','images/stores/corner-bakery-2.jpg','images/stores/corner-bakery-3.jpg','images/stores/corner-bakery-4.jpg'],
  address: '东城区鼓楼东大街18号', mock_x: 25, mock_y: 70,
},

'隔壁书店咖啡角': {
  id: 'p-gebi', name: '隔壁书店 · 咖啡角', short: '隔壁书店咖啡角', category: '书店 / 咖啡',
  rating: 4.5, review_count: 678, avg_price: 30,
  opening_hours: '10:00 - 21:00', current_status: '当前营业中', current_status_short: '营业中',
  status_tone: 'green', wait_time: '无需排队',
  tags: ['安静', '可以看书', '人少'], risk_tags: ['21:00关门'],
  recommendation_reason: '藏在居民区里的小书店，有座不吵，可以打发一整个下午。',
  lng: 116.4500, lat: 39.9290,
  images: ['images/stores/gebi-bookstore-cafe-1.jpg','images/stores/gebi-bookstore-cafe-2.jpg','images/stores/gebi-bookstore-cafe-3.jpg','images/stores/gebi-bookstore-cafe-4.jpg'],
  address: '朝阳区团结湖北二条6号', mock_x: 75, mock_y: 75,
},

'河边书店咖啡': {
  id: 'p-riverside', name: '河边书店 · 咖啡', short: '河边书店咖啡', category: '书店 / 咖啡',
  rating: 4.6, review_count: 892, avg_price: 35,
  opening_hours: '09:00 - 22:00', current_status: '当前营业中', current_status_short: '营业中',
  status_tone: 'green', wait_time: '无需排队',
  tags: ['安静', '河边风景', '适合拍照', '约会'], risk_tags: [],
  recommendation_reason: '坐在河边看书喝咖啡，慢节奏约会的理想场景。',
  lng: 116.3850, lat: 39.9150,
  images: ['images/stores/riverside-bookstore-cafe-1.jpg','images/stores/riverside-bookstore-cafe-2.jpg','images/stores/riverside-bookstore-cafe-3.jpg','images/stores/riverside-bookstore-cafe-4.jpg'],
  address: '东城区安定门内大街35号', mock_x: 40, mock_y: 80,
},

'街角连锁咖啡': {
  id: 'p-chaincafe', name: '街角连锁咖啡', short: '街角连锁咖啡', category: '咖啡 · 有座',
  rating: 4.3, review_count: 3201, avg_price: 28,
  opening_hours: '07:00 - 22:00', current_status: '当前营业中', current_status_short: '营业中',
  status_tone: 'green', wait_time: '无需排队',
  tags: ['有座', '近', '出餐快'], risk_tags: ['晚间座位较紧张'],
  recommendation_reason: '走3分钟到，几乎一定有座，能讲事能等人。',
  lng: 116.4100, lat: 39.9080,
  images: ['images/stores/corner-chain-cafe-1.jpg','images/stores/corner-chain-cafe-2.jpg','images/stores/corner-chain-cafe-3.jpg','images/stores/corner-chain-cafe-4.jpg'],
  address: '东城区东直门外大街12号', mock_x: 50, mock_y: 50,
},

// ═══ 公园 / 户外 ═══
'团结湖公园': {
  id: 'p-tuanjiehu', name: '团结湖公园', short: '团结湖公园', category: '公园',
  rating: 4.5, review_count: 4502, avg_price: 0,
  opening_hours: '06:00 - 22:00', current_status: '当前开放中', current_status_short: '开放中',
  status_tone: 'green', wait_time: '无需排队',
  tags: ['免费', '安静', '散步', '湖边'], risk_tags: [],
  recommendation_reason: '市中心免费公园，湖边长椅，节奏松散适合慢慢聊。',
  lng: 116.4670, lat: 39.9280,
  images: ['images/stores/tuanjiehu-park-1.jpg','images/stores/tuanjiehu-park-2.jpg','images/stores/tuanjiehu-park-3.jpg','images/stores/tuanjiehu-park-4.jpg'],
  address: '朝阳区团结湖南里16号', mock_x: 40, mock_y: 60,
},

'园林公园': {
  id: 'p-gardenpark', name: '园林公园', short: '园林公园', category: '公园',
  rating: 4.6, review_count: 3201, avg_price: 5,
  opening_hours: '06:00 - 21:00', current_status: '当前开放中', current_status_short: '开放中',
  status_tone: 'green', wait_time: '无需排队',
  tags: ['安静', '园林景致', '散步', '出片好看'], risk_tags: [],
  recommendation_reason: '一步一景的古典园林，两个人慢慢走慢慢聊。',
  lng: 116.4000, lat: 39.9200,
  images: ['images/stores/garden-park-1.jpg','images/stores/garden-park-2.jpg','images/stores/garden-park-3.jpg','images/stores/garden-park-4.jpg'],
  address: '东城区地坛公园东侧', mock_x: 30, mock_y: 55,
},

'社区公园': {
  id: 'p-communitypark', name: '社区公园', short: '社区公园', category: '公园',
  rating: 4.3, review_count: 1567, avg_price: 0,
  opening_hours: '全天开放', current_status: '当前开放中', current_status_short: '开放中',
  status_tone: 'green', wait_time: '无需排队',
  tags: ['免费', '近', '有滑梯', '有沙坑'], risk_tags: ['雨天不建议'],
  recommendation_reason: '便宜、放电、就近吃饭，孩子状态崩了能很快回家。',
  lng: 116.4850, lat: 39.9350,
  images: ['images/stores/community-park-1.jpg','images/stores/community-park-2.jpg','images/stores/community-park-3.jpg','images/stores/community-park-4.jpg'],
  address: '朝阳区惠新西街北口附近', mock_x: 85, mock_y: 45,
},

'运河步道': {
  id: 'p-canal', name: '运河步道', short: '运河步道', category: '散步',
  rating: 4.4, review_count: 890, avg_price: 0,
  opening_hours: '全天开放', current_status: '当前开放中', current_status_short: '开放中',
  status_tone: 'green', wait_time: '无需排队',
  tags: ['免费', '散步', '安静', '河边'], risk_tags: [],
  recommendation_reason: '想动一动但不想很累：走一段河边步道，吃点东西，回家。',
  lng: 116.4200, lat: 39.9500,
  images: ['images/stores/canal-walkway-1.jpg','images/stores/canal-walkway-2.jpg','images/stores/canal-walkway-3.jpg','images/stores/canal-walkway-4.jpg'],
  address: '朝阳区亮马河沿岸', mock_x: 20, mock_y: 15,
},

// ═══ 面馆 / 简餐 ═══
'蘑屋拍照面馆': {
  id: 'p-mowu', name: '蘑屋 · 拍照面馆', short: '蘑屋拍照面馆', category: '面食',
  rating: 4.5, review_count: 1102, avg_price: 42,
  opening_hours: '11:00 - 21:00', current_status: '当前营业中', current_status_short: '营业中',
  status_tone: 'green', wait_time: '无需排队',
  tags: ['出片好看', '面好吃', '有意思'], risk_tags: [],
  recommendation_reason: '蘑菇主题面馆，店内布置很出片，吃完还能拍一组。',
  lng: 116.4880, lat: 39.9800,
  images: ['images/stores/mowu-noodle-1.jpg','images/stores/mowu-noodle-2.jpg','images/stores/mowu-noodle-3.jpg','images/stores/mowu-noodle-4.jpg'],
  address: '朝阳区酒仙桥路10号', mock_x: 65, mock_y: 20,
},

'街口面馆': {
  id: 'p-jiekou', name: '街口面馆', short: '街口面馆', category: '面食',
  rating: 4.4, review_count: 876, avg_price: 30,
  opening_hours: '10:30 - 21:00', current_status: '当前营业中', current_status_short: '营业中',
  status_tone: 'green', wait_time: '无需排队',
  tags: ['实惠', '快', '面好吃'], risk_tags: [],
  recommendation_reason: '一碗热面十几块，快进快出不耽误，邻里老店。',
  lng: 116.4100, lat: 39.9220,
  images: ['images/stores/jiekou-noodle-1.jpg','images/stores/jiekou-noodle-2.jpg','images/stores/jiekou-noodle-3.jpg','images/stores/jiekou-noodle-4.jpg'],
  address: '东城区安定门内大街88号', mock_x: 35, mock_y: 85,
},

'老张牛肉面': {
  id: 'p-laozhang', name: '老张牛肉面', short: '老张牛肉面', category: '面食',
  rating: 4.5, review_count: 1543, avg_price: 40,
  opening_hours: '10:00 - 21:30', current_status: '当前营业中', current_status_short: '营业中',
  status_tone: 'green', wait_time: '无需排队',
  tags: ['上菜快', '牛肉多', '热乎', '不用等位'], risk_tags: ['辣度可调，建议提前说'],
  recommendation_reason: '不用等位，10分钟上桌，一碗热面直接回家。',
  lng: 116.4350, lat: 39.9250,
  images: ['images/stores/laozhang-noodle-1.jpg','images/stores/laozhang-noodle-2.jpg','images/stores/laozhang-noodle-3.jpg','images/stores/laozhang-noodle-4.jpg'],
  address: '朝阳区东大桥路45号', mock_x: 55, mock_y: 75,
},

'邻家厨房': {
  id: 'p-linjia', name: '邻家厨房', short: '邻家厨房', category: '简餐',
  rating: 4.3, review_count: 543, avg_price: 45,
  opening_hours: '11:00 - 20:30', current_status: '当前营业中', current_status_short: '营业中',
  status_tone: 'green', wait_time: '无需排队',
  tags: ['家常菜', '适合孩子', '不辣'], risk_tags: ['中午是用餐高峰'],
  recommendation_reason: '家常口味，有儿童餐，吃完就能回家午睡。',
  lng: 116.4800, lat: 39.9330,
  images: ['images/stores/linjia-kitchen-1.jpg','images/stores/linjia-kitchen-2.jpg','images/stores/linjia-kitchen-3.jpg','images/stores/linjia-kitchen-4.jpg'],
  address: '朝阳区惠新东街7号', mock_x: 82, mock_y: 50,
},

'展厅旁的简餐': {
  id: 'p-excafe', name: '展厅旁的简餐', short: '展厅旁的简餐', category: '简餐',
  rating: 4.2, review_count: 345, avg_price: 55,
  opening_hours: '09:00 - 18:00', current_status: '当前营业中', current_status_short: '营业中',
  status_tone: 'green', wait_time: '无需排队',
  tags: ['方便', '适合孩子', '近'], risk_tags: [],
  recommendation_reason: '就在展厅隔壁，看完展就能吃，不用折腾。',
  lng: 116.4720, lat: 39.9180,
  images: ['images/stores/exhibition-cafe-1.jpg','images/stores/exhibition-cafe-2.jpg','images/stores/exhibition-cafe-3.jpg','images/stores/exhibition-cafe-4.jpg'],
  address: '朝阳区光华路11号', mock_x: 68, mock_y: 42,
},

'隔壁便民食堂': {
  id: 'p-canteen', name: '隔壁便民食堂', short: '隔壁便民食堂', category: '简餐',
  rating: 4.2, review_count: 456, avg_price: 20,
  opening_hours: '07:00 - 20:00', current_status: '当前营业中', current_status_short: '营业中',
  status_tone: 'green', wait_time: '无需排队',
  tags: ['便宜', '快', '近'], risk_tags: [],
  recommendation_reason: '便宜实惠，吃完继续户外活动，不耽误时间。',
  lng: 116.4870, lat: 39.9370,
  images: ['images/stores/community-canteen-1.jpg','images/stores/community-canteen-2.jpg','images/stores/community-canteen-3.jpg','images/stores/community-canteen-4.jpg'],
  address: '朝阳区惠新西街3号院', mock_x: 88, mock_y: 48,
},

// ═══ 正餐 ═══
'渔小馆家常菜': {
  id: 'p-yuxiaoguan', name: '渔小馆家常菜', short: '渔小馆家常菜', category: '小馆',
  rating: 4.4, review_count: 1023, avg_price: 55,
  opening_hours: '11:00 - 21:30', current_status: '当前营业中', current_status_short: '营业中',
  status_tone: 'green', wait_time: '无需排队',
  tags: ['实惠', '家常口味', '不用等位', '安静'], risk_tags: [],
  recommendation_reason: '人均50出头，几乎不排队，邻里小馆的踏实感。',
  lng: 116.4550, lat: 39.9300,
  images: ['images/stores/yuxiaoguan-1.jpg','images/stores/yuxiaoguan-2.jpg','images/stores/yuxiaoguan-3.jpg','images/stores/yuxiaoguan-4.jpg'],
  address: '朝阳区团结湖北头条8号', mock_x: 48, mock_y: 68,
},

'巷里小馆 · 双人位': {
  id: 'p-xiangli', name: '巷里小馆 · 双人位', short: '巷里小馆 · 双人位', category: '私房菜',
  rating: 4.7, review_count: 1456, avg_price: 140,
  opening_hours: '11:30 - 22:00', current_status: '当前营业中', current_status_short: '营业中',
  status_tone: 'green', wait_time: '建议提前预约',
  tags: ['安静', '双人位', '私密', '出品好'], risk_tags: ['周末晚餐需提前预约'],
  recommendation_reason: '两人位提前订好，安静私密，出品稳当。',
  lng: 116.4300, lat: 39.9150,
  images: ['images/stores/xiangli-bistro-1.jpg','images/stores/xiangli-bistro-2.jpg','images/stores/xiangli-bistro-3.jpg','images/stores/xiangli-bistro-4.jpg'],
  address: '东城区朝阳门内大街23号', mock_x: 50, mock_y: 40,
},

'街角法餐 · 露台': {
  id: 'p-cornerfrench', name: '街角法餐 · 露台', short: '街角法餐 · 露台', category: '法餐',
  rating: 4.6, review_count: 987, avg_price: 200,
  opening_hours: '11:30 - 23:00', current_status: '当前营业中', current_status_short: '营业中',
  status_tone: 'green', wait_time: '露台座位有限',
  tags: ['露台', '出片好看', '约会', '氛围好'], risk_tags: ['露台座位有限'],
  recommendation_reason: '露台位的傍晚光线最好，配一杯红酒，约会氛围满分。',
  lng: 116.3250, lat: 39.9120,
  images: ['images/stores/corner-french-1.jpg','images/stores/corner-french-2.jpg','images/stores/corner-french-3.jpg','images/stores/corner-french-4.jpg'],
  address: '海淀区学院路15号', mock_x: 30, mock_y: 30,
},

// ═══ 酒吧 ═══
'蓝色屋顶酒吧': {
  id: 'p-blueroof', name: '蓝色屋顶酒吧', short: '蓝色屋顶酒吧', category: '酒吧',
  rating: 4.5, review_count: 1234, avg_price: 110,
  opening_hours: '18:00 - 02:00', current_status: '当前营业中', current_status_short: '营业中',
  status_tone: 'green', wait_time: '无需排队',
  tags: ['夜景', '露台', '鸡尾酒', '出片好看'], risk_tags: ['22:00后较吵'],
  recommendation_reason: '俯瞰城市夜景，一杯特调收尾，约会满分。',
  lng: 116.3300, lat: 39.9080,
  images: ['images/stores/blue-rooftop-bar-1.jpg','images/stores/blue-rooftop-bar-2.jpg','images/stores/blue-rooftop-bar-3.jpg','images/stores/blue-rooftop-bar-4.jpg'],
  address: '海淀区五道口地铁站旁', mock_x: 75, mock_y: 25,
},

'居酒屋·味屋': {
  id: 'p-miya', name: '居酒屋 · 味屋', short: '居酒屋·味屋', category: '居酒屋',
  rating: 4.5, review_count: 876, avg_price: 95,
  opening_hours: '17:30 - 23:30', current_status: '当前营业中', current_status_short: '营业中',
  status_tone: 'amber', wait_time: '19:30后排队较久',
  tags: ['安静', '日式', '适合一人', '有吧台位'], risk_tags: ['晚19:30后排队较久'],
  recommendation_reason: '能吃一点喝一口，安静不吵，适合放松神经。',
  lng: 116.4450, lat: 39.9200,
  images: ['images/stores/izakaya-miya-1.jpg','images/stores/izakaya-miya-2.jpg','images/stores/izakaya-miya-3.jpg','images/stores/izakaya-miya-4.jpg'],
  address: '东城区东直门内大街55号', mock_x: 62, mock_y: 72,
},

// ═══ 观景 ═══
'城市观景平台': {
  id: 'p-cityview', name: '城市观景平台', short: '城市观景平台', category: '观景',
  rating: 4.6, review_count: 2345, avg_price: 60,
  opening_hours: '10:00 - 21:30', current_status: '当前开放中', current_status_short: '开放中',
  status_tone: 'green', wait_time: '无需排队',
  tags: ['夜景', '俯瞰城市', '出片好看', '约会'], risk_tags: [],
  recommendation_reason: '市中心高楼观景，傍晚上去看日落，接着看夜景。',
  lng: 116.4600, lat: 39.9080,
  images: ['images/stores/city-view-terrace-1.jpg','images/stores/city-view-terrace-2.jpg','images/stores/city-view-terrace-3.jpg','images/stores/city-view-terrace-4.jpg'],
  address: '朝阳区建国门外大街1号', mock_x: 58, mock_y: 35,
},

// ═══ 书店 / 阅读 ═══
'小院图书馆': {
  id: 'p-xiaoyuan', name: '小院图书馆', short: '小院图书馆', category: '书店',
  rating: 4.6, review_count: 765, avg_price: 25,
  opening_hours: '10:00 - 20:00', current_status: '当前开放中', current_status_short: '开放中',
  status_tone: 'green', wait_time: '无需排队',
  tags: ['安静', '有院子', '可久坐', '文艺'], risk_tags: ['周末人略多'],
  recommendation_reason: '藏在胡同里，有院子和猫，可以坐一下午。',
  lng: 116.4050, lat: 39.9380,
  images: ['images/stores/xiaoyuan-library-1.jpg','images/stores/xiaoyuan-library-2.jpg','images/stores/xiaoyuan-library-3.jpg','images/stores/xiaoyuan-library-4.jpg'],
  address: '东城区北锣鼓巷61号', mock_x: 20, mock_y: 42,
},

'迷你绘本角': {
  id: 'p-minibook', name: '迷你绘本角', short: '迷你绘本角', category: '书店',
  rating: 4.5, review_count: 432, avg_price: 30,
  opening_hours: '09:30 - 19:00', current_status: '当前开放中', current_status_short: '开放中',
  status_tone: 'green', wait_time: '无需排队',
  tags: ['亲子友好', '有绘本', '安静', '有儿童区'], risk_tags: [],
  recommendation_reason: '有几百本绘本，孩子能安静翻半小时，家长也能歇口气。',
  lng: 116.4750, lat: 39.9300,
  images: ['images/stores/mini-book-corner-1.jpg','images/stores/mini-book-corner-2.jpg','images/stores/mini-book-corner-3.jpg','images/stores/mini-book-corner-4.jpg'],
  address: '朝阳区光华路甲8号', mock_x: 72, mock_y: 48,
},

// ═══ 游乐 ═══
'亲子室内乐园': {
  id: 'p-kids', name: '亲子室内乐园', short: '亲子室内乐园', category: '游乐',
  rating: 4.5, review_count: 2103, avg_price: 90,
  opening_hours: '09:30 - 20:00', current_status: '当前营业中', current_status_short: '营业中',
  status_tone: 'green', wait_time: '无需排队',
  tags: ['室内', '安全', '有波波池', '亲子友好'], risk_tags: ['3岁以下需家长全程陪同'],
  recommendation_reason: '波波池+攀爬架+沙池，孩子能玩2小时，旁边有家长休息区。',
  lng: 116.4780, lat: 39.9320,
  images: ['images/stores/kids-indoor-park-1.jpg','images/stores/kids-indoor-park-2.jpg','images/stores/kids-indoor-park-3.jpg','images/stores/kids-indoor-park-4.jpg'],
  address: '朝阳区惠新东街18号', mock_x: 78, mock_y: 55,
},

// ═══ 公共空间 ═══
'社区图书馆门厅': {
  id: 'p-librarylobby', name: '社区图书馆门厅', short: '社区图书馆门厅', category: '公共空间',
  rating: 4.3, review_count: 234, avg_price: 0,
  opening_hours: '09:00 - 21:00', current_status: '当前开放中', current_status_short: '开放中',
  status_tone: 'green', wait_time: '无需排队',
  tags: ['免费', '安静', '有座'], risk_tags: [],
  recommendation_reason: '绝对安静，适合等人、讲重要的事，免费有座。',
  lng: 116.4150, lat: 39.9100,
  images: ['images/stores/library-lobby-1.jpg','images/stores/library-lobby-2.jpg','images/stores/library-lobby-3.jpg','images/stores/library-lobby-4.jpg'],
  address: '东城区东四南大街15号', mock_x: 45, mock_y: 65,
},

'便利店休息区': {
  id: 'p-convenience', name: '便利店休息区', short: '便利店休息区', category: '便利店',
  rating: 4.1, review_count: 567, avg_price: 12,
  opening_hours: '24小时', current_status: '当前营业中', current_status_short: '营业中',
  status_tone: 'green', wait_time: '无需排队',
  tags: ['24小时', '有座', '近'], risk_tags: [],
  recommendation_reason: '几乎不用走路，有座位，顺手买水或小吃。',
  lng: 116.4080, lat: 39.9070,
  images: ['images/stores/convenience-rest-1.jpg','images/stores/convenience-rest-2.jpg','images/stores/convenience-rest-3.jpg','images/stores/convenience-rest-4.jpg'],
  address: '东城区东直门外大街8号', mock_x: 48, mock_y: 55,
},

}; // end ALL_PLACES


// ─── 按场景对应的完整地点列表（key = ROUTE_OPTIONS 中的 short 名）───
const ROUTE_PLACES = {
  '朋友聚会': {
    'r-fr-a': ['城东微展厅','山野炭火烤肉','慢岛甜品咖啡'],
    'r-fr-b': ['城东微展厅','798 街区漫步','蘑屋拍照面馆','慢岛甜品咖啡'],
    'r-fr-c': ['团结湖公园','渔小馆家常菜','隔壁书店咖啡角'],
  },
  '情侣约会': {
    'r-cp-a': ['巷里小馆 · 双人位','城市观景平台','雨夜咖啡 · 窗边位'],
    'r-cp-b': ['城西胶片小展','街角法餐 · 露台','蓝色屋顶酒吧'],
    'r-cp-c': ['园林公园','街口面馆','河边书店咖啡'],
  },
  '一个人放松': {
    'r-so-a': ['独椅咖啡','小院图书馆'],
    'r-so-b': ['运河步道','街角面包店'],
  },
  '亲子遛娃': {
    'r-pt-a': ['亲子室内乐园','邻家厨房','迷你绘本角'],
    'r-pt-b': ['城市互动展','展厅旁的简餐'],
    'r-pt-c': ['社区公园','隔壁便民食堂'],
  },
  '下班回血': {
    'r-aw-a': ['老张牛肉面'],
    'r-aw-b': ['居酒屋·味屋'],
  },
  '临时救场': {
    'r-em-a': ['街角连锁咖啡'],
    'r-em-b': ['社区图书馆门厅'],
    'r-em-c': ['便利店休息区'],
  },
};


// ─── 根据 route 对象获取对应地点列表 ─────────────────────────────
function getPlacesForRoute(route) {
  if (!route) return Object.values(ALL_PLACES).slice(0, 3); // fallback

  // Priority 1: route 有 pois 数组 → 查 ALL_PLACES
  if (route.pois && route.pois.length > 0) {
    var found = [];
    for (var i = 0; i < route.pois.length; i++) {
      var poiShort = route.pois[i].short;
      var place = ALL_PLACES[poiShort];
      if (place) {
        found.push(place);
      } else {
        // 尝试模糊匹配
        var keys = Object.keys(ALL_PLACES);
        for (var k = 0; k < keys.length; k++) {
          if (keys[k].indexOf(poiShort) !== -1 || (poiShort && poiShort.indexOf(keys[k]) !== -1)) {
            found.push(ALL_PLACES[keys[k]]);
            break;
          }
        }
      }
    }
    if (found.length > 0) return found;
  }

  // Priority 2: route 有 scene 和 id → 查 ROUTE_PLACES
  if (route._scene && route.id) {
    var sceneMap = ROUTE_PLACES[route._scene];
    if (sceneMap && sceneMap[route.id]) {
      var names = sceneMap[route.id];
      return names.map(function(n) { return ALL_PLACES[n]; }).filter(Boolean);
    }
  }

  // Priority 3: fallback to first 3
  return Object.values(ALL_PLACES).slice(0, 3);
}


// ─── 导出到 window ───────────────────────────────────────────────
Object.assign(window, {
  ALL_PLACES: ALL_PLACES,
  ROUTE_PLACES: ROUTE_PLACES,
  getPlacesForRoute: getPlacesForRoute,
  // 向后兼容
  MOCK_PLACES: Object.values(ALL_PLACES).slice(0, 3),
  MOCK_ROUTE: window.MOCK_ROUTE || {}, // 保留原有
  MOCK_TRANSPORT: window.MOCK_TRANSPORT || [],
});
