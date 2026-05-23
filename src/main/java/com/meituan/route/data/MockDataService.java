package com.meituan.route.data;

import com.meituan.route.model.POI;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Mock data service with embedded Beijing and Shanghai POI data.
 * Activated when 'dianping' profile is NOT active.
 */
@Service
@ConditionalOnMissingBean(DianpingApiDataService.class)
public class MockDataService implements DataService {

    private final Map<String, List<POI>> poiByCity = new ConcurrentHashMap<>();
    private final Map<String, POI> poiById = new ConcurrentHashMap<>();

    public MockDataService() {
        initData();
    }

    private void initData() {
        var beijing = buildBeijingPOIs();
        var shanghai = buildShanghaiPOIs();
        poiByCity.put("北京", beijing);
        poiByCity.put("上海", shanghai);
        beijing.forEach(p -> poiById.put(p.id(), p));
        shanghai.forEach(p -> poiById.put(p.id(), p));
    }

    @Override
    public Flux<POI> searchByCategory(String city, String district, String category) {
        return Flux.fromStream(getStream(city, district))
                .filter(p -> p.matchesCategory(category));
    }

    @Override
    public Flux<POI> searchByKeyword(String city, String district, String keyword) {
        return Flux.fromStream(getStream(city, district))
                .filter(p -> p.name().contains(keyword)
                        || p.tags().stream().anyMatch(t -> t.contains(keyword))
                        || p.description().contains(keyword));
    }

    @Override
    public Flux<POI> searchWithinBudget(String city, String district, double maxCost) {
        return Flux.fromStream(getStream(city, district))
                .filter(p -> p.avgCost() <= maxCost);
    }

    @Override
    public Mono<POI> findById(String id) {
        return Mono.justOrEmpty(poiById.get(id));
    }

    @Override
    public Flux<POI> getAllByCity(String city) {
        return Flux.fromIterable(poiByCity.getOrDefault(city, List.of()));
    }

    @Override
    public Flux<POI> getByDistrict(String city, String district) {
        return Flux.fromIterable(
                poiByCity.getOrDefault(city, List.of()).stream()
                        .filter(p -> p.district().equals(district))
                        .toList()
        );
    }

    @Override
    public List<String> getAvailableCities() {
        return List.copyOf(poiByCity.keySet());
    }

    @Override
    public List<String> getAvailableDistricts(String city) {
        return poiByCity.getOrDefault(city, List.of()).stream()
                .map(POI::district)
                .distinct()
                .toList();
    }

    private Stream<POI> getStream(String city, String district) {
        Stream<POI> stream = poiByCity.getOrDefault(city, List.of()).stream();
        if (district != null && !district.isBlank()) {
            stream = stream.filter(p -> p.district().contains(district) || district.contains(p.district()));
        }
        return stream;
    }

