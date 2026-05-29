/**
 * Mock POI 数据汇总入口
 * 北京 200 个 + 上海 200 个 = 400 个 POI
 * 
 * 将新版数据格式适配为旧版 ALL_PLACES 对象格式，
 * 同时提供 getPlacesForRoute 函数供 route-detail.jsx 调用。
 */

(function() {
  var allData = (window.beijingPOIs || []).concat(window.shanghaiPOIs || []);

  // ─── 构建 ALL_PLACES 字典（key = POI名称）───
  var places = {};
  allData.forEach(function(p) {
    var name = p.name;
    // 如果同名已存在，加后缀避免覆盖
    while (places[name]) {
      name = p.name + ' (' + p.district + ')';
    }

    // Derive all 4 images from the -1.jpg pattern (files exist on disk)
    var rawImageUrl = (p.images && p.images[0]) || '';
    var images = [];
    if (rawImageUrl) {
      var m = rawImageUrl.match(/^(.+)-1\.(jpg|png|webp)$/i);
      if (m) {
        for (var ni = 1; ni <= 4; ni++) {
          images.push(m[1] + '-' + ni + '.' + m[2]);
        }
      } else {
        images = [rawImageUrl];
      }
    }

    places[name] = {
      id: p.id,
      name: p.name,
      short: p.name,
      category: (p.subcategory || p.category || ''),
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
      risk_tags: [],
      recommendation_reason: p.description || '',
      review_summary: (p.tags || []).join('、'),
      lng: p.lng,
      lat: p.lat,
      imageUrl: rawImageUrl,
      images: images,
      address: p.address || '',
      city: p.city || '',
      district: p.district || '',
      targetAudience: p.targetAudience || [],
      bestTime: p.bestTime || '',
      duration: p.duration || '',
      // 计算 mock 坐标（归一化 lng/lat 到模拟画布）
      mock_x: Math.round(((p.lng - 115.5) / (122 - 115.5)) * 100),
      mock_y: Math.round(((41 - p.lat) / (41 - 30.5)) * 100),
    };
  });

  window.ALL_PLACES = places;

  // ─── getPlacesForRoute：根据路线的 pois[{short}] 检索完整 POI 数据 ───
  window.getPlacesForRoute = function(route) {
    if (!route || !route.pois || !route.pois.length) return null;

    var result = [];
    for (var i = 0; i < route.pois.length; i++) {
      var short = route.pois[i].short;
      var found = null;

      // 先按 name 精确匹配
      for (var key in places) {
        var p = places[key];
        if (p.short === short && !found) {
          found = p;
        }
      }
      // 再按 short 前缀模糊匹配
      if (!found) {
        for (var k in places) {
          if (places[k].short.indexOf(short) === 0 || short.indexOf(places[k].short) === 0) {
            found = places[k];
            break;
          }
        }
      }

      if (!found) {
        // 新数据里找不到 → 回退到 MOCK_PLACES
        return null;
      }

      var poi = Object.assign({}, found);
      poi.distance = (i === 0) ? '距出发地' : '距上一站';
      result.push(poi);
    }
    return result;
  };

  // ─── 覆盖 MOCK_PLACES：用新数据替换旧硬编码数据 ───
  // 精选 6 个代表性 POI 展示（3 北京 + 3 上海，不同品类）
  var showcaseKeys = [
    '故宫博物院', '南锣鼓巷', '大董烤鸭店(王府井店)',
    '外滩', '田子坊', '南翔馒头店(豫园店)'
  ];
  var newMockPlaces = [];
  for (var ki = 0; ki < showcaseKeys.length; ki++) {
    var key = showcaseKeys[ki];
    if (places[key]) {
      var p = places[key];
      newMockPlaces.push(Object.assign({}, p, {
        distance: newMockPlaces.length === 0 ? '距出发地' : '距上一站 ' + (300 + ki * 400) + 'm',
        current_status: p.opening_hours.indexOf('全') >= 0 ? '全天开放' : ('营业中 · ' + p.opening_hours),
        wait_time: p.avg_price > 150 ? '约15分钟' : '无需排队',
      }));
    }
  }
  // 如果上面有些 POI 没找到，用前几个补足 6 个
  if (newMockPlaces.length < 6) {
    var allValues = Object.values(places);
    for (var vi = 0; vi < allValues.length && newMockPlaces.length < 6; vi++) {
      var exist = newMockPlaces.some(function(x) { return x.id === allValues[vi].id; });
      if (!exist) {
        newMockPlaces.push(Object.assign({}, allValues[vi], {
          distance: '距上一站 500m',
          current_status: '营业中',
          wait_time: '无需排队',
        }));
      }
    }
  }
  window.MOCK_PLACES = newMockPlaces;

  console.log('[Mock数据] 已加载 ' + Object.keys(places).length + ' 个POI，覆盖 MOCK_PLACES: ' + newMockPlaces.length + ' 个');

})();
