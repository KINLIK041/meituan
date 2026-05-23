package com.meituan.route.llm;

import com.meituan.route.model.UserIntent;
import dev.langchain4j.model.chat.ChatLanguageModel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.LocalTime;
import java.util.*;
import java.util.regex.Pattern;

/**
 * Parses natural language user queries into structured UserIntent.
 *
 * Two-tier architecture:
 *   Tier 1: LangChain4j LLM (DeepSeek) for accurate semantic parsing
 *   Tier 2: Rule-based fallback when LLM is unavailable
 */
@Component
public class IntentParser {

    private static final Logger log = LoggerFactory.getLogger(IntentParser.class);

    private final ChatLanguageModel chatModel;
    private final boolean llmAvailable;

    private static final Pattern BUDGET_PATTERN = Pattern.compile("预算(\\d+)");
    private static final Pattern RATING_PATTERN = Pattern.compile("评分[以至少高于大于等于]*([\\d.]+)");

    private static final Map<String, String> TIME_KEYWORDS = Map.of(
            "早上", "08:00", "上午", "09:00", "中午", "12:00",
            "下午", "14:00", "傍晚", "17:00", "晚上", "18:00", "夜间", "20:00"
    );

    private static final Map<String, String> CATEGORY_MAP = Map.ofEntries(
            Map.entry("逛街", "SHOPPING"), Map.entry("购物", "SHOPPING"), Map.entry("商场", "SHOPPING"),
            Map.entry("吃", "RESTAURANT"), Map.entry("餐厅", "RESTAURANT"), Map.entry("美食", "RESTAURANT"),
            Map.entry("日料", "RESTAURANT"), Map.entry("火锅", "RESTAURANT"), Map.entry("烤鸭", "RESTAURANT"),
            Map.entry("景点", "ATTRACTION"), Map.entry("玩", "ATTRACTION"), Map.entry("公园", "ATTRACTION"),
            Map.entry("电影", "ENTERTAINMENT"), Map.entry("酒吧", "ENTERTAINMENT"), Map.entry("娱乐", "ENTERTAINMENT"),
            Map.entry("文化", "CULTURE"), Map.entry("博物馆", "CULTURE"), Map.entry("书店", "CULTURE"),
            Map.entry("艺术", "CULTURE")
    );

    private static final Map<String, String> DISTRICT_MAP = Map.ofEntries(
            Map.entry("三里屯", "三里屯"), Map.entry("国贸", "国贸"),
            Map.entry("王府井", "王府井"), Map.entry("前门", "前门"),
            Map.entry("东城", "东城"), Map.entry("西城", "西城"),
            Map.entry("海淀", "海淀"),
            Map.entry("外滩", "外滩"), Map.entry("陆家嘴", "陆家嘴"),
            Map.entry("新天地", "新天地"), Map.entry("南京路", "南京路"),
            Map.entry("静安寺", "静安寺"), Map.entry("浦东", "浦东")
    );

    public IntentParser(Optional<ChatLanguageModel> chatModel) {
        this.chatModel = chatModel.orElse(null);
        this.llmAvailable = this.chatModel != null;
        log.info("IntentParser initialized (LLM: {})", llmAvailable ? "enabled" : "disabled (using rules)");
    }

    /**
     * Parse a natural language query into a structured UserIntent.
     */
    public UserIntent parse(String query, String sessionId) {
        if (query == null || query.isBlank()) {
            throw new IllegalArgumentException("Query cannot be empty");
        }

        // Tier 1: Try LLM-based parsing
        if (llmAvailable) {
            try {
                return parseWithLLM(query, sessionId);
            } catch (Exception e) {
                log.warn("LLM intent parsing failed, falling back to rules: {}", e.getMessage());
            }
        }

        // Tier 2: Rule-based fallback
        return parseWithRules(query, sessionId);
    }

