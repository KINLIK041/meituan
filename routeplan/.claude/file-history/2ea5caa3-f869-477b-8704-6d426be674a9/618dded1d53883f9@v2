// 与 Java 后端数据模型对应

export interface POI {
  id: string;
  name: string;
  category: string;
  subCategory?: string;
  lat: number;
  lng: number;
  address?: string;
  district?: string;
  city?: string;
  rating: number;
  avgCost: number;
  queueTime: number;
  openTime?: string;
  closeTime?: string;
  visitDuration?: number;
  tags?: string[];
  imageUrl?: string;
  description?: string;
  popularityScore?: number;
}

export interface RouteSegment {
  poi: POI;
  arrivalTime: string;
  departureTime: string;
  travelTimeFromPrevious: number; // minutes
  travelMode: string; // WALKING, DRIVING
}

export interface Route {
  id: string;
  name: string;
  description: string;
  segments: RouteSegment[];
  totalCost: number;
  totalTravelTime: number; // minutes
  totalRating: number;
  optimizationGoal: string; // BEST_EXPERIENCE, FASTEST, CHEAPEST
  satisfiedConstraints?: string[];
  violatedSoftConstraints?: string[];
  score: number;
}

export interface PlanResponse {
  sessionId: string;
  routes: Route[];
  warning: string | null;
  recommendedRoute: Route | null;
  explanation: string;
}

export interface CompareResponse {
  sessionId: string;
  routes: Route[];
  comparisonHtml: string;
}

export interface HealthResponse {
  status: string;
  service: string;
}

// 本地状态
export interface SessionState {
  sessionId: string;
  plans: Route[];
  currentPlanIndex: number;
  adjustmentHistory: AdjustmentSnapshot[];
}

export interface AdjustmentSnapshot {
  id: string;
  type: 'adjust' | 'undo' | 'redo';
  plans: Route[];
  timestamp: string;
}

export type OptimizationGoal = 'BEST_EXPERIENCE' | 'FASTEST' | 'CHEAPEST';

export const optimizationGoalLabels: Record<OptimizationGoal, string> = {
  BEST_EXPERIENCE: '体验优先',
  FASTEST: '最省时',
  CHEAPEST: '最省钱',
};

export const optimizationGoalColors: Record<OptimizationGoal, string> = {
  BEST_EXPERIENCE: '#8B5CF6',
  FASTEST: '#3B82F6',
  CHEAPEST: '#10B981',
};

export const categoryIcons: Record<string, string> = {
  RESTAURANT: '🍽️',
  ATTRACTION: '🎯',
  SHOPPING: '🛍️',
  ENTERTAINMENT: '🎮',
  CULTURE: '🎨',
  CAFE: '☕',
  CINEMA: '🎬',
  PARK: '🌳',
};

export const categoryLabels: Record<string, string> = {
  RESTAURANT: '美食',
  ATTRACTION: '景点',
  SHOPPING: '购物',
  ENTERTAINMENT: '娱乐',
  CULTURE: '文化',
  CAFE: '咖啡',
  CINEMA: '电影',
  PARK: '公园',
};

export const transportModeIcons: Record<string, string> = {
  WALKING: '🚶',
  DRIVING: '🚗',
  TRANSIT: '🚌',
};
