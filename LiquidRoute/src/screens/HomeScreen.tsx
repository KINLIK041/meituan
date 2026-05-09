import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import InputBar from '../components/InputBar';
import { routeApi, mockData } from '../services/api';
import type { Route, PlanResponse } from '../types';
import { optimizationGoalLabels, optimizationGoalColors } from '../types';

interface HomeScreenProps {
  onNavigateToResult: (data: {
    plans: Route[];
    sessionId: string;
    explanation: string;
  }) => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigateToResult }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [useMock, setUseMock] = useState(true); // 默认 Mock 模式

  const handlePlan = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      Alert.alert('提示', '请输入路线需求');
      return;
    }

    setLoading(true);
    setLoadingMessage('正在计算最优路线...');

    try {
      let result: PlanResponse;

      if (useMock) {
        // 使用 Mock 模式判断输入
        if (trimmed.includes('火锅') || trimmed.includes('调整')) {
          result = await mockData.adjustRoute('mock_session', trimmed);
        } else {
          result = await mockData.planRoute(trimmed);
        }
      } else {
        result = await routeApi.planRoute(trimmed);
      }

      if (result.routes.length === 0) {
        Alert.alert('提示', result.warning || '无法生成路线方案');
        setLoading(false);
        return;
      }

      setLoading(false);
      onNavigateToResult({
        plans: result.routes,
        sessionId: result.sessionId,
        explanation: result.explanation,
      });
    } catch (err: any) {
      setLoading(false);
      Alert.alert('错误', err?.message || '网络请求失败，请检查后端是否启动');
    }
  }, [query, useMock, onNavigateToResult]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好';

  // 预设场景
  const presets = [
    { label: '三里屯逛街+日料', query: '周末下午去三里屯逛街然后吃日料' },
    { label: '情侣约会路线', query: '两人分别从天通苑和国贸出发，找中间的地方喝咖啡看电影' },
    { label: '调整方案', query: '日料换成评分4.5以上的火锅' },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>{loadingMessage}</Text>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setLoading(false)}
          >
            <Text style={styles.cancelText}>取消</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* 顶部栏 */}
      <View style={styles.topBar}>
        <Text style={styles.greeting}>{greeting} 🌤</Text>
        <TouchableOpacity
          style={styles.mockToggle}
          onPress={() => setUseMock(!useMock)}
        >
          <Text style={styles.mockToggleText}>
            {useMock ? 'Mock' : '在线'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* 场景预设 */}
        <Text style={styles.sectionTitle}>快速体验</Text>
        <View style={styles.presets}>
          {presets.map((p, i) => (
            <TouchableOpacity
              key={i}
              style={styles.presetChip}
              onPress={() => {
                setQuery(p.query);
              }}
            >
              <Text style={styles.presetText}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 功能说明 */}
        <View style={styles.featureSection}>
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>🗣️</Text>
            <Text style={styles.featureText}>自然语言输入，说你想怎么玩</Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>👫</Text>
            <Text style={styles.featureText}>多人不同起点，智能会合推荐</Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>🔄</Text>
            <Text style={styles.featureText}>实时调整，不满意随时改</Text>
          </View>
        </View>

        {/* 示例方案预览 */}
        <Text style={styles.sectionTitle}>推荐方案示例</Text>
        <SampleRouteCard
          goal="BEST_EXPERIENCE"
          label="体验优先"
          color="#8B5CF6"
          description="逛街 → 日料 → 电影"
          cost="¥460"
          duration="285分钟"
        />
        <SampleRouteCard
          goal="FASTEST"
          label="最省时"
          color="#3B82F6"
          description="咖啡 → 书店"
          cost="¥125"
          duration="95分钟"
        />
        <SampleRouteCard
          goal="CHEAPEST"
          label="最省钱"
          color="#10B981"
          description="咖啡 → 书店"
          cost="¥105"
          duration="95分钟"
        />
      </ScrollView>

      {/* 底部输入栏 */}
      <View style={styles.bottomBar}>
        <InputBar
          value={query}
          onChangeText={setQuery}
          onSubmit={handlePlan}
        />
        <TouchableOpacity style={styles.planButton} onPress={handlePlan}>
          <Text style={styles.planButtonText}>路线规划</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const SampleRouteCard: React.FC<{
  goal: string;
  label: string;
  color: string;
  description: string;
  cost: string;
  duration: string;
}> = ({ goal, label, color, description, cost, duration }) => (
  <View style={[sampleStyles.card, { borderLeftColor: color }]}>
    <View style={[sampleStyles.tag, { backgroundColor: color }]}>
      <Text style={sampleStyles.tagText}>{label}</Text>
    </View>
    <Text style={sampleStyles.desc}>{description}</Text>
    <View style={sampleStyles.meta}>
      <Text style={sampleStyles.metaText}>⏱ {duration}</Text>
      <Text style={sampleStyles.metaText}>💰 {cost}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 17,
    color: '#666',
  },
  cancelButton: {
    marginTop: 40,
    paddingHorizontal: 40,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 30,
  },
  cancelText: {
    fontSize: 16,
    color: '#888',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  mockToggle: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: 'rgba(139,92,246,0.1)',
    borderRadius: 20,
  },
  mockToggleText: {
    fontSize: 13,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    marginTop: 16,
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(139,92,246,0.08)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.15)',
  },
  presetText: {
    fontSize: 13,
    color: '#8B5CF6',
  },
  featureSection: {
    backgroundColor: 'rgba(139,92,246,0.05)',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  featureText: {
    fontSize: 15,
    color: '#555',
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
    gap: 10,
  },
  planButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  planButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});

const sampleStyles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 8,
  },
  tagText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  desc: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginBottom: 8,
  },
  meta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaText: {
    fontSize: 13,
    color: '#888',
  },
});

export default HomeScreen;