    private List<POI> buildBeijingPOIs() {
        return List.of(
                // ── 展览/文化 ──
                new POI("p-chenxi", "城东微展厅 · 当代城市影像", "CULTURE", "展览",
                        39.9325, 116.4600, "朝阳区团结湖北路3号", "团结湖", "北京",
                        4.7, 30, 0, LocalTime.of(10, 0), LocalTime.of(19, 0), 90,
                        List.of("出片好看", "适合拍照", "人不多", "安静"), "images/stores/chenxi-exhibition-1.jpg", "离地铁口8分钟，展厅不大，出片好看不挤", 88),
                new POI("p-798", "798 艺术街区", "CULTURE", "街区/展览",
                        39.9840, 116.4950, "朝阳区酒仙桥路4号", "酒仙桥", "北京",
                        4.6, 0, 0, LocalTime.of(0, 0), LocalTime.of(23, 59), 120,
                        List.of("出片好看", "网红打卡", "艺术氛围"), "images/stores/798-art-district-1.jpg", "几百个画廊和艺术空间，随手拍都是大片", 90),
                new POI("p-westfilm", "城西胶片小展", "CULTURE", "展览",
                        39.9100, 116.3200, "海淀区中关村大街42号", "海淀", "北京",
                        4.5, 45, 0, LocalTime.of(10, 0), LocalTime.of(18, 0), 60,
                        List.of("出片好看", "文艺", "安静"), "images/stores/west-film-exhibition-1.jpg", "小众胶片摄影展，光线柔和，适合安静约会", 78),
                new POI("p-cityex", "城市互动科技展", "CULTURE", "展览",
                        39.9200, 116.4700, "朝阳区光华路9号", "国贸", "北京",
                        4.7, 80, 0, LocalTime.of(9, 30), LocalTime.of(17, 30), 120,
                        List.of("互动体验", "亲子友好", "科技感"), "images/stores/city-interactive-exhibition-1.jpg", "沉浸式互动展览，孩子能专注玩2小时以上", 86),

                // ── 餐厅/烤肉 ──
                new POI("p-shanye", "山野炭火烤肉（团结湖店）", "RESTAURANT", "烤肉",
                        39.9270, 116.4655, "朝阳区团结湖南路12号", "团结湖", "北京",
                        4.6, 95, 15, LocalTime.of(11, 30), LocalTime.of(22, 30), 90,
                        List.of("适合朋友聚会", "分量足", "离地铁近"), "images/stores/shanye-kaorou-1.jpg", "人均95，靠近地铁口，分量足、适合一群人吃", 89),

                // ── 咖啡/甜品 ──
                new POI("p-mandao", "慢岛 · 甜品咖啡", "RESTAURANT", "咖啡/甜品",
                        39.9310, 116.4625, "朝阳区团结湖东街5号", "团结湖", "北京",
                        4.8, 38, 0, LocalTime.of(11, 0), LocalTime.of(22, 0), 60,
                        List.of("适合聊天", "环境安静", "出片好看", "甜品好吃"), "images/stores/mandao-dessert-1.jpg", "吃完走6分钟就到，环境安静，提拉米苏最受欢迎", 90),
                new POI("p-duyi", "独椅咖啡", "RESTAURANT", "咖啡",
                        39.9350, 116.4550, "东城区东四北大街22号", "东城", "北京",
                        4.6, 35, 0, LocalTime.of(9, 0), LocalTime.of(22, 0), 90,
                        List.of("安静", "适合发呆", "不催台", "咖啡好喝"), "images/stores/duyi-coffee-1.jpg", "一个人的角落，不催台，可以从下午坐到傍晚", 82),
                new POI("p-rainynight", "雨夜咖啡 · 窗边位", "RESTAURANT", "咖啡",
                        39.9050, 116.3350, "海淀区成府路28号", "海淀", "北京",
                        4.7, 48, 0, LocalTime.of(10, 0), LocalTime.of(23, 0), 75,
                        List.of("安静", "适合聊天", "夜景好看", "出片好看"), "images/stores/rainy-night-cafe-1.jpg", "窗边位看城市夜景，氛围感满分", 88),
                new POI("p-cornerbakery", "街角面包房", "RESTAURANT", "面包/简餐",
                        39.9380, 116.4400, "东城区鼓楼东大街18号", "东城", "北京",
                        4.5, 25, 0, LocalTime.of(7, 0), LocalTime.of(21, 0), 30,
                        List.of("面包好吃", "价格实惠", "可外带"), "images/stores/corner-bakery-1.jpg", "刚出炉的可颂配一杯美式，微散步的完美收尾", 76),
                new POI("p-gebi", "隔壁书店 · 咖啡角", "CULTURE", "书店/咖啡",
                        39.9290, 116.4500, "朝阳区团结湖北二条6号", "团结湖", "北京",
                        4.5, 30, 0, LocalTime.of(10, 0), LocalTime.of(21, 0), 90,
                        List.of("安静", "可以看书", "人少"), "images/stores/gebi-bookstore-cafe-1.jpg", "藏在居民区里的小书店，有座不吵", 80),
                new POI("p-riverside", "河边书店 · 咖啡", "CULTURE", "书店/咖啡",
                        39.9150, 116.3850, "东城区安定门内大街35号", "安定门", "北京",
                        4.6, 35, 0, LocalTime.of(9, 0), LocalTime.of(22, 0), 90,
                        List.of("安静", "河边风景", "适合拍照", "约会"), "images/stores/riverside-bookstore-cafe-1.jpg", "坐在河边看书喝咖啡，慢节奏约会的理想场景", 84),
                new POI("p-chaincafe", "街角连锁咖啡", "RESTAURANT", "咖啡",
                        39.9080, 116.4100, "东城区东直门外大街12号", "东直门", "北京",
                        4.3, 28, 0, LocalTime.of(7, 0), LocalTime.of(22, 0), 30,
                        List.of("有座", "近", "出餐快"), "images/stores/corner-chain-cafe-1.jpg", "走3分钟到，几乎一定有座，能讲事能等人", 75),

                // ── 公园/户外 ──
                new POI("p-tuanjiehu", "团结湖公园", "ATTRACTION", "公园",
                        39.9280, 116.4670, "朝阳区团结湖南里16号", "团结湖", "北京",
                        4.5, 0, 0, LocalTime.of(6, 0), LocalTime.of(22, 0), 60,
                        List.of("免费", "安静", "散步", "湖边"), "images/stores/tuanjiehu-park-1.jpg", "市中心免费公园，湖边长椅，节奏松散适合慢慢聊", 85),
                new POI("p-gardenpark", "园林公园", "ATTRACTION", "公园",
                        39.9200, 116.4000, "东城区地坛公园东侧", "东城", "北京",
                        4.6, 5, 0, LocalTime.of(6, 0), LocalTime.of(21, 0), 60,
                        List.of("安静", "园林景致", "散步", "出片好看"), "images/stores/garden-park-1.jpg", "一步一景的古典园林，两个人慢慢走慢慢聊", 83),
                new POI("p-communitypark", "社区公园", "ATTRACTION", "公园",
                        39.9350, 116.4850, "朝阳区惠新西街北口附近", "惠新西街", "北京",
                        4.3, 0, 0, LocalTime.of(0, 0), LocalTime.of(23, 59), 45,
                        List.of("免费", "近", "有滑梯", "有沙坑"), "images/stores/community-park-1.jpg", "便宜、放电、就近吃饭，孩子状态崩了能很快回家", 78),
                new POI("p-canal", "运河步道", "ATTRACTION", "散步",
                        39.9500, 116.4200, "朝阳区亮马河沿岸", "亮马河", "北京",
                        4.4, 0, 0, LocalTime.of(0, 0), LocalTime.of(23, 59), 45,
                        List.of("免费", "散步", "安静", "河边"), "images/stores/canal-walkway-1.jpg", "想动一动但不想很累：走一段河边步道，吃点东西，回家", 80),

                // ── 面馆/简餐 ──
                new POI("p-mowu", "蘑屋 · 拍照面馆", "RESTAURANT", "面食",
                        39.9800, 116.4880, "朝阳区酒仙桥路10号", "酒仙桥", "北京",
                        4.5, 42, 0, LocalTime.of(11, 0), LocalTime.of(21, 0), 45,
                        List.of("出片好看", "面好吃", "有意思"), "images/stores/mowu-noodle-1.jpg", "蘑菇主题面馆，店内布置很出片，吃完还能拍一组", 81),
                new POI("p-jiekou", "街口面馆", "RESTAURANT", "面食",
                        39.9220, 116.4100, "东城区安定门内大街88号", "安定门", "北京",
                        4.4, 30, 0, LocalTime.of(10, 30), LocalTime.of(21, 0), 30,
                        List.of("实惠", "快", "面好吃"), "images/stores/jiekou-noodle-1.jpg", "一碗热面十几块，快进快出不耽误，邻里老店", 78),
                new POI("p-laozhang", "老张牛肉面", "RESTAURANT", "面食",
                        39.9250, 116.4350, "朝阳区东大桥路45号", "东大桥", "北京",
                        4.5, 40, 0, LocalTime.of(10, 0), LocalTime.of(21, 30), 30,
                        List.of("上菜快", "牛肉多", "热乎", "不用等位"), "images/stores/laozhang-noodle-1.jpg", "不用等位，10分钟上桌，一碗热面直接回家", 82),
                new POI("p-linjia", "邻家厨房", "RESTAURANT", "简餐",
                        39.9330, 116.4800, "朝阳区惠新东街7号", "惠新西街", "北京",
                        4.3, 45, 0, LocalTime.of(11, 0), LocalTime.of(20, 30), 45,
                        List.of("家常菜", "适合孩子", "不辣"), "images/stores/linjia-kitchen-1.jpg", "家常口味，有儿童餐，吃完就能回家午睡", 77),
                new POI("p-excafe", "展厅旁的简餐", "RESTAURANT", "简餐",
                        39.9180, 116.4720, "朝阳区光华路11号", "国贸", "北京",
                        4.2, 55, 0, LocalTime.of(9, 0), LocalTime.of(18, 0), 45,
                        List.of("方便", "适合孩子", "近"), "images/stores/exhibition-cafe-1.jpg", "就在展厅隔壁，看完展就能吃，不用折腾", 74),
                new POI("p-canteen", "隔壁便民食堂", "RESTAURANT", "简餐",
                        39.9370, 116.4870, "朝阳区惠新西街3号院", "惠新西街", "北京",
                        4.2, 20, 0, LocalTime.of(7, 0), LocalTime.of(20, 0), 30,
                        List.of("便宜", "快", "近"), "images/stores/community-canteen-1.jpg", "便宜实惠，吃完继续户外活动，不耽误时间", 72),

                // ── 正餐 ──
                new POI("p-yuxiaoguan", "渔小馆家常菜", "RESTAURANT", "小馆",
                        39.9300, 116.4550, "朝阳区团结湖北头条8号", "团结湖", "北京",
                        4.4, 55, 0, LocalTime.of(11, 0), LocalTime.of(21, 30), 60,
                        List.of("实惠", "家常口味", "不用等位", "安静"), "images/stores/yuxiaoguan-1.jpg", "人均50出头，几乎不排队，邻里小馆的踏实感", 81),
                new POI("p-xiangli", "巷里小馆 · 双人位", "RESTAURANT", "私房菜",
                        39.9150, 116.4300, "东城区朝阳门内大街23号", "朝阳门", "北京",
                        4.7, 140, 0, LocalTime.of(11, 30), LocalTime.of(22, 0), 90,
                        List.of("安静", "双人位", "私密", "出品好"), "images/stores/xiangli-bistro-1.jpg", "两人位提前订好，安静私密，出品稳当", 87),
                new POI("p-cornerfrench", "街角法餐 · 露台", "RESTAURANT", "法餐",
                        39.9120, 116.3250, "海淀区学院路15号", "海淀", "北京",
                        4.6, 200, 0, LocalTime.of(11, 30), LocalTime.of(23, 0), 90,
                        List.of("露台", "出片好看", "约会", "氛围好"), "images/stores/corner-french-1.jpg", "露台位的傍晚光线最好，配一杯红酒，约会氛围满分", 85),

                // ── 酒吧 ──
                new POI("p-blueroof", "蓝色屋顶酒吧", "ENTERTAINMENT", "酒吧",
                        39.9080, 116.3300, "海淀区五道口地铁站旁", "五道口", "北京",
                        4.5, 110, 0, LocalTime.of(18, 0), LocalTime.of(2, 0), 90,
                        List.of("夜景", "露台", "鸡尾酒", "出片好看"), "images/stores/blue-rooftop-bar-1.jpg", "俯瞰城市夜景，一杯特调收尾", 83),
                new POI("p-miya", "居酒屋 · 味屋", "RESTAURANT", "居酒屋",
                        39.9200, 116.4450, "东城区东直门内大街55号", "东直门", "北京",
                        4.5, 95, 15, LocalTime.of(17, 30), LocalTime.of(23, 30), 75,
                        List.of("安静", "日式", "适合一人", "有吧台位"), "images/stores/izakaya-miya-1.jpg", "能吃一点喝一口，安静不吵，适合放松神经", 82),

                // ── 观景 ──
                new POI("p-cityview", "城市观景平台", "ATTRACTION", "观景",
                        39.9080, 116.4600, "朝阳区建国门外大街1号", "国贸", "北京",
                        4.6, 60, 0, LocalTime.of(10, 0), LocalTime.of(21, 30), 45,
                        List.of("夜景", "俯瞰城市", "出片好看", "约会"), "images/stores/city-view-terrace-1.jpg", "市中心高楼观景，傍晚上去看日落，接着看夜景", 86),

                // ── 书店/阅读 ──
                new POI("p-xiaoyuan", "小院图书馆", "CULTURE", "书店",
                        39.9380, 116.4050, "东城区北锣鼓巷61号", "东城", "北京",
                        4.6, 25, 0, LocalTime.of(10, 0), LocalTime.of(20, 0), 90,
                        List.of("安静", "有院子", "可久坐", "文艺"), "images/stores/xiaoyuan-library-1.jpg", "藏在胡同里，有院子和猫，可以坐一下午", 83),
                new POI("p-minibook", "迷你绘本角", "CULTURE", "书店",
                        39.9300, 116.4750, "朝阳区光华路甲8号", "国贸", "北京",
                        4.5, 30, 0, LocalTime.of(9, 30), LocalTime.of(19, 0), 45,
                        List.of("亲子友好", "有绘本", "安静", "有儿童区"), "images/stores/mini-book-corner-1.jpg", "有几百本绘本，孩子能安静翻半小时", 79),

                // ── 游乐 ──
                new POI("p-kids", "亲子室内乐园", "ENTERTAINMENT", "游乐",
                        39.9320, 116.4780, "朝阳区惠新东街18号", "惠新西街", "北京",
                        4.5, 90, 0, LocalTime.of(9, 30), LocalTime.of(20, 0), 120,
                        List.of("室内", "安全", "有波波池", "亲子友好"), "images/stores/kids-indoor-park-1.jpg", "波波池+攀爬架+沙池，孩子能玩2小时", 84),

                // ── 公共空间 ──
                new POI("p-librarylobby", "社区图书馆门厅", "CULTURE", "公共空间",
                        39.9100, 116.4150, "东城区东四南大街15号", "东城", "北京",
                        4.3, 0, 0, LocalTime.of(9, 0), LocalTime.of(21, 0), 60,
                        List.of("免费", "安静", "有座"), "images/stores/library-lobby-1.jpg", "绝对安静，适合等人、讲重要的事，免费有座", 74),
                new POI("p-convenience", "便利店休息区", "SHOPPING", "便利店",
                        39.9070, 116.4080, "东城区东直门外大街8号", "东直门", "北京",
                        4.1, 12, 0, LocalTime.of(0, 0), LocalTime.of(23, 59), 15,
                        List.of("24小时", "有座", "近"), "images/stores/convenience-rest-1.jpg", "几乎不用走路，有座位，顺手买水或小吃", 70)
        );
    }