    /**
     * Tier 1: LLM-based parsing via LangChain4j (DeepSeek).
     * Uses a structured prompt to extract intent fields as JSON.
     */
    private UserIntent parseWithLLM(String query, String sessionId) {
        var prompt = """
                你是一个智能路线规划系统的意图解析器。请从用户的自然语言查询中提取以下结构化信息，以JSON格式返回（只返回JSON，不要其他文字）：

                用户查询: "%s"

                需要提取的字段：
                {
                  "city": "城市名（北京/上海/等，从查询推断）",
                  "district": "区域/商圈名（如三里屯、国贸、外滩，没有则null）",
                  "categories": ["类别数组，可选值: RESTAURANT/SHOPPING/ATTRACTION/ENTERTAINMENT/CULTURE"],
                  "cuisine": "菜系偏好（如日料、火锅、烤鸭，没有则null）",
                  "startTime": "开始时间（HH:MM格式，从上下文推断，默认14:00）",
                  "endTime": "结束时间（HH:MM格式，默认22:00）",
                  "budget": "预算上限（数字，没有则0）",
                  "partySize": "人数（数字，默认2）",
                  "minRating": "最低评分（数字，默认3.5）",
                  "maxQueue": "最长排队时间（分钟，不排队则填0，默认30）",
                  "travelMode": "出行方式（WALKING或DRIVING）",
                  "goal": "优化目标（BEST_EXPERIENCE/FASTEST/CHEAPEST）",
                  "keywords": ["关键词数组，如拍照好看、约会、亲子"],
                  "specialRequest": "特殊要求（如少走路、拍照好看，没有则null）"
                }

                注意：
                - "逛街""购物"→SHOPPING，"吃""美食""日料""火锅"→RESTAURANT，"电影""娱乐"→ENTERTAINMENT
                - "少走路"→travelMode=WALKING，"开车"→DRIVING
                - "省钱"→goal=CHEAPEST，"省时"→goal=FASTEST
                """.formatted(query);

        var json = chatModel.chat(prompt);

        // Parse the JSON response
        return parseLLMResponse(json, query, sessionId);
    }

    private UserIntent parseLLMResponse(String json, String originalQuery, String sessionId) {
        // Default values
        var city = "北京";
        String district = null;
        List<String> categories = new ArrayList<>();
        String cuisine = null;
        var startTime = LocalTime.of(14, 0);
        var endTime = LocalTime.of(22, 0);
        double budget = 0;
        int partySize = 2;
        double minRating = 3.5;
        int maxQueue = 30;
        var travelMode = "WALKING";
        var goal = "BEST_EXPERIENCE";
        List<String> keywords = new ArrayList<>();
        String specialRequest = null;

        try {
            // Basic JSON parsing without Jackson dependency conflicts
            json = json.replaceAll("(?s)^```json\\s*", "").replaceAll("(?s)\\s*```$", "");
            json = json.replaceAll("(?s)^```\\s*", "").replaceAll("(?s)\\s*```$", "");

            if (json.contains("\"city\"")) city = extractString(json, "city", city);
            if (json.contains("\"district\"")) district = extractStringOrNull(json, "district");
            if (json.contains("\"cuisine\"")) cuisine = extractStringOrNull(json, "cuisine");
            if (json.contains("\"startTime\"")) {
                var st = extractString(json, "startTime", "14:00");
                try { startTime = LocalTime.parse(st); } catch (Exception ignored) {}
            }
            if (json.contains("\"endTime\"")) {
                var et = extractString(json, "endTime", "22:00");
                try { endTime = LocalTime.parse(et); } catch (Exception ignored) {}
            }
            if (json.contains("\"budget\"")) budget = extractDouble(json, "budget", 0);
            if (json.contains("\"partySize\"")) partySize = (int) extractDouble(json, "partySize", 2);
            if (json.contains("\"minRating\"")) minRating = extractDouble(json, "minRating", 3.5);
            if (json.contains("\"maxQueue\"")) maxQueue = (int) extractDouble(json, "maxQueue", 30);
            if (json.contains("\"travelMode\"")) travelMode = extractString(json, "travelMode", "WALKING");
            if (json.contains("\"goal\"")) goal = extractString(json, "goal", "BEST_EXPERIENCE");
            if (json.contains("\"categories\"")) categories = extractArray(json, "categories");
            if (json.contains("\"keywords\"")) keywords = extractArray(json, "keywords");
            if (json.contains("\"specialRequest\"")) specialRequest = extractStringOrNull(json, "specialRequest");
        } catch (Exception e) {
            log.warn("Failed to parse LLM JSON response, falling back: {}", e.getMessage());
            return parseWithRules(originalQuery, sessionId);
        }

        return new UserIntent(originalQuery, city, district, categories, cuisine,
                startTime, endTime, budget, partySize, minRating,
                maxQueue, travelMode, goal, specialRequest, keywords, sessionId);
    }

    // ──────────────────────────────────────────────
    // Tier 2: Rule-based fallback
    // ──────────────────────────────────────────────

    private UserIntent parseWithRules(String query, String sessionId) {
        var city = detectCity(query);
        var district = detectDistrict(query);
        var categories = detectCategories(query);
        var cuisine = detectCuisine(query);
        var times = detectTimeRange(query);
        var budget = detectBudget(query);
        var minRating = detectRating(query);
        var maxQueue = detectQueueTolerance(query);
        var travelMode = detectTravelMode(query);
        var goal = detectGoal(query, categories);
        var keywords = extractKeywords(query);

        return new UserIntent(
                query, city, district, categories, cuisine,
                times[0], times[1], budget, 2, minRating,
                maxQueue, travelMode, goal, null, keywords, sessionId
        );
    }

