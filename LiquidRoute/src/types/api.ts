// API 响应类型 - 对应后端 RoutePlannerOrchestrator.PlanResponse, CompareResponse

export interface POI {
  id: string;
  name: string;
  category: string;
  subCategory: string;
  lat: number;
  lng: number;
  address: string;
  district: string;
  city: string;
  rating: number;
  avgCost: number;
  queueTime: number;
  openTime: string;
  closeTime: string;
  visitDuration: number;
  tags: string[];
  imageUrl: string;
  description: string;
  popularityScore: number;
}

export interface RouteSegment {
  poi: POI;
  arrivalTime: string;
  departureTime: string;
  travelTimeFromPrevious: number;
  travelMode: string;
}

export interface Route {
  id: string;
  name: string;
  description: string;
  segments: RouteSegment[];
  totalCost: number;
  totalTravelTime: number;
  totalRating: number;
  optimizationGoal: string;
  satisfiedConstraints: Constraint[];
  violatedSoftConstraints: Constraint[];
  score: number;
}

export interface Constraint {
  type: string;
  scope: string;
  description: string;
  priority: number;
  weight: number;
  satisfied: boolean;
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

export interface PlanRequest {
  query: string;
  sessionId: string | null;
}

export interface AdjustRequest {
  sessionId: string;
  adjustment: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
