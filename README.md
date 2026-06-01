# AI 路线管家 · 本地智能路线规划系统

基于大语言模型的智能路线规划系统，结合 POI 数据、UGC 评价语料和用户偏好，自动生成个性化多方案路线。

## 架构

```
                        用户界面 (React)
      chat-screen → route-compare → route-detail
                            |
                         HTTP API
                            |
             后端服务 (Spring Boot WebFlux)

  ┌─ Agent Loop（新架构, 默认启用）─────────────────┐
  │ Route Concierge Agent (LLM 驱动动态决策)         │
  │  ├─ parse_user_intent    → NL 意图解析           │
  │  ├─ get_user_profile     → 用户偏好画像           │
  │  ├─ search_pois          → POI 候选搜索(400 POI)  │
  │  ├─ generate_routes      → 差异化路线生成         │
  │  ├─ check_constraints    → 多维约束检查           │
  │  ├─ score_and_rank       → 偏好打分排序           │
  │  └─ explain_routes       → 自然语言推荐解释       │
  └──────────────────────────────────────────────────┘

  ┌─ 固定流水线（兼容保留）─────────────────────────┐
  │ Conversation → Discovery → Planning →            │
  │ Constraint → Explanation                          │
  └──────────────────────────────────────────────────┘

  MockDataService: 北京 200 + 上海 200 POI
  + UGC 评价语料 + riskTags + 3 用户画像
```

## 架构对比

| 维度 | 旧: 5 Agent 固定流水线 | 新: 1 主 Agent + 7 工具 |
|------|----------------------|---------------------|
| 决策方式 | 代码固定顺序执行 | LLM 动态决定调用哪些工具 |
| 灵活性 | 每次请求全量跑 5 个 Agent | 按需按场景智能调用 |
| 扩展性 | 改编排器代码 | 注册新 Tool 即可 |
| 可解释性 | 各阶段独立黑盒 | 完整工具调用链可见可追溯 |
| 比赛叙事 | "传统微服务编排" | **"AI-native Agent 架构"** |

## 快速开始

```bash
# 1. 启动后端（默认 DeepSeek API）
mvn spring-boot:run

# 2. 浏览器打开前端
# routeplan/index.html
```

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/route/agent-plan` | **Agent Loop（推荐，默认）** |
| POST | `/api/route/smart-plan` | 固定流水线 |
| POST | `/api/route/plan` | 基础路线规划 |
| POST | `/api/route/adjust` | 路线动态调整 |
| GET | `/api/route/pois?city=北京` | POI 数据（单一数据源） |
| GET | `/api/route/profiles` | 用户画像列表 |
| GET | `/api/route/health` | 健康检查 |

## 前端架构切换

```javascript
// 浏览器控制台
window.setAgentMode(true)   // Agent Loop（默认启用）
window.setAgentMode(false)  // 回退固定流水线
```

## 性能指标

基于 12 场景 x 2 城市实际测试：

| 阶段 | 耗时 |
|------|------|
| LLM 意图解析 | ~1200ms（瓶颈，取决于 API 延迟） |
| POI 搜索 | ~50ms |
| 路线生成 | ~30ms |
| 约束检查 | ~5ms |
| 推荐解释 | ~2ms |
| **总计** | **~1500ms** |

## 交付能力对照

| 测试用例 | 能力 | 状态 |
|---------|------|:--:|
| TC01 | 自然语言意图解析 | ✅ |
| TC02 | 多 POI 串联路线(2-3 POI) | ✅ |
| TC03 | 预算约束(ConstraintEngine) | ✅ |
| TC04 | 时间窗口检查(TimeWindowChecker) | ✅ |
| TC05 | 排队约束(queueTime 过滤) | ✅ |
| TC06 | UGC 评价语料参与推荐 | ✅ |
| TC07-TC08 | 差异化路线方案 | ✅ |
| TC09-TC11 | 动态调整("更便宜/少走路/不排队") | ✅ |
| TC12-TC14 | 冲突识别 + 追问 | ✅ |
| TC15 | 偏好解释因果化("因为你过去…") | ✅ |
| TC16 | 降级策略(不可用时不崩) | ✅ |
| TC17 | 收藏→偏好学习(learnFromFavorite) | ✅ |
| TC18 | 多维度路线对比视图 | ✅ |
