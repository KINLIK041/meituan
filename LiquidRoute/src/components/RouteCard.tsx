import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import LiquidGlassCard from './LiquidGlassCard';
import type { Route, POI } from '../types';
import {
  optimizationGoalLabels,
  optimizationGoalColors,
  categoryIcons,
  transportModeIcons,
} from '../types';

interface RouteCardProps {
  route: Route;
  isSelected: boolean;
  onPress: () => void;
}

const RouteCard: React.FC<RouteCardProps> = ({ route, isSelected, onPress }) => {
  const goal = route.optimizationGoal as keyof typeof optimizationGoalLabels;
  const label = optimizationGoalLabels[goal] || goal;
  const color = optimizationGoalColors[goal] || '#8B5CF6';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <LiquidGlassCard
        style={[
          styles.card,
          isSelected && { borderColor: color, borderWidth: 2 },
        ]}
        tint={color}
        radius={24}
      >
        {/* 标签 */}
        <View style={[styles.tag, { backgroundColor: color }]}>
          <Text style={styles.tagText}>{label}</Text>
        </View>

        {/* POI 链 */}
        <View style={styles.poiChain}>
          {route.segments.map((seg, i) => (
            <React.Fragment key={seg.poi.id}>
              <View style={styles.poiNode}>
                <Text style={styles.poiIcon}>
                  {categoryIcons[seg.poi.category] || '📍'}
                </Text>
                <Text style={styles.poiName} numberOfLines={1}>
                  {seg.poi.name}
                </Text>
              </View>
              {i < route.segments.length - 1 && (
                <Text style={styles.arrow}>→</Text>
              )}
            </React.Fragment>
          ))}
        </View>

        {/* 概览信息 */}
        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Text style={styles.metaIcon}>⏱️</Text>
            <Text style={styles.metaText}>
              {Math.round(route.totalTravelTime)}分钟
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaIcon}>💰</Text>
            <Text style={styles.metaText}>¥{route.totalCost}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaIcon}>⭐</Text>
            <Text style={styles.metaText}>{route.totalRating.toFixed(1)}</Text>
          </View>
        </View>

        {/* POI 详情 */}
        {isSelected && (
          <View style={styles.poiDetails}>
            {route.segments.map((seg, i) => (
              <View key={seg.poi.id} style={styles.poiDetailRow}>
                <View style={styles.poiDetailHeader}>
                  <Text style={styles.poiDetailIcon}>
                    {categoryIcons[seg.poi.category] || '📍'}
                  </Text>
                  <Text style={styles.poiDetailName}>{seg.poi.name}</Text>
                  <Text style={styles.poiDetailRating}>
                    ⭐ {seg.poi.rating.toFixed(1)}
                  </Text>
                </View>
                <View style={styles.poiDetailInfo}>
                  {seg.poi.queueTime > 0 && (
                    <Text style={styles.poiDetailSub}>
                      排队约{seg.poi.queueTime}分钟
                    </Text>
                  )}
                  <Text style={styles.poiDetailSub}>
                    ¥{seg.poi.avgCost}/人 · ⏱{seg.poi.visitDuration}分钟
                  </Text>
                </View>
                {seg.travelTimeFromPrevious > 0 && (
                  <View style={styles.transportRow}>
                    <Text style={styles.transportIcon}>
                      {transportModeIcons[seg.travelMode] || '🚶'}
                    </Text>
                    <Text style={styles.transportText}>
                      {seg.travelMode === 'WALKING' ? '步行' : '驾车'}{' '}
                      {seg.travelTimeFromPrevious}分钟
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </LiquidGlassCard>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 320,
    marginRight: 16,
    borderColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
  },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  tagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  poiChain: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  poiNode: {
    alignItems: 'center',
    width: 80,
  },
  poiIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  poiName: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  arrow: {
    fontSize: 16,
    color: '#999',
    marginHorizontal: 4,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  poiDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  poiDetailRow: {
    marginBottom: 12,
  },
  poiDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  poiDetailIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  poiDetailName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  poiDetailRating: {
    fontSize: 13,
    color: '#F59E0B',
  },
  poiDetailInfo: {
    flexDirection: 'row',
    marginTop: 4,
    marginLeft: 24,
  },
  poiDetailSub: {
    fontSize: 12,
    color: '#888',
    marginRight: 12,
  },
  transportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 24,
    marginTop: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(139,92,246,0.08)',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  transportIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  transportText: {
    fontSize: 11,
    color: '#8B5CF6',
  },
});

export default RouteCard;
