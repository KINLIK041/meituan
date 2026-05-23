# AI 路线规划助手 (AI Route Planner)

> 美团黑客松 Track 5 — 基于多 Agent 协作的本地生活智能路线规划系统

## 解决的问题

本地生活消费场景中，用户面临三大核心痛点：

1. **信息过载**：一个商圈有上百家店，用户不知道去哪、怎么走
2. **需求模糊**：用户只会说"下午想出去逛逛"，无法清晰表达约束条件（预算、排队、时间窗口等）
3. **方案对比困难**：多条路线之间的差异（性价比 vs 体验 vs 效率）难以直观比较

**AI 路线规划助手**通过自然语言对话理解用户意图，结合 5 个 Agent 协作自动生成 2-3 条差异化路线方案，并给出详细对比与推荐理由。

## 覆盖人群与场景

| 人群 | 典型场景 | 核心需求 |
|------|---------|---------|
| 游客/旅行者 | 周末去三里屯逛街+吃饭 | 不熟悉商圈，需要一站式路线 |
| 约会情侣 | 拍照好看、评分高、不排队的餐厅 | 体验优先，特殊偏好（安静/氛围） |
| 亲子家庭 | 带娃逛博物馆+吃饭 | 安全、方便、适合儿童 |
| 上班族 | 下班后高效逛吃 | 时间紧，效率优先 |
| 探店博主 | 一天打卡多个网红店 | 路线最优，减少走路 |

## 系统架构

```
┌──────────────────────────────────────────────────────────────────┐
│  Frontend (routeplan/)                                           │
│  React 18 + Tailwind CSS + 高德地图 + CDN 部署                    │
│  纯静态页面，无需构建工具，浏览器直接打开即可运行                    │
└──────────────────────────┬───────────────────────────────────────┘
                           │ HTTP POST /api/route/plan
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│  Backend (Spring Boot 3.4 + Java 21 + WebFlux)                   │
│                                                                  │
│  RouteController (REST API)                                      │
│       │                                                          │
│       ▼                                                          │
│  RoutePlannerOrchestrator (多 Agent 编排器)                       │
│       │                                                          │
│       │   ┌──────────────────────────────────────────────┐       │
│       │   │         five-Agent Pipeline                   │       │
│       │   │                                              │       │
│       │   │  Agent 1 ────→ Agent 2 ────→ Agent 3        │       │
│       │   │  Conversation   Discovery    Planning         │       │
│       │   │  (意图解析)     (POI发现)    (路线生成)        │       │
│       │   │       │             │            │            │       │
│       │   │       └─────────────┴────────────┘            │       │
│       │   │                     │                         │       │
│       │   │              Agent 4 ────→ Agent 5            │       │
│       │   │              Constraint   Explanation         │       │
│       │   │              (约束验证)    (解释推荐)          │       │
│       │   └──────────────────────────────────────────────┘       │
│       │                                                          │
│       ▼                                                          │
│  Infrastructure Layer                                            │
│  ┌──────────┬──────────────┬────────────┬─────────────────┐      │
│  │DeepSeek  │  JGraphT     │ PostgreSQL │ 美团/高德 API    │      │
│  │LLM 解析  │  图算法求解   │  持久化     │  实时商户+地理    │      │
│  └──────────┴──────────────┴────────────┴─────────────────┘      │
└──────────────────────────────────────────────────────────────────┘
```

## five-Agent 协作流程

Pipeline 顺序：**Conversation → Discovery → Planning → Constraint → Explanation**

其中 Conversation（LLM 调用）和 Discovery（北京 POI 宽搜）**并行执行**以降低延迟。

### Agent 1: ConversationAgent — 对话理解与意图解析

- **文件**: `src/main/java/com/meituan/route/agent/ConversationAgent.java:37`
- **输入来源**: 用户自然语言查询（如"北京三里屯下午不排队的火锅"）
- **核心逻辑**:
  - Tier 1: LangChain4j + DeepSeek LLM 将查询转为结构化 JSON → `UserIntent`（含城市、商圈、品类、预算、评分要求、时间窗口、出行方式、优化目标等）
  - Tier 2: 关键词规则回退（LLM 不可用时自动降级，见 `IntentParser.java:160`）
  - 多轮对话上下文管理（`SessionStateManager`）
