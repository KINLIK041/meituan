/**
 * Mock POI 数据汇总入口
 * 北京 200 个 + 上海 200 个 = 400 个 POI
 *
 * 将新版数据格式适配为旧版 ALL_PLACES 对象格式，
 * 同时提供 getPlacesForRoute / buildRoutesForScene 供前端调用。
 */

(function() {
  var allData = (window.beijingPOIs || []).concat(window.shanghaiPOIs || []);

  // ─── 数据格式适配 ───
  function adaptPOI(p) {
    return {
      id: p.id,
      name: p.name,
      short: p.name,
      category: p.subcategory || p.category || '',
      subcategory: p.subcategory || '',
      rating: p.rating || 0,
      review_count: p.reviewCount || 0,
      avg_price: p.price || 0,
      opening_hours: p.openTime || '',
      current_status: '营业中',
      current_status_short: '营业中',
      status_tone: 'green',
      wait_time: '无需排队',
      tags: p.tags || [],
      ugcTags: p.ugcTags || [],
      ugcSummary: p.ugcSummary || '',
      risk_tags: p.riskTags || [],
      recommendation_reason: p.description || '',
      review_summary: p.ugcSummary || (p.tags || []).join('、'),
      lng: p.lng,
      lat: p.lat,
      imageUrl: (p.images && p.images[0]) || '',
      images: p.images || [],
      address: p.address || '',
      city: p.city || '',
      district: p.district || '',
      targetAudience: p.targetAudience || [],
      bestTime: p.bestTime || '',
      duration: p.duration || '',
      mock_x: Math.round(((p.lng - 115.5) / (122 - 115.5)) * 100),
      mock_y: Math.round(((41 - p.lat) / (41 - 30.5)) * 100),
    };
  }

  // ─── 按城市构建字典 ───
  var places = {};
  var beijingPlaces = {};
  var shanghaiPlaces = {};

  allData.forEach(function(p) {
    var name = p.name;
    while (places[name]) {
      name = p.name + ' (' + p.district + ')';
    }
    var adapted = adaptPOI(p);
    places[name] = adapted;
    if (p.city === '北京') beijingPlaces[name] = adapted;
    if (p.city === '上海') shanghaiPlaces[name] = adapted;
  });

  window.ALL_PLACES = places;
  window.ALL_PLACES_BEIJING = beijingPlaces;
  window.ALL_PLACES_SHANGHAI = shanghaiPlaces;

  window.getPlacesByCity = function(city) {
    if (city === '上海') return window.ALL_PLACES_SHANGHAI;
    return window.ALL_PLACES_BEIJING;
  };

  // ─── Category keyword map for fuzzy matching ───
  var CAT_MAP = {
    '居酒屋': ['居酒屋', '酒吧', '日料', '日本料理', '烧鸟', '深夜'],
    '酒吧': ['酒吧', '居酒屋', '精酿', '夜生活'],
    '面食': ['面食', '面', '小馆', '简餐', '快餐', '小吃'],
    '小馆': ['小馆', '面食', '简餐', '家常菜', '快餐'],
    '咖啡': ['咖啡', '书店', '甜品', '面包'],
    '甜品': ['甜品', '咖啡', '面包', '蛋糕'],
    '展览': ['展览', '美术馆', '博物馆', '艺术区', '画廊'],
    '烤肉': ['烤肉', '烧烤', '火锅', '涮肉'],
    '火锅': ['火锅', '烤肉', '涮肉', '烧烤'],
    '公园': ['公园', '景点', '园林', '园林'],
    '书店': ['书店', '咖啡', '图书馆', '阅读'],
    '简餐': ['简餐', '小馆', '面食', '快餐', '家常菜'],
    '公共空间': ['图书馆', '公共空间', '书店', '休息'],
    '便利店': ['便利', '超市'],
    '景点': ['景点', '公园', '博物馆', '古迹'],
    '法餐': ['法餐', '西餐', '精致', '约会'],
    '西餐': ['西餐', '法餐', '汉堡', '意式'],
    '日料': ['日料', '日本料理', '寿司', '烧鸟', '居酒屋'],
    '北京菜': ['北京菜', '烤鸭', '老字号'],
    '烤鸭': ['烤鸭', '北京菜'],
    '游乐': ['游乐', '乐园', '亲子'],
    '散步': ['公园', '步道', '散步'],
    '观景': ['观景', '地标', '高楼'],
  };

  // ─── getPlacesForRoute：支持精确/前缀/category 三级匹配 ───
  window.getPlacesForRoute = function(route, city) {
    if (!route || !route.pois || !route.pois.length) return null;
    var effectiveCity = city || window._currentCity || '北京';
    var dict = window.getPlacesByCity(effectiveCity);
    var result = [];

    for (var i = 0; i < route.pois.length; i++) {
      var short = route.pois[i].short;
      var targetCat = route.pois[i].category || '';
      var found = null;

      // 1. 精确名称匹配
      for (var key in dict) {
        if (dict[key].short === short || dict[key].name === short) {
          found = dict[key];
          break;
        }
      }

      // 2. 前缀模糊匹配
      if (!found) {
        for (var k in dict) {
          if (dict[k].short.indexOf(short) === 0 || short.indexOf(dict[k].short) === 0) {
            found = dict[k];
            break;
          }
        }
      }

      // 3. Category 关键词匹配
      if (!found && targetCat) {
        var keywords = CAT_MAP[targetCat] || [targetCat];
        for (var k2 in dict) {
          var pc = (dict[k2].category || '') + ' ' + (dict[k2].subcategory || '');
          for (var ki = 0; ki < keywords.length; ki++) {
            if (pc.indexOf(keywords[ki]) !== -1) {
              found = dict[k2];
              break;
            }
          }
          if (found) break;
        }
      }

      if (!found) return null;

      var poi = Object.assign({}, found);
      poi.distance = (i === 0) ? '距出发地' : '距上一站';
      result.push(poi);
    }
    return result;
  };

  // ─── buildRoutesForScene：按场景+城市动态从 ALL_PLACES 构建路线 ───
  window.buildRoutesForScene = function(scene, answers, city) {
    city = city || window._currentCity || '北京';
    var dict = window.getPlacesByCity(city);
    var allValues = Object.values(dict);
    if (allValues.length === 0) return [];

    // 按场景+心情定义 category 筛选器
    var configs = [];

    switch (scene) {
      case '朋友聚会':
        configs = [
          { cats: ['展览', '美术馆', '艺术区'], name: '朋友轻聚会路线', reason: '兼顾预算、距离和体验', risks: [] },
          { cats: ['烤肉', '火锅', '烧烤'], name: '出片版聚会路线', reason: '强调出片，适合拍照', risks: ['路线偏长'] },
          { cats: ['甜品', '咖啡', '书店'], name: '松弛版聚会路线', reason: '预算友好，几乎不用排队', risks: [] },
        ];
        break;
      case '情侣约会':
        configs = [
          { cats: ['展览', '美术馆', '公园'], name: '安静约会路线', reason: '气氛、距离、预算都稳', risks: ['周末晚餐需预约'] },
          { cats: ['法餐', '西餐', '日料'], name: '出片版约会路线', reason: '画面感强，三段都好拍', risks: ['露台座位有限'] },
          { cats: ['咖啡', '酒吧', '书店'], name: '随性约会路线', reason: '不赶场，慢节奏陪伴', risks: [] },
        ];
        break;
      case '一个人放松':
        configs = [
          { cats: ['咖啡', '书店'], name: '一个人发呆路线', reason: '两个都不催台', risks: ['周末人略多'] },
          { cats: ['公园', '步道', '面包'], name: '微散步路线', reason: '想动一动但不想很累', risks: [] },
        ];
        break;
      case '亲子遛娃':
        configs = [
          { cats: ['游乐', '乐园', '亲子'], name: '家门口亲子路线', reason: '不用赶路', risks: ['需家长陪同'] },
          { cats: ['展览', '博物馆', '互动'], name: '互动展览路线', reason: '互动展能让孩子专注', risks: ['需提前预约'] },
          { cats: ['公园', '景点'], name: '公园+简餐路线', reason: '便宜、放电、就近吃饭', risks: ['雨天不建议'] },
        ];
        break;
      case '下班回血':
        var mood = answers && answers.mood;
        if (mood === '喝一口酒') {
          configs = [
            { cats: ['酒吧', '居酒屋', '精酿'], name: '小酌一杯版', reason: '能吃一点、能喝一口，安静不吵', risks: ['晚高峰后排队较久'] },
          ];
        } else if (mood === '热汤面食') {
          configs = [
            { cats: ['面食', '小馆', '简餐'], name: '热汤面版', reason: '一碗热面，快进快出', risks: [] },
          ];
        } else if (mood === '清淡轻食') {
          configs = [
            { cats: ['轻食', '沙拉', '咖啡'], name: '轻食版', reason: '清淡无负担', risks: [] },
          ];
        } else {
          configs = [
            { cats: ['面食', '小馆', '简餐'], name: '快进快出晚饭', reason: '不用等位，快进快出', risks: [] },
            { cats: ['咖啡', '甜品'], name: '轻食版', reason: '清淡轻食，无负担', risks: [] },
          ];
        }
        break;
      case '临时救场':
        configs = [
          { cats: ['咖啡', '便利'], name: '街角咖啡见面', reason: '走3分钟到，几乎一定有座', risks: ['晚间座位紧张'] },
          { cats: ['图书馆', '公共空间', '书店'], name: '社区图书馆门厅', reason: '绝对安静，免费有座', risks: [] },
        ];
        break;
      default:
        configs = [{ cats: ['展览', '餐厅', '咖啡'], name: '推荐路线', reason: '综合推荐', risks: [] }];
    }

    var routes = [];
    var tones = ['orange', 'pink', 'green'];

    for (var ri = 0; ri < configs.length; ri++) {
      var cfg = configs[ri];
      var matched = [];

      for (var fi = 0; fi < cfg.cats.length; fi++) {
        var cat = cfg.cats[fi];
        for (var vi = 0; vi < allValues.length; vi++) {
          var p = allValues[vi];
          var pc = (p.category || '') + ' ' + (p.subcategory || '');
          if (pc.indexOf(cat) !== -1) {
            var exist = matched.some(function(m) { return m.id === p.id; });
            if (!exist) {
              matched.push(p);
              break;
            }
          }
        }
      }

      if (matched.length === 0) continue;

      var totalAvg = Math.round(matched.reduce(function(s, p) { return s + p.avg_price; }, 0));
      var totalTime = matched.length <= 1 ? '1 小时' : matched.length <= 2 ? '2-3 小时' : '3-4 小时';
      var totalDist = matched.length <= 1 ? '0.3km' : matched.length <= 2 ? '0.8km' : '1.5km';

      routes.push({
        id: 'r-' + scene + '-' + ri,
        positioning: ri === 0 ? '综合最优' : ri === 1 ? '体验更强' : '更稳妥',
        tone: tones[ri] || 'green',
        route_name: cfg.name,
        total_time: totalTime,
        total_avg: totalAvg,
        total_distance: totalDist,
        transport: '地铁 · 步行',
        pois: matched.map(function(p) { return { short: p.short, category: p.category }; }),
        reason: cfg.reason,
        risks: cfg.risks,
        _scene: scene,
        _city: city,
      });
    }

    return routes;
  };

  // ─── 按城市刷新 MOCK_PLACES ───
  window.refreshMockPlaces = function(city) {
    city = city || window._currentCity || '北京';
    var dict = window.getPlacesByCity(city);
    var values = Object.values(dict);
    if (values.length === 0) values = Object.values(window.ALL_PLACES);

    var showcase = city === '上海'
      ? ['外滩', '田子坊', '南翔馒头店(豫园店)', '上海迪士尼乐园', '东方明珠广播电视塔', '新天地']
      : ['故宫博物院', '南锣鼓巷', '大董烤鸭店(王府井店)', '天坛公园', '北京798艺术区', '京A Taproom(隆福寺店)'];

    var newMockPlaces = [];
    for (var ki = 0; ki < showcase.length; ki++) {
      var key = showcase[ki];
      if (dict[key]) {
        var p = dict[key];
        newMockPlaces.push(Object.assign({}, p, {
          distance: newMockPlaces.length === 0 ? '距出发地' : '距上一站 ' + (300 + ki * 400) + 'm',
          current_status: (p.opening_hours || '').indexOf('全') >= 0 ? '全天开放' : ('营业中 · ' + p.opening_hours),
          wait_time: p.avg_price > 150 ? '约15分钟' : '无需排队',
        }));
      }
    }
    if (newMockPlaces.length < 3) {
      for (var vi = 0; vi < values.length && newMockPlaces.length < 6; vi++) {
        var exist = newMockPlaces.some(function(x) { return x.id === values[vi].id; });
        if (!exist) {
          newMockPlaces.push(Object.assign({}, values[vi], {
            distance: '距上一站 500m',
            current_status: '营业中',
            wait_time: '无需排队',
          }));
        }
      }
    }
    window.MOCK_PLACES = newMockPlaces;
    return newMockPlaces;
  };

  // Initial load
  window.refreshMockPlaces(window._currentCity);

  // ─── Backend POI sync — replaces mock data with backend POIs when available ───
  window.syncPOIsFromBackend = async function(city) {
    city = city || window._currentCity || '北京';
    if (!window.fetchPOIsFromBackend) return null;
    try {
      var backendPOIs = await window.fetchPOIsFromBackend(city);
      if (!backendPOIs || backendPOIs.length < 5) return null;
      // Build dictionary from backend POIs
      var dict = {};
      backendPOIs.forEach(function(p) {
        var key = p.name;
        while (dict[key]) key = p.name + ' (' + p.district + ')';
        dict[key] = p;
      });
      // Replace city-specific dictionary while keeping fallback
      if (city === '上海') {
        window.ALL_PLACES_SHANGHAI = dict;
      } else {
        window.ALL_PLACES_BEIJING = dict;
      }
      // Also merge into ALL_PLACES global dict
      Object.assign(window.ALL_PLACES, dict);
      window.refreshMockPlaces(city);
      console.log('[syncPOIs] Loaded ' + backendPOIs.length + ' POIs from backend for ' + city);
      return backendPOIs.length;
    } catch (e) {
      console.warn('[syncPOIs] Backend unavailable, using mock data:', e.message);
      return null;
    }
  };

  // Try backend sync on load (non-blocking — mock data shown immediately)
  setTimeout(function() { window.syncPOIsFromBackend(window._currentCity); }, 200);

  // Listen for city changes
  var _origCitySetter = Object.getOwnPropertyDescriptor(window, '_currentCity');
  var _currentCityValue = window._currentCity;
  Object.defineProperty(window, '_currentCity', {
    get: function() { return _currentCityValue; },
    set: function(v) {
      _currentCityValue = v;
      window.refreshMockPlaces(v);
    },
    configurable: true,
  });

  console.log('[Mock数据] 已加载 ' + Object.keys(places).length + ' 个POI（北京' + Object.keys(beijingPlaces).length + ' + 上海' + Object.keys(shanghaiPlaces).length + '）');
})();
