import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../App';
import {api} from '../api/client';

type Props = NativeStackScreenProps<RootStackParamList, 'PlanResult'>;

export default function PlanResultScreen({route, navigation}: Props) {
  const {sessionId, routes, warning, recommendedRoute, explanation} =
    route.params;

  const [adjustment, setAdjustment] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [currentRoutes, setCurrentRoutes] = useState(routes);
  const [currentWarning, setCurrentWarning] = useState(warning);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  const handleAdjust = async () => {
    if (!adjustment.trim()) return;
    setAdjusting(true);
    setAdjustError(null);
    try {
      const result = await api.adjustRoute(sessionId, adjustment.trim());
      setCurrentRoutes(result.routes);
      setCurrentWarning(result.warning);
      setAdjustment('');
    } catch (e: any) {
      setAdjustError(e.message || '调整失败');
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {currentWarning && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>{currentWarning}</Text>
        </View>
      )}

      <View style={styles.adjustSection}>
        <TextInput
          style={styles.adjustInput}
          placeholder="调整路线，例如：换一家不排队的火锅"
          placeholderTextColor="#999"
          value={adjustment}
          onChangeText={setAdjustment}
        />
        <View style={styles.adjustActions}>
          <TouchableOpacity
            style={styles.adjustBtn}
            onPress={handleAdjust}
            disabled={adjusting || !adjustment.trim()}>
            {adjusting ? (
              <ActivityIndicator color="#333" size="small" />
            ) : (
              <Text style={styles.adjustBtnText}>调整路线</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.compareBtn}
            onPress={() => navigation.navigate('Compare', {sessionId})}>
            <Text style={styles.compareBtnText}>查看对比</Text>
          </TouchableOpacity>
        </View>
        {adjustError && (
          <Text style={styles.adjustError}>{adjustError}</Text>
        )}
      </View>

      {currentRoutes.map((route: any, idx: number) => (
        <View
          key={route.id || idx}
          style={[
            styles.routeCard,
            recommendedRoute &&
              route.id === recommendedRoute.id &&
              styles.recommendedCard,
          ]}>
          <View style={styles.routeHeader}>
            <Text style={styles.routeName}>
              {route.name || `方案 ${idx + 1}`}
            </Text>
            {route.optimizationGoal && (
              <View style={styles.goalBadge}>
                <Text style={styles.goalText}>{route.optimizationGoal}</Text>
              </View>
            )}
            {recommendedRoute && route.id === recommendedRoute.id && (
              <View style={styles.recBadge}>
                <Text style={styles.recText}>推荐</Text>
              </View>
            )}
          </View>

          {route.description && (
            <Text style={styles.routeDesc}>{route.description}</Text>
          )}

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {typeof route.totalCost === 'number'
                  ? `¥${route.totalCost.toFixed(0)}`
                  : '-'}
              </Text>
              <Text style={styles.statLabel}>费用</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {typeof route.totalTravelTime === 'number'
                  ? `${route.totalTravelTime.toFixed(0)}min`
                  : '-'}
              </Text>
              <Text style={styles.statLabel}>路程</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {typeof route.totalRating === 'number'
                  ? route.totalRating.toFixed(1)
                  : '-'}
              </Text>
              <Text style={styles.statLabel}>评分</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {route.segments ? route.segments.length : 0}
              </Text>
              <Text style={styles.statLabel}>地点</Text>
            </View>
          </View>

          {route.segments && route.segments.length > 0 && (
            <View style={styles.timeline}>
              {route.segments.map((seg: any, sIdx: number) => (
                <View key={sIdx} style={styles.timelineItem}>
                  <View style={styles.timelineDot} />
                  {sIdx < route.segments.length - 1 && (
                    <View style={styles.timelineLine} />
                  )}
                  <View style={styles.timelineContent}>
                    <Text style={styles.poiName}>{seg.poi?.name || '-'}</Text>
                    <Text style={styles.poiMeta}>
                      {seg.poi?.category || ''}
                      {seg.arrivalTime ? ` · ${seg.arrivalTime}` : ''}
                      {seg.travelMode ? ` · ${seg.travelMode}` : ''}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {explanation && idx === 0 && (
            <View style={styles.explanationBox}>
              <Text style={styles.explanationText}>{explanation}</Text>
            </View>
          )}
        </View>
      ))}

      {currentRoutes.length === 0 && (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>暂无路线方案</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F5F5F5'},
  content: {padding: 16, paddingBottom: 40},
  warningBox: {
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FFC107',
  },
  warningText: {color: '#795548', fontSize: 14},
  adjustSection: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  adjustInput: {
    fontSize: 15,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    minHeight: 44,
  },
  adjustActions: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 10,
  },
  adjustBtn: {
    backgroundColor: '#FFD100',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    flex: 1,
    alignItems: 'center',
  },
  adjustBtnText: {fontSize: 14, fontWeight: '600', color: '#333'},
  compareBtn: {
    backgroundColor: '#333',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    flex: 1,
    alignItems: 'center',
  },
  compareBtnText: {fontSize: 14, fontWeight: '600', color: '#FFF'},
  adjustError: {color: '#D32F2F', fontSize: 13, marginTop: 8},
  routeCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  recommendedCard: {borderWidth: 2, borderColor: '#FFD100'},
  routeHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 6},
  routeName: {fontSize: 18, fontWeight: 'bold', color: '#333', flex: 1},
  goalBadge: {
    backgroundColor: '#E3F2FD',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 6,
  },
  goalText: {fontSize: 11, color: '#1565C0'},
  recBadge: {
    backgroundColor: '#FFD100',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  recText: {fontSize: 11, fontWeight: 'bold', color: '#333'},
  routeDesc: {fontSize: 14, color: '#666', marginBottom: 10},
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F0F0F0',
    marginBottom: 12,
  },
  stat: {alignItems: 'center'},
  statValue: {fontSize: 18, fontWeight: 'bold', color: '#333'},
  statLabel: {fontSize: 12, color: '#999', marginTop: 2},
  timeline: {marginTop: 4},
  timelineItem: {flexDirection: 'row', marginBottom: 4},
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFD100',
    marginTop: 4,
    marginRight: 10,
  },
  timelineLine: {
    position: 'absolute',
    left: 4,
    top: 14,
    width: 2,
    height: '100%',
    backgroundColor: '#E0E0E0',
  },
  timelineContent: {flex: 1, paddingBottom: 12},
  poiName: {fontSize: 15, fontWeight: '600', color: '#333'},
  poiMeta: {fontSize: 13, color: '#888', marginTop: 2},
  explanationBox: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  explanationText: {fontSize: 14, color: '#555', lineHeight: 20},
  emptyBox: {alignItems: 'center', padding: 40},
  emptyText: {fontSize: 16, color: '#999'},
});