- **输出**: `ConversationResult` → 传递给 Agent 2 和 Agent 3

### Agent 2: DiscoveryAgent — POI 候选发现

- **文件**: `src/main/java/com/meituan/route/agent/DiscoveryAgent.java:35`
- **输入来源**: Agent 1 产出的 `UserIntent`（或并行阶段的 `broadIntent("北京")`）
- **核心逻辑**:
  - 按品类并行搜索候选 POI（`DataService.searchByCategory()`，见 `DiscoveryAgent.java:48-49`）
  - 硬约束过滤：预算 2x 上限 → 按评分+热度排序 → Top 20（见 `DiscoveryAgent.java:66-81`）
  - 支持 speculative discovery：LLM 解析期间并行预搜北京全品类，解析完成后按意图过滤
- **输出**: `DiscoveryResult` → 传递给 Agent 3 和 Agent 4

### Agent 3: PlanningAgent — 路线方案生成

- **文件**: `src/main/java/com/meituan/route/agent/PlanningAgent.java:35`
- **输入来源**: Agent 2 的 `DiscoveryResult` + Agent 1 的 `UserIntent`
- **核心逻辑**:
  - 构建 POI 连通图 → `GraphSearchSolver` 生成 2-3 条差异化路线（体验最优/最高效/最省钱）
  - 无解时自动松弛约束重试（`constraintEngine.relaxConstraints()`，见 `PlanningAgent.java:57-67`）
  - 支持增量 replan（保留前缀 POI，重规划后缀，见 `PlanningAgent.java:92-127`）
- **输出**: `PlanningResult` → 传递给 Agent 4 和 Agent 5

### Agent 4: ConstraintAgent — 约束验证与打分

- **文件**: `src/main/java/com/meituan/route/agent/ConstraintAgent.java:32`
- **输入来源**: Agent 3 的路由列表 + `ConstraintEngine` 构建的约束 + Agent 1 的 `UserIntent`
- **核心逻辑**:
  - 逐条验证路线是否满足硬约束/软约束，并综合评分（见 `ConstraintAgent.java:37-54`）
  - 增量调整时从自然语言解析新约束，如"换不排队的火锅"→ `maxQueue=10, category=火锅`（见 `ConstraintAgent.java:60-105`）
- **输出**: `ConstraintReport` → 传递最佳路线给编排器

### Agent 5: ExplanationAgent — 自然语言解释

- **文件**: `src/main/java/com/meituan/route/agent/ExplanationAgent.java:26`
- **输入来源**: Agent 3 的路由列表 + Agent 1 的 `UserIntent`
- **核心逻辑**:
  - 调用 `RecommendationExplainer`（LLM）生成方案摘要与对比说明
  - 输出每条路线的差异化推荐理由（见 `ExplanationAgent.java:47-69`）
- **输出**: `ExplanationResult` → 最终返回前端

### 完整数据流（含代码行号）

```
用户查询 "北京三里屯下午不排队的火锅"
         │
         ▼
RouteController.java:29  ──  POST /api/route/plan
         │
         ▼
RoutePlannerOrchestrator.java:58  ──  planRoute(query, sessionId)
         │
         ├──→ ConversationAgent.process(query) ── (line 37)
         │    IntentParser.parse() ── (IntentParser.java:68) ──  LLM JSON 解析 / 规则回退
         │    产出: UserIntent { city="北京", district="三里屯", categories=["RESTAURANT"],
         │                      cuisine="火锅", maxQueue=10, goal="BEST_EXPERIENCE" }
         │
         └──→ DiscoveryAgent.discover(broadIntent("北京")) ── (line 35) ── 并行!
              DataService.searchByCategory("北京", null, cat) ── 宽搜全品类
              产出: DiscoveryResult (200+ POI)
                     ↓
              filterForIntent(speculative, realIntent) ── (line 128) ── 按意图过滤
              产出: 20 个候选 POI
                     │
                     ▼
              PlanningAgent.plan(discovery, intent) ── (PlanningAgent.java:35)
              GraphSearchSolver.generatePlans(candidates, constraints, intent, 3)
              产出: 3 条 Route
                     │
                     ├──→ ConstraintAgent.analyze(routes, constraints, intent) ── (ConstraintAgent.java:32)
                     │    ConstraintEngine.validate() + scoreRoute()
                     │    产出: ConstraintReport { bestRoute, allFeasible, scores }
                     │
                     └──→ ExplanationAgent.explain(routes, intent) ── (ExplanationAgent.java:26)
                          RecommendationExplainer.compareRoutes()
                          产出: ExplanationResult { summary, comparisonHtml }
                     │
                     ▼
              PlanResponse → 前端展示 (line 111-117)
```