    private String detectCity(String query) {
        if (query.contains("上海") || query.contains("外滩") || query.contains("陆家嘴")
                || query.contains("新天地") || query.contains("浦东")) return "上海";
        return "北京"; // default
    }

    private String detectDistrict(String query) {
        return DISTRICT_MAP.entrySet().stream()
                .filter(e -> query.contains(e.getKey()))
                .map(Map.Entry::getValue)
                .findFirst()
                .orElse(null);
    }

    private List<String> detectCategories(String query) {
        var cats = new LinkedHashSet<String>();
        CATEGORY_MAP.forEach((k, v) -> { if (query.contains(k)) cats.add(v); });
        if (cats.isEmpty() && (query.contains("去") || query.contains("到") || query.contains("逛"))) {
            cats.add("ATTRACTION");
            cats.add("RESTAURANT");
        }
        return new ArrayList<>(cats);
    }

    private String detectCuisine(String query) {
        var m = Pattern.compile("(日料|火锅|烤鸭|西餐|川菜|湘菜|云南菜|上海菜|北京菜|粤菜|咖啡|奶茶|甜品)").matcher(query);
        return m.find() ? m.group(1) : null;
    }

    private LocalTime[] detectTimeRange(String query) {
        var start = LocalTime.of(14, 0);
        var end = LocalTime.of(21, 0);
        for (var e : TIME_KEYWORDS.entrySet()) {
            if (query.contains(e.getKey())) {
                start = LocalTime.parse(e.getValue());
                break;
            }
        }
        if (start.isBefore(LocalTime.of(12, 0))) end = LocalTime.of(17, 0);
        else if (start.isBefore(LocalTime.of(17, 0))) end = LocalTime.of(22, 0);
        return new LocalTime[]{start, end};
    }

    private double detectBudget(String query) {
        var m = BUDGET_PATTERN.matcher(query);
        return m.find() ? Double.parseDouble(m.group(1)) : 0;
    }

    private double detectRating(String query) {
        var m = RATING_PATTERN.matcher(query);
        return m.find() ? Double.parseDouble(m.group(1)) : 3.5;
    }

    private int detectQueueTolerance(String query) {
        if (query.contains("不排队") || query.contains("少排队")) return 10;
        if (query.contains("快") || query.contains("效率")) return 15;
        return 30;
    }

    private String detectTravelMode(String query) {
        if (query.contains("开车") || query.contains("驾车") || query.contains("滴滴")) return "DRIVING";
        return "WALKING";
    }

    private String detectGoal(String query, List<String> categories) {
        if (query.contains("省钱") || query.contains("便宜")) return "CHEAPEST";
        if (query.contains("省时") || query.contains("快")) return "FASTEST";
        return "BEST_EXPERIENCE";
    }

    private List<String> extractKeywords(String query) {
        var kw = new ArrayList<String>();
        if (query.contains("拍照")) kw.add("拍照好看");
        if (query.contains("约会")) kw.add("约会");
        if (query.contains("亲子") || query.contains("带娃")) kw.add("亲子");
        if (query.contains("网红")) kw.add("网红");
        return kw;
    }

    // ──────────────────────────────────────────────
    // JSON 解析辅助
    // ──────────────────────────────────────────────

    private String extractString(String json, String key, String defaultValue) {
        var v = extractStringOrNull(json, key);
        return v != null ? v : defaultValue;
    }

    private String extractStringOrNull(String json, String key) {
        var p = "\"" + key + "\"\\s*:\\s*\"";
        var m = Pattern.compile(p + "(.*?)\"").matcher(json);
        if (m.find()) {
            var val = m.group(1).replace("\\\"", "\"").replace("\\n", "\n");
            return val.equals("null") ? null : val;
        }
        return null;
    }

    private double extractDouble(String json, String key, double defaultValue) {
        var p = Pattern.compile("\"" + key + "\"\\s*:\\s*([\\d.]+)");
        var m = p.matcher(json);
        return m.find() ? Double.parseDouble(m.group(1)) : defaultValue;
    }

    private List<String> extractArray(String json, String key) {
        var p = Pattern.compile("\"" + key + "\"\\s*:\\s*\\[(.*?)\\]");
        var m = p.matcher(json);
        if (m.find()) {
            var content = m.group(1);
            var items = new ArrayList<String>();
            var itemM = Pattern.compile("\"(.*?)\"").matcher(content);
            while (itemM.find()) items.add(itemM.group(1));
            return items;
        }
        return List.of();
    }
}
