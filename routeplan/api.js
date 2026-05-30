// API client for the AI Route Planner backend.
// Wraps POST /api/route/plan, POST /api/route/adjust, GET /api/route/compare/{sessionId}.
// Transforms backend Route/POI models into the frontend's route-option card format.
// Falls back to mock data (ROUTE_OPTIONS) when the backend is unreachable.

const API_BASE = (function() {
  var host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host === '') {
    return 'http://localhost:8080';
  }
  // Production: assume backend on same origin
  var proto = window.location.protocol;
  var port = window.location.port;
  return proto + '//' + host + (port ? ':' + port : '');
})();

// ─── Fetch with timeout ───────────────────────────────────────────

/** Wraps fetch with an AbortController timeout (default 15s). Adds auth header. */
function fetchWithTimeout(url, options, timeoutMs) {
  var controller = new AbortController();
  var ms = timeoutMs || 15000;
  var timer = setTimeout(function() { controller.abort(); }, ms);
  var opts = Object.assign({}, options, { signal: controller.signal });
  // Add auth token if available
  var token = null;
  try { token = localStorage.getItem('_authToken'); } catch(e) {}
  if (token) {
    opts.headers = Object.assign({}, opts.headers || {}, { 'Authorization': 'Bearer ' + token });
  }
  return fetch(url, opts)
    .finally(function() { clearTimeout(timer); });
}

// ─── Session tracking ─────────────────────────────────────────────
let _sessionId = null;
let _currentUserId = null;

function getSessionId() { return _sessionId; }
function setSessionId(id) { _sessionId = id; }
function getCurrentUserId() { return _currentUserId; }
function setCurrentUserId(id) { _currentUserId = id; }

// ─── User profiles ────────────────────────────────────────────────

async function getUserProfiles() {
  try {
    var res = await fetchWithTimeout(API_BASE + '/api/route/profiles');
    if (!res.ok) throw new Error('Profiles fetch failed');
    return await res.json();
  } catch (e) {
    // Fallback: hardcoded 3 mock users
    return [
      { userId: 'user_001', name: '小林', profileName: '约会偏好型', preferredCity: '上海', avgBudget: 200, favoriteCategories: ['日料','咖啡','展览','西餐'], preferenceTags: { '安静': 0.90, '少排队': 0.85 }, avoidTags: {}, historyActions: [] },
      { userId: 'user_002', name: '阿航', profileName: '效率通勤型', preferredCity: '北京', avgBudget: 120, favoriteCategories: ['快餐','商场','咖啡','简餐'], preferenceTags: { '少走路': 0.92, '近地铁': 0.88 }, avoidTags: {}, historyActions: [] },
      { userId: 'user_003', name: 'Mia',   profileName: '探店内容型', preferredCity: '上海', avgBudget: 300, favoriteCategories: ['网红餐厅','甜品','买手店','咖啡'], preferenceTags: { '出片': 0.95, '新店': 0.88 }, avoidTags: {}, historyActions: [] },
    ];
  }
}

// ─── Tone helpers ─────────────────────────────────────────────────
const GOAL_TONE = {
  BEST_EXPERIENCE: { positioning: '综合最优', tone: 'orange' },
  FASTEST:         { positioning: '最省时',   tone: 'orange' },
  CHEAPEST:        { positioning: '更低预算', tone: 'green' },
};

function toneForGoal(goal) {
  return GOAL_TONE[goal] || { positioning: '综合最优', tone: 'orange' };
}

// ─── Formatting helpers ───────────────────────────────────────────
function fmtDuration(minutes) {
  if (minutes < 60) return Math.round(minutes) + ' 分钟';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? h + ' 小时 ' + m + ' 分钟' : h + ' 小时';
}

function fmtDistance(meters) {
  if (meters == null || meters === 0) return null;
  if (meters < 1000) return Math.round(meters) + 'm';
  return (meters / 1000).toFixed(1) + 'km';
}

// ─── Backend → Frontend mapping ───────────────────────────────────