### 增量调整流程 (Adjustment Pipeline)

```
用户追加 "换一家不排队的，改成日料"
         │
         ▼
RoutePlannerOrchestrator.java:131  ──  adjustRoute(sessionId, adjustment)
         │
         ├──→ SessionStateManager.getLatestRoute(sessionId) ── 获取当前路线
         ├──→ ConstraintAgent.parseAdjustmentConstraints(adjustment) ── (line 60)
         │    解析出新约束: [maxQueue=10, category=日料]
         ├──→ SessionStateManager.resolveAdjustment(adjustment, route) ── 确定保留前缀
         ├──→ ConversationAgent.process(adjustment) ── 新 UserIntent
         ├──→ DiscoveryAgent.discover(newIntent) ── 新候选 POI
         ├──→ PlanningAgent.replan(discovery, intent, keptPrefix, newConstraints) ── (line 92)
         └──→ Constraint + Explanation → PlanResponse
```

## 技术栈

### Backend

| 技术 | 用途 | 版本 |
|------|------|------|
| Java | 核心语言 | 21 |
| Spring Boot | 应用框架 | 3.4.4 |
| Spring WebFlux | 响应式 HTTP 服务（Reactor） | 3.4.4 |
| Spring Data JPA + PostgreSQL | 会话持久化 | — |
| Flyway | 数据库迁移 | — |
| LangChain4j | LLM 集成框架（OpenAI 兼容） | 1.0.0-beta3 |
| DeepSeek v4 | 大语言模型（意图解析 + 推荐解释） | deepseek-v4-flash |
| JGraphT | POI 连通图构建与图搜索 | 1.5.2 |
| 美团开放平台 API | 实时商户数据 | — |
| 高德地图 Web API | 地理编码 / 路径距离计算 | — |
| Maven | 构建工具 | 3.9+ |
| JUnit 5 + Mockito | 测试框架 | — |

### Frontend

| 技术 | 用途 |
|------|------|
| React 18 | UI 框架（UMD CDN 引入，无需构建） |
| Tailwind CSS | 样式（CDN） |
| 高德地图 JS API v2.0 | 地图可视化 |
| Babel Standalone | 浏览器端 JSX 编译 |
| Lucide Icons | 图标库 |

## 项目结构

