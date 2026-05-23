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
                new POI("BJ001", "故宫博物院", "CULTURE", "博物馆",
                        39.9163, 116.3972, "东城区景山前街4号", "东城", "北京",
                        4.8, 60, 15, LocalTime.of(8, 30), LocalTime.of(17, 0), 180,
                        List.of("文化", "历史", "拍照", "必去"), "", "明清两代皇家宫殿", 98),
                new POI("BJ002", "三里屯太古里", "SHOPPING", "购物中心",
                        39.9330, 116.4550, "朝阳区三里屯路19号", "三里屯", "北京",
                        4.3, 200, 0, LocalTime.of(10, 0), LocalTime.of(22, 0), 120,
                        List.of("购物", "美食", "潮流", "拍照"), "", "时尚潮流地标", 90),
                new POI("BJ003", "鸟巢（国家体育场）", "ATTRACTION", "景点",
                        39.9900, 116.3910, "朝阳区国家体育场南路1号", "奥林匹克公园", "北京",
                        4.5, 50, 10, LocalTime.of(9, 0), LocalTime.of(21, 0), 90,
                        List.of("景点", "奥运", "拍照", "地标"), "", "2008年奥运会主体育场", 85),
                new POI("BJ004", "大董烤鸭店（三里屯店）", "RESTAURANT", "北京菜",
                        39.9335, 116.4530, "朝阳区三里屯路11号", "三里屯", "北京",
                        4.6, 350, 30, LocalTime.of(11, 0), LocalTime.of(21, 30), 90,
                        List.of("烤鸭", "北京菜", "高端", "排队"), "", "著名烤鸭店，环境优雅", 92),
                new POI("BJ005", "海底捞火锅（三里屯店）", "RESTAURANT", "火锅",
                        39.9340, 116.4540, "朝阳区三里屯路19号3层", "三里屯", "北京",
                        4.5, 180, 45, LocalTime.of(10, 0), LocalTime.of(23, 0), 90,
                        List.of("火锅", "服务好", "排队", "聚会"), "", "以极致服务闻名的火锅店", 88),
                new POI("BJ006", "颐和园", "ATTRACTION", "景点",
                        39.9990, 116.2750, "海淀区新建宫门路19号", "海淀", "北京",
                        4.7, 30, 10, LocalTime.of(6, 30), LocalTime.of(18, 0), 150,
                        List.of("皇家园林", "文化", "拍照", "历史"), "", "中国古典园林代表作", 95),
                new POI("BJ007", "南锣鼓巷", "SHOPPING", "步行街",
                        39.9370, 116.4040, "东城区南锣鼓巷", "东城", "北京",
                        4.2, 80, 0, LocalTime.of(9, 0), LocalTime.of(22, 0), 90,
                        List.of("小吃", "文艺", "胡同", "逛街"), "", "北京最古老的街区之一", 82),
                new POI("BJ008", "国家博物馆", "CULTURE", "博物馆",
                        39.9050, 116.3970, "东城区东长安街16号", "东城", "北京",
                        4.6, 0, 20, LocalTime.of(9, 0), LocalTime.of(17, 0), 180,
                        List.of("文化", "历史", "免费", "展览"), "", "中华文明瑰宝殿堂", 90),
                new POI("BJ009", "簋街", "RESTAURANT", "美食街",
                        39.9400, 116.4150, "东城区东直门内大街", "东城", "北京",
                        4.3, 120, 10, LocalTime.of(11, 0), LocalTime.of(4, 0), 120,
                        List.of("小龙虾", "夜市", "美食", "热闹"), "", "北京著名美食街", 86),
                new POI("BJ010", "798艺术区", "CULTURE", "艺术区",
                        39.9800, 116.4950, "朝阳区酒仙桥路4号", "酒仙桥", "北京",
                        4.4, 50, 0, LocalTime.of(10, 0), LocalTime.of(18, 0), 120,
                        List.of("艺术", "拍照", "文艺", "展览"), "", "当代艺术地标", 84),
                new POI("BJ011", "天坛公园", "ATTRACTION", "景点",
                        39.8820, 116.4070, "东城区天坛内东里7号", "东城", "北京",
                        4.7, 15, 0, LocalTime.of(6, 0), LocalTime.of(21, 0), 90,
                        List.of("历史", "文化", "拍照", "古迹"), "", "明清帝王祭天场所", 92),
                new POI("BJ012", "日料·九扇（三里屯店）", "RESTAURANT", "日本料理",
                        39.9332, 116.4535, "朝阳区三里屯路19号南区S4层", "三里屯", "北京",
                        4.5, 280, 20, LocalTime.of(11, 30), LocalTime.of(22, 0), 90,
                        List.of("日料", "刺身", "精致", "约会"), "", "高端日式料理，食材新鲜", 87),
                new POI("BJ013", "火烧云傣家菜（三里屯店）", "RESTAURANT", "云南菜",
                        39.9342, 116.4520, "朝阳区三里屯路19号3层", "三里屯", "北京",
                        4.6, 120, 35, LocalTime.of(11, 0), LocalTime.of(21, 30), 75,
                        List.of("云南菜", "网红", "排队", "酸辣"), "", "人气网红云南菜", 86),
                new POI("BJ014", "Blue Note Beijing", "ENTERTAINMENT", "爵士俱乐部",
                        39.9360, 116.4340, "东城区前门东大街23号", "东城", "北京",
                        4.5, 300, 0, LocalTime.of(18, 0), LocalTime.of(23, 59), 150,
                        List.of("爵士", "音乐", "约会", "酒吧"), "", "世界顶级爵士乐俱乐部", 83),
                new POI("BJ015", "国贸商城", "SHOPPING", "购物中心",
                        39.9080, 116.4620, "朝阳区建国门外大街1号", "国贸", "北京",
                        4.4, 350, 0, LocalTime.of(10, 0), LocalTime.of(21, 30), 120,
                        List.of("购物", "高端", "美食", "CBD"), "", "北京顶级购物中心", 88),
                new POI("BJ016", "花厨（国贸店）", "RESTAURANT", "西餐",
                        39.9090, 116.4610, "朝阳区国贸商城南区B1层", "国贸", "北京",
                        4.6, 220, 25, LocalTime.of(11, 0), LocalTime.of(21, 0), 75,
                        List.of("花艺", "西餐", "拍照好看", "约会"), "", "以花为主题的餐厅，颜值超高", 89),
                new POI("BJ017", "CGV影城（三里屯店）", "ENTERTAINMENT", "电影院",
                        39.9338, 116.4545, "朝阳区三里屯路19号6层", "三里屯", "北京",
                        4.3, 80, 10, LocalTime.of(9, 0), LocalTime.of(23, 59), 120,
                        List.of("电影", "约会", "娱乐"), "", "高品质影城", 80),
                new POI("BJ018", "四季民福烤鸭店", "RESTAURANT", "北京菜",
                        39.9140, 116.4120, "东城区王府井大街138号", "王府井", "北京",
                        4.7, 170, 40, LocalTime.of(10, 30), LocalTime.of(21, 30), 90,
                        List.of("烤鸭", "北京菜", "排队", "老字号"), "", "北京最受欢迎的烤鸭店之一", 93),
                new POI("BJ019", "北海公园", "ATTRACTION", "景点",
                        39.9260, 116.3890, "西城区文津街1号", "西城", "北京",
                        4.5, 10, 0, LocalTime.of(6, 30), LocalTime.of(20, 0), 90,
                        List.of("公园", "划船", "拍照", "历史"), "", "中国现存最古老、最完整的皇家园林", 85),
                new POI("BJ020", "Pageone书店（北京坊店）", "CULTURE", "书店",
                        39.8960, 116.3950, "西城区前门北京坊东区E1层", "前门", "北京",
                        4.5, 60, 0, LocalTime.of(10, 0), LocalTime.of(22, 0), 60,
                        List.of("书店", "文艺", "拍照", "安静"), "", "最美书店之一", 82),
                new POI("BJ021", "火烧云（国贸店）", "RESTAURANT", "云南菜",
                        39.9095, 116.4625, "朝阳区国贸商城B1层", "国贸", "北京",
                        4.5, 130, 30, LocalTime.of(11, 0), LocalTime.of(21, 0), 75,
                        List.of("云南菜", "网红", "酸辣", "下饭"), "", "国贸人气云南菜餐厅", 84),
                new POI("BJ022", "温野菜日本料理（国贸店）", "RESTAURANT", "日本料理",
                        39.9092, 116.4608, "朝阳区国贸商城北区4层", "国贸", "北京",
                        4.4, 200, 20, LocalTime.of(11, 0), LocalTime.of(22, 0), 90,
                        List.of("日料", "火锅", "自助", "寿喜烧"), "", "日式火锅自助", 85),
                new POI("BJ023", "侨福芳草地", "SHOPPING", "购物中心",
                        39.9170, 116.4450, "朝阳区东大桥路9号", "CBD", "北京",
                        4.5, 250, 0, LocalTime.of(10, 0), LocalTime.of(22, 0), 90,
                        List.of("艺术", "购物", "拍照", "设计"), "", "艺术与商业融合的购物中心", 87),
                new POI("BJ024", "老舍茶馆", "CULTURE", "茶馆",
                        39.8970, 116.3940, "西城区前门西大街正阳市场3号楼", "前门", "北京",
                        4.3, 150, 5, LocalTime.of(9, 0), LocalTime.of(22, 30), 90,
                        List.of("茶文化", "表演", "传统", "休闲"), "", "体验老北京茶文化的绝佳去处", 80)
        );
    }

    private List<POI> buildShanghaiPOIs() {
        return List.of(
                new POI("SH001", "外滩", "ATTRACTION", "景点",
                        31.2400, 121.4900, "黄浦区中山东一路", "外滩", "上海",
                        4.7, 0, 0, LocalTime.of(0, 0), LocalTime.of(23, 59), 60,
                        List.of("夜景", "拍照", "地标", "浪漫"), "", "上海城市名片", 97),
                new POI("SH002", "迪士尼乐园", "ENTERTAINMENT", "主题公园",
                        31.1440, 121.6570, "浦东新区川沙镇黄赵路310号", "浦东", "上海",
                        4.8, 499, 60, LocalTime.of(8, 30), LocalTime.of(21, 30), 480,
                        List.of("游乐园", "亲子", "童话", "热门"), "", "中国大陆首座迪士尼主题乐园", 99),
                new POI("SH003", "南京路步行街", "SHOPPING", "步行街",
                        31.2380, 121.4750, "黄浦区南京东路", "南京路", "上海",
                        4.3, 100, 0, LocalTime.of(10, 0), LocalTime.of(22, 0), 120,
                        List.of("购物", "美食", "繁华", "地标"), "", "中华第一商业街", 90),
                new POI("SH004", "新天地", "SHOPPING", "商业区",
                        31.2180, 121.4740, "黄浦区太仓路181弄", "新天地", "上海",
                        4.4, 200, 0, LocalTime.of(10, 0), LocalTime.of(23, 0), 90,
                        List.of("时尚", "酒吧", "餐饮", "拍照"), "", "上海时尚地标", 86),
                new POI("SH005", "鼎泰丰（新天地店）", "RESTAURANT", "台湾菜",
                        31.2185, 121.4735, "黄浦区兴业路123弄新天地南里6号", "新天地", "上海",
                        4.5, 180, 25, LocalTime.of(11, 0), LocalTime.of(21, 30), 60,
                        List.of("小笼包", "台湾菜", "米其林", "排队"), "", "米其林星级小笼包", 89),
                new POI("SH006", "东方明珠塔", "ATTRACTION", "景点",
                        31.2420, 121.5000, "浦东新区世纪大道1号", "陆家嘴", "上海",
                        4.5, 120, 30, LocalTime.of(8, 0), LocalTime.of(22, 0), 90,
                        List.of("地标", "夜景", "观景", "拍照"), "", "上海标志性建筑", 93),
                new POI("SH007", "豫园", "ATTRACTION", "景点",
                        31.2270, 121.4900, "黄浦区豫园老街279号", "城隍庙", "上海",
                        4.4, 30, 10, LocalTime.of(9, 0), LocalTime.of(17, 0), 90,
                        List.of("园林", "传统", "小吃", "文化"), "", "明代江南古典园林", 88),
                new POI("SH008", "Ultraviolet by Paul Pairet", "RESTAURANT", "西餐",
                        31.2200, 121.4700, "黄浦区中山东一路18号6层", "外滩", "上海",
                        4.8, 2500, 30, LocalTime.of(18, 0), LocalTime.of(23, 0), 240,
                        List.of("米其林三星", "高端", "沉浸式", "约会"), "", "世界顶级沉浸式用餐体验", 96),
                new POI("SH009", "M50创意园", "CULTURE", "艺术区",
                        31.2560, 121.4470, "普陀区莫干山路50号", "普陀", "上海",
                        4.3, 30, 0, LocalTime.of(10, 0), LocalTime.of(18, 0), 90,
                        List.of("艺术", "展览", "拍照", "文艺"), "", "上海当代艺术聚集地", 79),
                new POI("SH010", "上海博物馆", "CULTURE", "博物馆",
                        31.2300, 121.4740, "黄浦区人民大道201号", "人民广场", "上海",
                        4.6, 0, 15, LocalTime.of(9, 0), LocalTime.of(17, 0), 150,
                        List.of("文化", "历史", "免费", "展览"), "", "中国古代艺术博物馆", 91),
                new POI("SH011", "武康路", "ATTRACTION", "景点",
                        31.2110, 121.4370, "徐汇区武康路", "武康路", "上海",
                        4.5, 0, 0, LocalTime.of(0, 0), LocalTime.of(23, 59), 60,
                        List.of("拍照", "文艺", "历史建筑", "散步"), "", "上海最文艺的街道", 88),
                new POI("SH012", "梅龙镇酒家", "RESTAURANT", "上海菜",
                        31.2340, 121.4520, "静安区南京西路1081弄22号", "静安寺", "上海",
                        4.4, 200, 15, LocalTime.of(11, 0), LocalTime.of(21, 0), 75,
                        List.of("本帮菜", "老字号", "传统", "经典"), "", "1938年创立的老牌本帮菜", 85),
                new POI("SH013", "Flair Rooftop", "ENTERTAINMENT", "酒吧",
                        31.2410, 121.5000, "浦东新区世纪大道1号东方明珠塔", "陆家嘴", "上海",
                        4.4, 200, 10, LocalTime.of(17, 0), LocalTime.of(23, 59), 120,
                        List.of("酒吧", "夜景", "约会", "高端"), "", "魔都最美屋顶酒吧", 84),
                new POI("SH014", "前滩太古里", "SHOPPING", "购物中心",
                        31.1470, 121.4770, "浦东新区东育路500号", "前滩", "上海",
                        4.5, 250, 0, LocalTime.of(10, 0), LocalTime.of(22, 0), 120,
                        List.of("购物", "美食", "潮流", "拍照"), "", "Wellness主题高端商业体", 88),
                new POI("SH015", "田子坊", "SHOPPING", "创意园区",
                        31.2150, 121.4740, "黄浦区泰康路210弄", "打浦桥", "上海",
                        4.2, 80, 0, LocalTime.of(10, 0), LocalTime.of(22, 0), 90,
                        List.of("文艺", "小吃", "创意", "弄堂"), "", "上海石库门里弄改造的创意园区", 81),
                new POI("SH016", "鮨一日本料理", "RESTAURANT", "日本料理",
                        31.2415, 121.4890, "浦东新区世纪大道100号上海环球金融中心3层", "陆家嘴", "上海",
                        4.7, 800, 15, LocalTime.of(11, 30), LocalTime.of(22, 0), 120,
                        List.of("日料", "omakase", "高端", "精致"), "", "顶级江户前寿司", 90),
                new POI("SH017", "SHAKE SHACK（新天地店）", "RESTAURANT", "西餐",
                        31.2190, 121.4745, "黄浦区太仓路181弄新天地北里10号", "新天地", "上海",
                        4.3, 100, 20, LocalTime.of(11, 0), LocalTime.of(22, 0), 45,
                        List.of("汉堡", "快餐", "网红", "排队"), "", "纽约网红汉堡", 82),
                new POI("SH018", "TeamLab Borderless", "ENTERTAINMENT", "展览",
                        31.2320, 121.4810, "黄浦区花园港路100号", "黄浦", "上海",
                        4.6, 229, 20, LocalTime.of(10, 0), LocalTime.of(21, 0), 120,
                        List.of("沉浸式", "艺术", "拍照", "科技"), "", "全球知名数字艺术展", 91),
                new POI("SH019", "静安寺", "CULTURE", "寺庙",
                        31.2230, 121.4460, "静安区南京西路1686号", "静安寺", "上海",
                        4.5, 50, 5, LocalTime.of(7, 30), LocalTime.of(17, 0), 60,
                        List.of("寺庙", "历史", "祈福", "文化"), "", "上海最古老的佛寺之一", 86),
                new POI("SH020", "上海中心大厦", "ATTRACTION", "景点",
                        31.2350, 121.5010, "浦东新区银城中路501号", "陆家嘴", "上海",
                        4.6, 180, 25, LocalTime.of(9, 0), LocalTime.of(22, 0), 60,
                        List.of("观景", "地标", "拍照", "高楼"), "", "中国第一高楼，632米", 92)
        );
    }
}