/** Convert a backend Route into a frontend route-option card. */
function mapRoute(route) {
  const tone = toneForGoal(route.optimizationGoal);
  const poiList = (route.segments || []).map((seg) => ({
    short: seg.poi ? seg.poi.name : '未知地点',
    category: seg.poi ? (seg.poi.subCategory || seg.poi.category || '') : '',
  }));

  // Build transport summary from segments
  const modes = [...new Set((route.segments || []).map((s) => s.travelMode).filter(Boolean))];
  const transportLabel = modes.length === 0 ? '步行可达'
    : modes.includes('DRIVING') && modes.includes('WALKING') ? '驾车 + 步行'
    : modes.includes('DRIVING') ? '驾车'
    : '步行可达';

  // Risks from violated soft constraints
  const risks = (route.violatedSoftConstraints || []).map((c) => c.description || c.name || '').filter(Boolean);

  return {
    id: route.id || ('r-' + Math.random().toString(36).slice(2, 8)),
    positioning: tone.positioning,
    tone: tone.tone,
    route_name: route.name || '推荐路线',
    total_time: fmtDuration(route.totalTravelTime || 0),
    total_avg: Math.round(route.totalCost || 0),
    total_distance: fmtDistance(
      (route.segments || []).reduce((sum, s) => sum + (s.travelTimeFromPrevious || 0) * 80, 0)
    ) || '步行可达',
    transport: transportLabel,
    pois: poiList,
    reason: route.description || '',
    risks: risks,
    _raw: route, // keep original for detail page
  };
}

/** Map a PlanResponse to the array the frontend RouteOptionsCard expects. */
function mapPlanResponse(data) {
  const routes = (data.routes || []).map(mapRoute);
  var tones = ['orange', 'pink', 'green'];
  var posLabels = _currentUserId
    ? ['综合最优', '少走路', '偏好优先']
    : ['综合最优', '更出片', '更稳妥'];
  routes.forEach((r, i) => {
    r.tone = tones[i] || 'green';
    r.positioning = posLabels[i] || '综合最优';
    if (data.preferenceMatchTags && data.preferenceMatchTags[r.id]) {
      r._preferenceMatchTags = data.preferenceMatchTags[r.id];
    }
  });
  return {
    sessionId: data.sessionId,
    routes: routes,
    warning: data.warning || null,
    recommendedRoute: data.recommendedRoute ? mapRoute(data.recommendedRoute) : null,
  };
}

// ─── API calls ────────────────────────────────────────────────────

/**
 * POST /api/route/smart-plan — Unified analyze + plan in one call.
 * Eliminates the extra HTTP round-trip between analyze and plan.
 * Returns { stage, summaryText, intent, routes (mapped), followupQuestions, conflicts, ... }
 * or null when the backend is unreachable.
 */