```
meituan/
├── README.md                           # 本文件
│
├── pom.xml                             # Maven 配置（Spring Boot 父 POM）
├── src/                                # ★ 后端源码
│   ├── main/java/com/meituan/route/
│   │   ├── RouteApplication.java       # Spring Boot 启动入口
│   │   ├── RouteController.java        # REST API（/api/route/plan | adjust | compare）
│   │   ├── FavoriteController.java     # 收藏 API
│   │   │
│   │   ├── agent/                      # ★ five-Agent 实现
│   │   │   ├── ConversationAgent.java  # Agent 1: 对话+意图解析
│   │   │   ├── DiscoveryAgent.java     # Agent 2: POI 候选发现
│   │   │   ├── PlanningAgent.java      # Agent 3: 路线方案生成
│   │   │   ├── ConstraintAgent.java    # Agent 4: 约束验证+打分
│   │   │   └── ExplanationAgent.java   # Agent 5: 解释+推荐
│   │   │
│   │   ├── orchestrator/
│   │   │   └── RoutePlannerOrchestrator.java  # ★ 多 Agent 编排器 + 并行调度
│   │   │
│   │   ├── llm/
│   │   │   ├── IntentParser.java       # LLM 意图解析（DeepSeek + 规则回退）
│   │   │   └── RecommendationExplainer.java  # LLM 路线推荐解释
│   │   │
│   │   ├── solver/
│   │   │   ├── GraphSearchSolver.java  # 图搜索路线求解器（Beam Search）
│   │   │   ├── ConstraintEngine.java   # 约束引擎（构建/验证/评分/松弛）
│   │   │   └── TimeWindowChecker.java  # 时间窗口检查
│   │   │
│   │   ├── data/
│   │   │   ├── DataService.java        # 数据服务接口
│   │   │   ├── MockDataService.java    # Mock 数据实现（默认 profile, 200+ POI）
│   │   │   ├── DianpingApiDataService.java  # 美团点评 API 实现
│   │   │   └── GaodeGeoService.java    # 高德地理编码服务
│   │   │
│   │   ├── model/
│   │   │   ├── POI.java                # 兴趣点模型（Java record）
│   │   │   ├── Route.java              # 路线模型（Java record）
│   │   │   ├── UserIntent.java         # 用户意图模型（Java record）
│   │   │   └── Constraint.java         # 约束模型（Java record）
│   │   │
│   │   ├── entity/                     # JPA 实体（Session/Snapshot/Route/Favorite）
│   │   ├── repository/                 # Spring Data JPA 仓库
│   │   ├── state/
│   │   │   └── SessionStateManager.java  # 会话状态管理（路线快照 + 版本控制）
│   │   └── config/                     # Spring 配置类
│   │
│   ├── main/resources/
│   │   ├── application.yml             # 应用配置（DeepSeek/美团/高德/PostgreSQL）
│   │   └── db/migration/               # Flyway 数据库迁移脚本
│   │
│   └── test/java/com/meituan/route/solver/
│       ├── ConstraintEngineTest.java    # 约束引擎测试
│       └── GraphSearchSolverTest.java   # 图搜索求解器测试
│
├── routeplan/                          # ★ 前端（纯静态，零构建）
│   ├── index.html                      # 入口 HTML（React CDN + 高德地图 + Tailwind）
│   ├── app.jsx                         # 主应用组件
│   ├── api.js                          # API 调用层（对接后端 /api/route/*）
│   ├── chat-screen.jsx                 # 对话主界面
│   ├── components.jsx                  # 通用 UI 组件
│   ├── route-detail.jsx               # 路线详情页
│   ├── history-panel.jsx              # 历史记录面板
│   ├── favorites-panel.jsx            # 收藏面板
│   ├── nl-flow.jsx                    # 自然语言交互流
│   ├── need-completion.jsx            # 需求补全对话
│   └── images/stores/                  # 店铺图片资源
│
└── .claude/                            # Claude Code 配置
```

## 快速开始

### 环境要求

- JDK 21+
- Maven 3.9+
- PostgreSQL 15+（可选，mock profile 下使用内存数据）
- DeepSeek API Key（可选，mock profile 下使用规则解析）

### 启动后端

```bash
# 默认 mock profile（无需数据库和 API Key，使用内置 Mock 数据）
mvn spring-boot:run

# 使用 PostgreSQL + DeepSeek LLM
mvn spring-boot:run -Dspring-boot.run.profiles=default

# 使用美团点评实时数据
mvn spring-boot:run -Dspring-boot.run.profiles=dianping
```

后端启动后监听 `http://localhost:8080`

### 启动前端

直接用浏览器打开 `routeplan/index.html`（需先启动后端）。

或使用静态文件服务器：

```bash
cd routeplan
npx serve .        # Node.js
# 或
python -m http.server 3000
```

### API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/route/plan` | 首次路线规划 |
| POST | `/api/route/adjust` | 增量调整路线 |
| GET | `/api/route/compare/{sessionId}` | 获取多方案对比 |
| GET | `/api/route/health` | 健康检查 |

**plan 请求示例**:

```json
{
  "query": "北京三里屯下午不想排队的日料，预算200块",
  "sessionId": null
}
```

**响应示例**:

