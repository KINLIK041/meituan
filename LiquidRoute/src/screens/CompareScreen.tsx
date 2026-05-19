import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../App';
import {api} from '../api/client';

type Props = NativeStackScreenProps<RootStackParamList, 'Compare'>;

export default function CompareScreen({route}: Props) {
  const {sessionId} = route.params;
  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState<any[]>([]);
  const [comparisonHtml, setComparisonHtml] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const result = await api.compareRoutes(sessionId);
        setRoutes(result.routes);
        setComparisonHtml(result.comparisonHtml);
      } catch (e: any) {
        setError(e.message || '加载对比失败');
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FFD100" />
        <Text style={styles.loadingText}>加载对比数据...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const bestScore = Math.max(
    ...routes.map(r => r.score ?? 0),
    0,
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>方案对比</Text>
      <Text style={styles.subtitle}>
        共 {routes.length} 个方案，按综合评分排序
      </Text>

      {routes.map((route: any, idx: number) => {
        const isBest = route.score === bestScore && bestScore > 0;
        return (
          <View key={route.id || idx} style={styles.routeCard}>
            <View style={styles.routeHeader}>
              <Text style={styles.routeName}>
                {route.name || `方案 ${idx + 1}`}
              </Text>
              {isBest && (
                <View style={styles.bestBadge}>
                  <Text style={styles.bestText}>最佳</Text>
                </View>
              )}
            </View>

            <View style={styles.scoreBar}>
              <View
                style={[
                  styles.scoreFill,
                  {width: `${Math.min((route.score ?? 0) * 10, 100)}%`},
                ]}
              />
              <Text style={styles.scoreText}>
                {typeof route.score === 'number'
                  ? route.score.toFixed(1)
                  : '-'}{' '}
                分
              </Text>
            </View>

            <View style={styles.metricsRow}>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>
                  ¥{(route.totalCost ?? 0).toFixed(0)}
                </Text>
                <Text style={styles.metricLabel}>总费用</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>
                  {(route.totalTravelTime ?? 0).toFixed(0)}min
                </Text>
                <Text style={styles.metricLabel}>总路程</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>
                  {(route.totalRating ?? 0).toFixed(1)}
                </Text>
                <Text style={styles.metricLabel}>评分</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>
                  {route.optimizationGoal || '-'}
                </Text>
                <Text style={styles.metricLabel}>优化目标</Text>
              </View>
            </View>

            {route.segments && (
              <View style={styles.segmentsList}>
                {route.segments.map((seg: any, sIdx: number) => (
                  <View key={sIdx} style={styles.segmentItem}>
                    <Text style={styles.segmentNum}>{sIdx + 1}</Text>
                    <View style={styles.segmentInfo}>
                      <Text style={styles.segmentName}>
                        {seg.poi?.name || '-'}
                      </Text>
                      <Text style={styles.segmentMeta}>
                        {seg.poi?.category || ''}
                        {seg.travelMode ? ` · ${seg.travelMode}` : ''}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F5F5F5'},
  content: {padding: 16, paddingBottom: 40},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  loadingText: {marginTop: 12, fontSize: 15, color: '#666'},
  errorText: {fontSize: 15, color: '#D32F2F'},
  title: {fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 4},
  subtitle: {fontSize: 14, color: '#666', marginBottom: 20},
  routeCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  routeName: {fontSize: 18, fontWeight: 'bold', color: '#333', flex: 1},
  bestBadge: {
    backgroundColor: '#FFD100',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  bestText: {fontSize: 12, fontWeight: 'bold', color: '#333'},
  scoreBar: {
    height: 28,
    backgroundColor: '#F0F0F0',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
    justifyContent: 'center',
  },
  scoreFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#FFD100',
    borderRadius: 6,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F0F0F0',
    marginBottom: 12,
  },
  metric: {alignItems: 'center'},
  metricValue: {fontSize: 16, fontWeight: 'bold', color: '#333'},
  metricLabel: {fontSize: 12, color: '#999', marginTop: 2},
  segmentsList: {marginTop: 4},
  segmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  segmentNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 13,
    fontWeight: 'bold',
    color: '#666',
    marginRight: 10,
  },
  segmentInfo: {flex: 1},
  segmentName: {fontSize: 14, fontWeight: '600', color: '#333'},
  segmentMeta: {fontSize: 12, color: '#888', marginTop: 1},
});