async function smartPlan(query, sessionId, city) {
  try {
    const body = { query: query, sessionId: sessionId || null, city: city || null, userId: _currentUserId || null };
    const res = await fetchWithTimeout(API_BASE + '/api/route/smart-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.sessionId) setSessionId(data.sessionId);

    // Map routes if present (complete/assumption stage)
    if (data.routes && data.routes.length > 0) {
      data._routes = data.routes.map(mapRoute);
      var tones = ['orange', 'pink', 'green'];
      var posLabels = _currentUserId
        ? ['综合最优', '少走路', '偏好优先']
        : ['综合最优', '体验更强', '更稳妥'];
      data._routes.forEach(function(r, i) {
        r.tone = tones[i] || 'green';
        r.positioning = posLabels[i] || '综合最优';
        // Attach preference match data from API response
        if (data.preferenceMatchTags && data.preferenceMatchTags[r.id]) {
          r._preferenceMatchTags = data.preferenceMatchTags[r.id];
        }
      });
    }

    // Normalize followupQuestions to frontend format
    if (data.followupQuestions && data.followupQuestions.length > 0) {
      data._questions = data.followupQuestions.map(function(q) {
        return { id: q.id, label: q.label, options: q.options || [] };
      });
    }
    // Normalize conflicts to frontend format
    if (data.conflicts && data.conflicts.length > 0) {
      data._conflicts = data.conflicts.map(function(c) {
        return { id: c.id, label: c.label, hint: c.hint || '' };
      });
    }
    return data;
  } catch (e) {
    console.warn('Smart-plan API unavailable:', e.message);
    return null;
  }
}

/**
 * POST /api/route/plan
 * @param {string} query - Natural language query
 * @param {string|null} sessionId
 * @returns {Promise<{sessionId, routes, warning, recommendedRoute}>}
 */
async function planRoute(query, sessionId, city, intent) {
  const body = { query: query, sessionId: sessionId || null, city: city || null, intent: intent || null, userId: _currentUserId || null };
  const res = await fetchWithTimeout(API_BASE + '/api/route/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('API error: ' + res.status);
  const data = await res.json();
  if (data.sessionId) setSessionId(data.sessionId);
  return mapPlanResponse(data);
}

/**
 * POST /api/route/adjust
 * @param {string} sessionId
 * @param {string} adjustment - e.g. "更便宜", "少走路"
 * @param {string} city - current selected city
 * @returns {Promise<{sessionId, routes, warning, recommendedRoute}>}
 */
async function adjustRoute(sessionId, adjustment, city) {
  const body = { sessionId: sessionId, adjustment: adjustment, city: city || null, userId: _currentUserId || null };
  const res = await fetchWithTimeout(API_BASE + '/api/route/adjust', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('API error: ' + res.status);
  const data = await res.json();
  return mapPlanResponse(data);
}

/**
 * POST /api/route/analyze — LLM-based intent analysis with completeness check.
 * Returns { stage, intent, missingFields, followupQuestions, conflicts, summaryText }
 * or null when the backend is unreachable (caller should fall back to analyzeNL).
 */
async function analyzeIntent(query, sessionId, city) {
  try {
    const body = { query: query, sessionId: sessionId || null, city: city || null };
    const res = await fetchWithTimeout(API_BASE + '/api/route/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = await res.json();
    // Normalize followupQuestions to frontend format
    if (data.followupQuestions && data.followupQuestions.length > 0) {
      data._questions = data.followupQuestions.map(function(q) {
        return { id: q.id, label: q.label, options: q.options || [] };
      });
    }
    // Normalize conflicts to frontend format
    if (data.conflicts && data.conflicts.length > 0) {
      data._conflicts = data.conflicts.map(function(c) {
        return { id: c.id, label: c.label, hint: c.hint || '' };
      });
    }
    return data;
  } catch (e) {
    console.warn('Intent analysis API unavailable:', e.message);
    return null;
  }
}

// ─── Query builder for scene + answers path ───────────────────────

/**
 * Build a natural-language query from a scene tap + completion answers.
 * This lets the scene-tap path use the same POST /api/route/plan endpoint.
 */
function buildQueryFromScene(scene, answers) {
  const parts = [];
  parts.push(scene || '出去玩');

  const timeMap = {
    '现在': '现在出发', '今天晚上': '今天晚上', '周末下午': '周末下午', '周末上午': '周末上午',
    '周末晚上': '周末晚上', '今天下午': '今天下午', '半小时后': '半小时后出发',
    '一小时后': '一小时后出发', '10 分钟内': '10分钟内到', '20 分钟内': '20分钟内到',
    '30 分钟内': '30分钟内到',
  };
  if (answers.time) {
    // Clock times like "18:00", "19:00" etc. are passed directly
    var t = answers.time;
    if (/^\d{1,2}:\d{2}$/.test(t)) {
      parts.push(t + '出发');
    } else {
      parts.push(timeMap[t] || t);
    }
  }

  const placeMap = {
    '当前位置附近': '当前位置附近', '当前位置': '当前位置', '公司附近': '公司附近',
    '回家路上': '回家路上', '地铁站附近': '地铁站附近', '商圈附近': '商圈附近',
  };
  if (answers.place) parts.push(placeMap[answers.place] || answers.place);

  if (answers.budget && answers.budget !== '不限' && answers.budget !== '不设上限' && answers.budget !== '看心情') {
    parts.push('预算' + answers.budget);
  }

  if (answers.duration && answers.duration !== '不限') {
    parts.push('时长' + answers.duration);
  }

  if (answers.mood) {
    const moodMap = {
      '吃饭聊天': '吃饭聊天', '吃饭 + 拍照': '吃饭加拍照', '吃饭 + 娱乐': '吃饭加娱乐',
      '轻松逛逛': '轻松逛逛', '安静聊天': '安静有氛围', '出片拍照': '拍照好看',
      '慢节奏散步': '散步', '看演出 / 看展': '看展', '只想发呆': '安静放松',
      '看书 / 写东西': '看书', '拍照 + 散步': '拍照散步', '吃点东西': '吃点什么',
      '室内乐园': '室内乐园', '互动展览': '互动展览', '户外公园': '户外公园',
      '美食 + 短玩': '美食加短玩', '热汤面食': '热汤面', '正经一顿': '正经吃一顿',
      '清淡轻食': '清淡的', '喝一口酒': '喝一杯', '见朋友聊事': '见朋友',
      '等人 / 杀时间': '等人', '简单吃一口': '简单吃点', '找个安静的角落': '安静的地方',
    };
    parts.push(moodMap[answers.mood] || answers.mood);
  }

  return parts.join('，');
}

// ─── API call with mock fallback ──────────────────────────────────

/**
 * Call planRoute with automatic fallback to mock ROUTE_OPTIONS data.
 * Used by both NL and scene-tap paths.
 */
async function planWithFallback(query, scene, answers, city, intent) {
  try {
    const result = await planRoute(query, null, city, intent || null);
    if (result.routes.length > 0) return result;
    console.warn('/plan returned empty routes, trying /smart-plan');
  } catch (e) {
    console.warn('/plan failed, trying /smart-plan:', e.message);
  }

  // Fallback: try /smart-plan with full analysis pipeline (backend mock data)
  try {
    const smartResult = await smartPlan(query, null, city);
    if (smartResult && smartResult._routes && smartResult._routes.length > 0) {
      return {
        sessionId: smartResult.sessionId || ('fb-' + Date.now()),
        routes: smartResult._routes,
        warning: null,
        recommendedRoute: smartResult._routes[0] || null,
      };
    }
  } catch (e2) {
    console.warn('/smart-plan also failed:', e2.message);
  }

  // All backend calls exhausted — return empty with user-facing warning
  return {
    sessionId: 'err-' + Date.now(),
    routes: [],
    warning: '服务暂时不可用，请检查网络后重试',
    recommendedRoute: null,
  };
}

/**
 * Call adjustRoute with automatic mock fallback.
 * When backend is unavailable, reorder/filter mock routes based on chip label
 * so the user sees a visible change instead of the same results.
 */
async function adjustWithFallback(sessionId, adjustment, currentRoutes, city, scene, answers) {
  try {
    const result = await adjustRoute(sessionId, adjustment, city);
    if (result.routes.length > 0) return result;
  } catch (e) {
    console.warn('Backend API unavailable for adjust:', e.message);
  }

  // All backend calls exhausted — return empty with warning
  return {
    sessionId: sessionId || ('err-' + Date.now()),
    routes: [],
    warning: '调整失败，请稍后重试',
    recommendedRoute: null,
  };
}

/** Reorder/filter routes based on chip label. */
function parseTime(timeStr) {
  if (!timeStr) return 999;
  var hMatch = timeStr.match(/(\d+)\s*小时/);
  var mMatch = timeStr.match(/(\d+)\s*分钟/);
  var h = hMatch ? parseInt(hMatch[1], 10) : 0;
  var m = mMatch ? parseInt(mMatch[1], 10) : 0;
  return h * 60 + m;
}

function mockAdjustRoutes(routes, label) {
  var arr = routes.slice();
  if (arr.length <= 1) return arr;

  switch (label) {
    case '更便宜':
      // Sort by total_avg ascending
      arr.sort(function(a, b) { return (a.total_avg || 0) - (b.total_avg || 0); });
      break;
    case '少走路':
      // Sort by total_distance — parse numeric value from "1.6km" format
      arr.sort(function(a, b) {
        var da = parseFloat((a.total_distance || '99km').replace(/[^0-9.]/g, '')) || 99;
        var db = parseFloat((b.total_distance || '99km').replace(/[^0-9.]/g, '')) || 99;
        return da - db;
      });
      break;
    case '不想排队':
      // Move routes with queue-related risks to the end
      arr.sort(function(a, b) {
        var aRisk = (a.risks || []).some(function(r) { return r.indexOf('排队') !== -1 || r.indexOf('等位') !== -1; }) ? 1 : 0;
        var bRisk = (b.risks || []).some(function(r) { return r.indexOf('排队') !== -1 || r.indexOf('等位') !== -1; }) ? 1 : 0;
        return aRisk - bRisk;
      });
      break;
    case '更出片':
      // Move photo-friendly routes to the front
      arr.sort(function(a, b) {
        var aPhoto = (a.positioning || '').indexOf('出片') !== -1 || (a.reason || '').indexOf('拍照') !== -1 || (a.reason || '').indexOf('出片') !== -1 ? 0 : 1;
        var bPhoto = (b.positioning || '').indexOf('出片') !== -1 || (b.reason || '').indexOf('拍照') !== -1 || (b.reason || '').indexOf('出片') !== -1 ? 0 : 1;
        return aPhoto - bPhoto;
      });
      break;
    case '地铁优先':
      // Move subway routes to front
      arr.sort(function(a, b) {
        var aSub = (a.transport || '').indexOf('地铁') !== -1 ? 0 : 1;
        var bSub = (b.transport || '').indexOf('地铁') !== -1 ? 0 : 1;
        return aSub - bSub;
      });
      break;
    case '换个口味':
      // Rotate — move first route to end
      arr.push(arr.shift());
      break;
    case '更安静':
      // Move routes with quiet/relaxed positioning to the front
      arr.sort(function(a, b) {
        var aQuiet = (a.reason || '').indexOf('安静') !== -1 || (a.positioning || '').indexOf('安静') !== -1 || (a.reason || '').indexOf('放松') !== -1 ? 0 : 1;
        var bQuiet = (b.reason || '').indexOf('安静') !== -1 || (b.positioning || '').indexOf('安静') !== -1 || (b.reason || '').indexOf('放松') !== -1 ? 0 : 1;
        return aQuiet - bQuiet;
      });
      break;
    case '更省时':
      // Sort by total_time — parse numeric minutes from "X 分钟" or "X 小时" format
      arr.sort(function(a, b) {
        var ta = parseTime(a.total_time) || 999;
        var tb = parseTime(b.total_time) || 999;
        return ta - tb;
      });
      break;
    default:
      break;
  }
  return arr;
}

// ─── Favorites API (with in-memory fallback) ───────────────────

// Shared in-memory store — survives panel close/open within the session.
// Falls back to this when backend is unavailable.
window._favoritesStore = window._favoritesStore || [];
var _favIdCounter = 1;

async function saveFavorite(routeData, routeName, scene, poiCount, totalTime, totalCost) {
  var uid = _currentUserId || null;
  var localEntry = {
    id: 'local-' + (_favIdCounter++),
    routeJson: JSON.stringify(routeData),
    routeName: routeName || '',
    scene: scene || '',
    poiCount: poiCount || 0,
    totalTime: totalTime || '',
    totalCost: totalCost || 0,
    createdAt: new Date().toISOString(),
    userId: uid,
  };
  try {
    var res = await fetchWithTimeout(API_BASE + '/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: uid,
        routeJson: localEntry.routeJson,
        routeName: localEntry.routeName,
        scene: localEntry.scene,
        poiCount: localEntry.poiCount,
        totalTime: localEntry.totalTime,
        totalCost: localEntry.totalCost,
      }),
    });
    if (!res.ok) throw new Error('Save failed: ' + res.status);
    var serverEntry = await res.json();
    window._favoritesStore.unshift(serverEntry);
    return serverEntry;
  } catch (e) {
    console.warn('Favorites API unavailable, saving locally:', e.message);
    window._favoritesStore.unshift(localEntry);
    return localEntry;
  }
}

async function getFavorites() {
  try {
    var uid = _currentUserId || '';
    var url = API_BASE + '/api/favorites' + (uid ? '?userId=' + encodeURIComponent(uid) : '');
    var res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error('Fetch failed: ' + res.status);
    var serverData = await res.json();
    // Merge: server data + any local-only entries not yet synced
    var localIds = new Set(window._favoritesStore.filter(function(f) { return String(f.id).indexOf('local-') === 0; }).map(function(f) { return f.id; }));
    if (localIds.size > 0) {
      return window._favoritesStore;
    }
    window._favoritesStore = serverData || [];
    return window._favoritesStore;
  } catch (e) {
    console.warn('Favorites API unavailable, using local store:', e.message);
    return window._favoritesStore;
  }
}

async function deleteFavorite(id) {
  // Remove from local store immediately
  window._favoritesStore = window._favoritesStore.filter(function(f) { return f.id != id; });
  try {
    if (String(id).indexOf('local-') === 0) {
      return { success: true, id: id };
    }
    var uid = _currentUserId || '';
    var url = API_BASE + '/api/favorites/' + id + (uid ? '?userId=' + encodeURIComponent(uid) : '');
    var res = await fetchWithTimeout(url, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed: ' + res.status);
    return await res.json();
  } catch (e) {
    console.warn('Favorites API delete failed:', e.message);
    return { success: true, id: id };
  }
}

// ─── Exports ──────────────────────────────────────────────────────
Object.assign(window, {
  API_BASE,
  getSessionId, setSessionId,
  getCurrentUserId, setCurrentUserId,
  getUserProfiles,
  planRoute, adjustRoute, analyzeIntent, smartPlan,
  buildQueryFromScene,
  planWithFallback, adjustWithFallback, mockAdjustRoutes,
  mapRoute, mapPlanResponse,
  fmtDuration, fmtDistance,
  saveFavorite, getFavorites, deleteFavorite,
});