```json
{
  "sessionId": "abc123",
  "routes": [
    {
      "id": "route_1",
      "name": "体验最优方案",
      "segments": [
        { "poi": { "name": "一蘭拉面", "rating": 4.6, "avgCost": 120 }, "travelTimeFromPrevious": 0 },
        { "poi": { "name": "太古里", "rating": 4.5, "avgCost": 0 }, "travelTimeFromPrevious": 8 }
      ],
      "totalCost": 120,
      "totalTravelTime": 8,
      "totalRating": 9.1,
      "optimizationGoal": "BEST_EXPERIENCE"
    }
  ],
  "recommendedRoute": { /* ... */ },
  "explanation": "为您规划了3条三里屯路线方案：\n1. 体验最优：2站 | ¥120 | 均分4.6\n..."
}
```

**adjust 请求示例**:

```json
{
  "sessionId": "abc123",
  "adjustment": "换一家不排队的，评分要高"
}
```

### 演示场景

```bash
# 场景一：基础串联
curl -X POST http://localhost:8080/api/route/plan \
  -H "Content-Type: application/json" \
  -d '{"query": "周末下午去三里屯逛街，然后吃日料", "sessionId": null}'

# 场景二：多约束（预算 + 拍照 + 电影）
curl -X POST http://localhost:8080/api/route/plan \
  -H "Content-Type: application/json" \
  -d '{"query": "带女朋友去国贸，预算400，要拍照好看的餐厅，然后看电影，少走路", "sessionId": null}'

# 场景三：动态调整
# 第一步拿到 sessionId
curl -X POST http://localhost:8080/api/route/plan \
  -H "Content-Type: application/json" \
  -d '{"query": "三里屯逛街吃日料", "sessionId": null}'
# 第二步用 sessionId 调整
curl -X POST http://localhost:8080/api/route/adjust \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "sess_xxx", "adjustment": "日料换成评分4.5以上的火锅"}'
```

## 核心算法：混合路线求解

采用 **LLM-as-Parser + Beam Search** 混合架构：

1. **意图解析**：`IntentParser` 将自然语言转为结构化的 `UserIntent`（城市、商圈、品类、预算、评分、时间窗、出行方式、优化目标）
2. **图构建**：基于候选 POI 构建带权有向图，节点 = POI，边 = 步行/驾车时间（Haversine 距离估算）
3. **Beam Search 多目标优化**：
   - `BEST_EXPERIENCE` → 最大化评分 + 热度
   - `FASTEST` → 最小化行程时间
   - `CHEAPEST` → 最小化花费
4. **约束验证**：硬约束（时间窗口）剪枝，软约束（预算、评分、排队）加权评分
5. **冲突消解**：逐级放松软约束，先降低优先级最低的约束，再放大预算上限

## 配置说明

核心配置在 `src/main/resources/application.yml`，关键环境变量：

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5433/liquidroute` | PostgreSQL 地址 |
| `SPRING_DATASOURCE_USERNAME` | `liquidroute` | 数据库用户名 |
| `SPRING_DATASOURCE_PASSWORD` | `liquidroute` | 数据库密码 |
| `DEEPSEEK_API_KEY` | (内置 Key) | DeepSeek API Key |
| `LLM_MODEL` | `deepseek-v4-flash` | 模型名称 |
| `LLM_BASE_URL` | `https://api.deepseek.com/v1` | LLM API 地址 |
| `MEITUAN_API_TOKEN` | (内置 Token) | 美团开放平台 |
| `GAODE_API_KEY` | (内置 Key) | 高德地图 Web API |

## 关于项目组织

### Frontend: `routeplan/` 是唯一前端

- `routeplan/` — **本项目的 Web 前端**，纯静态 React 页面，对接后端 `/api/route/*`
- `LiquidRoute/` — 独立的 React Native 移动端项目（与后端无关，可移除）

### Backend: 是否需要单独 `backend/` 文件夹？

**推荐保持现状**（`pom.xml` 和 `src/` 在根目录），理由：
- Maven 标准项目约定就是根目录放 `pom.xml`，`git clone` 后直接 `mvn spring-boot:run`
- 前端 `routeplan/` 已经物理隔离，不需要再加一层目录

如果未来前后端各自独立 CI/CD，可考虑：
```
backend/          # Spring Boot（pom.xml + src/）
routeplan/        # 前端
README.md
```
