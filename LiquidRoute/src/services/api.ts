import axios from 'axios';
import type { PlanResponse, CompareResponse, HealthResponse } from '../types';

const BASE_URL = 'http://localhost:8080';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// 重试逻辑
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
      }
    }
  }
  throw lastError;
}

export const routeApi = {
  // 路由规划
  planRoute: (query: string, sessionId?: string) =>
    withRetry(() =>
      api.post<PlanResponse>('/api/route/plan', { query, sessionId }).then(r => r.data)
    ),

  // 路线调整
  adjustRoute: (sessionId: string, adjustment: string) =>
    withRetry(() =>
      api.post<PlanResponse>('/api/route/adjust', { sessionId, adjustment }).then(r => r.data)
    ),

  // 方案对比
  getCompare: (sessionId: string) =>
    withRetry(() =>
      api.get<CompareResponse>(`/api/route/compare/${sessionId}`).then(r => r.data)
    ),

  // 健康检查
  health: () =>
    api.get<HealthResponse>('/api/route/health').then(r => r.data),
};

// Mock 数据（后端不可用时离线演示）
export const mockData = {
  health: (): HealthResponse => ({ status: 'UP', service: 'AI Route Planner (Mock)' }),

  planRoute: async (query: string): Promise<PlanResponse> => {
    await new Promise(r => setTimeout(r, 1500)); // 模拟网络延迟
    const sessionId = `mock_${Date.now()}`;

    const mockPois = [
      { id: 'p1', name: '三里屯太古里', category: 'SHOPPING', lat: 39.9333, lng: 116.4551,
        rating: 4.5, avgCost: 200, queueTime: 0, visitDuration: 90,
        tags: ['购物', '潮流'], description: '北京最受欢迎的购物街区' },
      { id: 'p2', name: '鸟庵·日料', category: 'RESTAURANT', lat: 39.9338, lng: 116.4545,
        rating: 4.8, avgCost: 180, queueTime: 15, visitDuration: 60,
        tags: ['日料', '精品'], description: '隐藏在三里屯的精品日料' },
      { id: 'p3', name: '三里屯电影院', category: 'ENTERTAINMENT', lat: 39.9325, lng: 116.4540,
        rating: 4.4, avgCost: 80, queueTime: 10, visitDuration: 120,
        tags: ['电影', '娱乐'], description: '最新的观影体验' },
      { id: 'p4', name: 'PageOne书店', category: 'CULTURE', lat: 39.9329, lng: 116.4560,
        rating: 4.6, avgCost: 80, queueTime: 0, visitDuration: 60,
        tags: ['书店', '文艺'], description: '设计感十足的书店' },
    ];

    const routes = [
      {
        id: 'r1', name: '三里屯悠闲体验', description: '逛街+日料+电影',
        segments: [
          { poi: mockPois[0], arrivalTime: '14:00', departureTime: '15:30',
            travelTimeFromPrevious: 0, travelMode: 'WALKING' },
          { poi: mockPois[1], arrivalTime: '15:35', departureTime: '16:35',
            travelTimeFromPrevious: 5, travelMode: 'WALKING' },
          { poi: mockPois[2], arrivalTime: '16:45', departureTime: '18:45',
            travelTimeFromPrevious: 10, travelMode: 'WALKING' },
        ],
        totalCost: 460, totalTravelTime: 285, totalRating: 4.57,
        optimizationGoal: 'BEST_EXPERIENCE', score: 92,
      },
      {
        id: 'r2', name: '三里屯快速体验', description: '咖啡+书店',
        segments: [
          { poi: { ...mockPois[0], name: '星巴克臻选', category: 'CAFE', avgCost: 45, rating: 4.3 },
            arrivalTime: '14:00', departureTime: '14:30',
            travelTimeFromPrevious: 0, travelMode: 'WALKING' },
          { poi: mockPois[3], arrivalTime: '14:35', departureTime: '15:35',
            travelTimeFromPrevious: 5, travelMode: 'WALKING' },
        ],
        totalCost: 125, totalTravelTime: 95, totalRating: 4.45,
        optimizationGoal: 'FASTEST', score: 85,
      },
      {
        id: 'r3', name: '三里屯省钱方案', description: '咖啡+书店',
        segments: [
          { poi: { ...mockPois[0], name: '瑞幸咖啡', category: 'CAFE', avgCost: 25, rating: 4.0 },
            arrivalTime: '14:00', departureTime: '14:30',
            travelTimeFromPrevious: 0, travelMode: 'WALKING' },
          { poi: mockPois[3], arrivalTime: '14:35', departureTime: '15:35',
            travelTimeFromPrevious: 5, travelMode: 'WALKING' },
        ],
        totalCost: 105, totalTravelTime: 95, totalRating: 4.3,
        optimizationGoal: 'CHEAPEST', score: 78,
      },
    ];

    return { sessionId, routes, warning: null, recommendedRoute: routes[0], explanation: '推荐三里屯悠闲体验路线' };
  },

  adjustRoute: async (_sessionId: string, adjustment: string): Promise<PlanResponse> => {
    await new Promise(r => setTimeout(r, 1000));
    const sessionId = `mock_${Date.now()}`;

    const isHotpot = adjustment.includes('火锅') || adjustment.includes('不用排队');
    const hotpotPOI = {
      id: 'p_hotpot', name: '海底捞（三里屯店）', category: 'RESTAURANT',
      lat: 39.9340, lng: 116.4560, rating: 4.7, avgCost: 150,
      queueTime: isHotpot ? 5 : 30, visitDuration: 90,
      tags: ['火锅', '服务好'], description: '以服务闻名的火锅连锁',
    };
    const cinemaPOI = {
      id: 'p3', name: '三里屯电影院', category: 'ENTERTAINMENT',
      lat: 39.9325, lng: 116.4540, rating: 4.4, avgCost: 80,
      queueTime: 10, visitDuration: 120, tags: ['电影'],
    };

    const routes = [{
      id: 'r_adjusted', name: '调整后方案', description: `${isHotpot ? '不排队的' : ''}火锅+电影`,
      segments: [
        { poi: hotpotPOI, arrivalTime: '18:00', departureTime: '19:30',
          travelTimeFromPrevious: 0, travelMode: 'WALKING' },
        { poi: cinemaPOI, arrivalTime: '19:40', departureTime: '21:40',
          travelTimeFromPrevious: 10, travelMode: 'WALKING' },
      ],
      totalCost: 230, totalTravelTime: 220, totalRating: 4.55,
      optimizationGoal: 'BEST_EXPERIENCE', score: 88,
    }];

    return { sessionId, routes, warning: null, recommendedRoute: routes[0], explanation: '已根据您的需求调整路线' };
  },
};