    private List<POI> buildShanghaiPOIs() {
        return List.of(
                new POI("SH001", "外滩", "ATTRACTION", "景点",
                        31.2400, 121.4900, "黄浦区中山东一路", "外滩", "上海",
                        4.7, 0, 0, LocalTime.of(0, 0), LocalTime.of(23, 59), 60,
                        List.of("夜景", "拍照", "地标", "浪漫"), "images/stores/the-bund-1.jpg", "上海城市名片", 97),
                new POI("SH002", "迪士尼乐园", "ENTERTAINMENT", "主题公园",
                        31.1440, 121.6570, "浦东新区川沙镇黄赵路310号", "浦东", "上海",
                        4.8, 499, 60, LocalTime.of(8, 30), LocalTime.of(21, 30), 480,
                        List.of("游乐园", "亲子", "童话", "热门"), "images/stores/disneyland-1.jpg", "中国大陆首座迪士尼主题乐园", 99),
                new POI("SH003", "南京路步行街", "SHOPPING", "步行街",
                        31.2380, 121.4750, "黄浦区南京东路", "南京路", "上海",
                        4.3, 100, 0, LocalTime.of(10, 0), LocalTime.of(22, 0), 120,
                        List.of("购物", "美食", "繁华", "地标"), "images/stores/nanjing-road-1.jpg", "中华第一商业街", 90),
                new POI("SH004", "新天地", "SHOPPING", "商业区",
                        31.2180, 121.4740, "黄浦区太仓路181弄", "新天地", "上海",
                        4.4, 200, 0, LocalTime.of(10, 0), LocalTime.of(23, 0), 90,
                        List.of("时尚", "酒吧", "餐饮", "拍照"), "images/stores/xintiandi-1.jpg", "上海时尚地标", 86),
                new POI("SH005", "鼎泰丰（新天地店）", "RESTAURANT", "台湾菜",
                        31.2185, 121.4735, "黄浦区兴业路123弄新天地南里6号", "新天地", "上海",
                        4.5, 180, 25, LocalTime.of(11, 0), LocalTime.of(21, 30), 60,
                        List.of("小笼包", "台湾菜", "米其林", "排队"), "images/stores/dintaifung-1.jpg", "米其林星级小笼包", 89),
                new POI("SH006", "东方明珠塔", "ATTRACTION", "景点",
                        31.2420, 121.5000, "浦东新区世纪大道1号", "陆家嘴", "上海",
                        4.5, 120, 30, LocalTime.of(8, 0), LocalTime.of(22, 0), 90,
                        List.of("地标", "夜景", "观景", "拍照"), "images/stores/oriental-pearl-1.jpg", "上海标志性建筑", 93),
                new POI("SH007", "豫园", "ATTRACTION", "景点",
                        31.2270, 121.4900, "黄浦区豫园老街279号", "城隍庙", "上海",
                        4.4, 30, 10, LocalTime.of(9, 0), LocalTime.of(17, 0), 90,
                        List.of("园林", "传统", "小吃", "文化"), "images/stores/yuyuan-garden-1.jpg", "明代江南古典园林", 88),
                new POI("SH008", "Ultraviolet by Paul Pairet", "RESTAURANT", "西餐",
                        31.2200, 121.4700, "黄浦区中山东一路18号6层", "外滩", "上海",
                        4.8, 2500, 30, LocalTime.of(18, 0), LocalTime.of(23, 0), 240,
                        List.of("米其林三星", "高端", "沉浸式", "约会"), "images/stores/ultraviolet-1.jpg", "世界顶级沉浸式用餐体验", 96),
                new POI("SH009", "M50创意园", "CULTURE", "艺术区",
                        31.2560, 121.4470, "普陀区莫干山路50号", "普陀", "上海",
                        4.3, 30, 0, LocalTime.of(10, 0), LocalTime.of(18, 0), 90,
                        List.of("艺术", "展览", "拍照", "文艺"), "images/stores/m50-creative-1.jpg", "上海当代艺术聚集地", 79),
                new POI("SH010", "上海博物馆", "CULTURE", "博物馆",
                        31.2300, 121.4740, "黄浦区人民大道201号", "人民广场", "上海",
                        4.6, 0, 15, LocalTime.of(9, 0), LocalTime.of(17, 0), 150,
                        List.of("文化", "历史", "免费", "展览"), "images/stores/shanghai-museum-1.jpg", "中国古代艺术博物馆", 91),
                new POI("SH011", "武康路", "ATTRACTION", "景点",
                        31.2110, 121.4370, "徐汇区武康路", "武康路", "上海",
                        4.5, 0, 0, LocalTime.of(0, 0), LocalTime.of(23, 59), 60,
                        List.of("拍照", "文艺", "历史建筑", "散步"), "images/stores/wukang-road-1.jpg", "上海最文艺的街道", 88),
                new POI("SH012", "梅龙镇酒家", "RESTAURANT", "上海菜",
                        31.2340, 121.4520, "静安区南京西路1081弄22号", "静安寺", "上海",
                        4.4, 200, 15, LocalTime.of(11, 0), LocalTime.of(21, 0), 75,
                        List.of("本帮菜", "老字号", "传统", "经典"), "images/stores/meilongzhen-1.jpg", "1938年创立的老牌本帮菜", 85),
                new POI("SH013", "Flair Rooftop", "ENTERTAINMENT", "酒吧",
                        31.2410, 121.5000, "浦东新区世纪大道1号东方明珠塔", "陆家嘴", "上海",
                        4.4, 200, 10, LocalTime.of(17, 0), LocalTime.of(23, 59), 120,
                        List.of("酒吧", "夜景", "约会", "高端"), "images/stores/flair-rooftop-1.jpg", "魔都最美屋顶酒吧", 84),
                new POI("SH014", "前滩太古里", "SHOPPING", "购物中心",
                        31.1470, 121.4770, "浦东新区东育路500号", "前滩", "上海",
                        4.5, 250, 0, LocalTime.of(10, 0), LocalTime.of(22, 0), 120,
                        List.of("购物", "美食", "潮流", "拍照"), "images/stores/qiantan-taikoo-1.jpg", "Wellness主题高端商业体", 88),
                new POI("SH015", "田子坊", "SHOPPING", "创意园区",
                        31.2150, 121.4740, "黄浦区泰康路210弄", "打浦桥", "上海",
                        4.2, 80, 0, LocalTime.of(10, 0), LocalTime.of(22, 0), 90,
                        List.of("文艺", "小吃", "创意", "弄堂"), "images/stores/tianzifang-1.jpg", "上海石库门里弄改造的创意园区", 81),
                new POI("SH016", "鮨一日本料理", "RESTAURANT", "日本料理",
                        31.2415, 121.4890, "浦东新区世纪大道100号上海环球金融中心3层", "陆家嘴", "上海",
                        4.7, 800, 15, LocalTime.of(11, 30), LocalTime.of(22, 0), 120,
                        List.of("日料", "omakase", "高端", "精致"), "images/stores/sushi-yi-1.jpg", "顶级江户前寿司", 90),
                new POI("SH017", "SHAKE SHACK（新天地店）", "RESTAURANT", "西餐",
                        31.2190, 121.4745, "黄浦区太仓路181弄新天地北里10号", "新天地", "上海",
                        4.3, 100, 20, LocalTime.of(11, 0), LocalTime.of(22, 0), 45,
                        List.of("汉堡", "快餐", "网红", "排队"), "images/stores/shake-shack-1.jpg", "纽约网红汉堡", 82),
                new POI("SH018", "TeamLab Borderless", "ENTERTAINMENT", "展览",
                        31.2320, 121.4810, "黄浦区花园港路100号", "黄浦", "上海",
                        4.6, 229, 20, LocalTime.of(10, 0), LocalTime.of(21, 0), 120,
                        List.of("沉浸式", "艺术", "拍照", "科技"), "images/stores/teamlab-1.jpg", "全球知名数字艺术展", 91),
                new POI("SH019", "静安寺", "CULTURE", "寺庙",
                        31.2230, 121.4460, "静安区南京西路1686号", "静安寺", "上海",
                        4.5, 50, 5, LocalTime.of(7, 30), LocalTime.of(17, 0), 60,
                        List.of("寺庙", "历史", "祈福", "文化"), "images/stores/jingan-temple-1.jpg", "上海最古老的佛寺之一", 86),
                new POI("SH020", "上海中心大厦", "ATTRACTION", "景点",
                        31.2350, 121.5010, "浦东新区银城中路501号", "陆家嘴", "上海",
                        4.6, 180, 25, LocalTime.of(9, 0), LocalTime.of(22, 0), 60,
                        List.of("观景", "地标", "拍照", "高楼"), "images/stores/shanghai-tower-1.jpg", "中国第一高楼，632米", 92)
        );
    }
}
