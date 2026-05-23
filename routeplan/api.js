// API client for the AI Route Planner backend.
// Wraps POST /api/route/plan, POST /api/route/adjust, GET /api/route/compare/{sessionId}.
// Transforms backend Route/POI models into the frontend's route-option card format.
// Falls back to mock data (ROUTE_OPTIONS) when the backend is unreachable.

const API_BASE = 'http://localhost:8080';

// ─── Session tracking ─────────────────────────────────────────────
let _sessionId = null;

function getSessionId() { return _sessionId; }
function setSessionId(id) { _sessionId = id; }

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
  // Assign tones: first route orange, second pink, third+ green
  const tones = ['orange', 'pink', 'green'];
  routes.forEach((r, i) => {
    r.tone = tones[i] || 'green';
    r.positioning = i === 0 ? '综合最优' : i === 1 ? '体验更强' : '更稳妥';
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
 * POST /api/route/plan
 * @param {string} query - Natural language query
 * @param {string|null} sessionId
 * @returns {Promise<{sessionId, routes, warning, recommendedRoute}>}
 */
async function planRoute(query, sessionId) {
  const body = { query: query, sessionId: sessionId || null };
  const res = await fetch(API_BASE + '/api/route/plan', {
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
 * @returns {Promise<{sessionId, routes, warning, recommendedRoute}>}
 */
async function adjustRoute(sessionId, adjustment) {
  const body = { sessionId: sessionId, adjustment: adjustment };
  const res = await fetch(API_BASE + '/api/route/adjust', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('API error: ' + res.status);
  const data = await res.json();
  return mapPlanResponse(data);
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
  if (answers.time) parts.push(timeMap[answers.time] || answers.time);

  const placeMap = {
    '当前位置附近': '当前位置附近', '当前位置': '当前位置', '公司附近': '公司附近',
    '回家路上': '回家路上', '地铁站附近': '地铁站附近', '商圈附近': '商圈附近',
  };
  if (answers.place) parts.push(placeMap[answers.place] || answers.place);

  if (answers.budget && answers.budget !== '不限' && answers.budget !== '不设上限' && answers.budget !== '看心情') {
    parts.push('预算' + answers.budget);
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
async function planWithFallback(query, scene, answers) {
  try {
    const result = await planRoute(query);
    if (result.routes.length > 0) return result;
  } catch (e) {
    console.warn('Backend API unavailable, using mock data:', e.message);
  }

  // Fallback: use existing mock ROUTE_OPTIONS
  const effectiveScene = scene || '朋友聚会';
  const mockRoutes = (window.ROUTE_OPTIONS && window.ROUTE_OPTIONS[effectiveScene])
    || window.ROUTE_OPTIONS['朋友聚会'];
  return {
    sessionId: 'mock-' + Date.now(),
    routes: mockRoutes,
    warning: null,
    recommendedRoute: mockRoutes[0] || null,
  };
}

/**
 * Call adjustRoute with automatic mock fallback.
 * Fallback just returns the same routes (mock can't adjust).
 */
async function adjustWithFallback(sessionId, adjustment, currentRoutes) {
  try {
    const result = await adjustRoute(sessionId, adjustment);
    if (result.routes.length > 0) return result;
  } catch (e) {
    console.warn('Backend API unavailable for adjust, using mock:', e.message);
  }
  return {
    sessionId: sessionId,
    routes: currentRoutes || [],
    warning: null,
    recommendedRoute: null,
  };
}

// ─── Exports ──────────────────────────────────────────────────────
Object.assign(window, {
  API_BASE,
  getSessionId, setSessionId,
  planRoute, adjustRoute,
  buildQueryFromScene,
  planWithFallback, adjustWithFallback,
  mapRoute, mapPlanResponse,
  fmtDuration, fmtDistance,
});
