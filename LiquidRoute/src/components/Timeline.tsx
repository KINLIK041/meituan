import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import type { Route, RouteSegment } from '../types';
import { categoryIcons, transportModeIcons } from '../types';
import RouteMap from './RouteMap';

interface TimelineProps {
  route: Route;
}

const Timeline: React.FC<TimelineProps> = ({ route }) => {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{route.name}</Text>
      <Text style={styles.subtitle}>{route.description}</Text>

      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>总时长</Text>
          <Text style={styles.summaryValue}>
            {Math.round(route.totalTravelTime)}分钟
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>总花费</Text>
          <Text style={styles.summaryValue}>¥{route.totalCost}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>评分</Text>
          <Text style={styles.summaryValue}>
            ⭐ {route.totalRating.toFixed(1)}
          </Text>
        </View>
      </View>

      {/* 路线地图 */}
      <View style={styles.mapWrapper}>
        <RouteMap route={route} interactive />
      </View>

      {route.segments.map((seg, index) => (
        <React.Fragment key={seg.poi.id}>
          {/* 交通段 */}
          {seg.travelTimeFromPrevious > 0 && (
            <TransportSegment
              travelMode={seg.travelMode}
              duration={seg.travelTimeFromPrevious}
            />
          )}

          {/* POI 时间线节点 */}
          <TimelineNode
            segment={seg}
            isFirst={index === 0}
            isLast={index === route.segments.length - 1}
          />
        </React.Fragment>
      ))}
    </ScrollView>
  );
};

const TimelineNode: React.FC<{
  segment: RouteSegment;
  isFirst: boolean;
  isLast: boolean;
}> = ({ segment, isFirst, isLast }) => {
  return (
    <View style={timelineStyles.node}>
      {/* 时间线柱子 */}
      <View style={timelineStyles.line}>
        <View style={timelineStyles.dot} />
        {!isLast && <View style={timelineStyles.connector} />}
      </View>

      {/* 内容 */}
      <View style={timelineStyles.content}>
        <View style={timelineStyles.header}>
          <Text style={timelineStyles.icon}>
            {categoryIcons[segment.poi.category] || '📍'}
          </Text>
          <View style={timelineStyles.headerText}>
            <Text style={timelineStyles.name}>{segment.poi.name}</Text>
            <Text style={timelineStyles.time}>
              {segment.arrivalTime} - {segment.departureTime}
            </Text>
          </View>
        </View>

        <View style={timelineStyles.tags}>
          <Text style={timelineStyles.tag}>
            ⭐ {segment.poi.rating.toFixed(1)}
          </Text>
          {segment.poi.queueTime > 0 && (
            <Text style={timelineStyles.tag}>
              排队{segment.poi.queueTime}分钟
            </Text>
          )}
          <Text style={timelineStyles.tag}>
            ¥{segment.poi.avgCost}/人
          </Text>
        </View>

        {segment.poi.description && (
          <Text style={timelineStyles.desc} numberOfLines={2}>
            {segment.poi.description}
          </Text>
        )}
      </View>
    </View>
  );
};

const TransportSegment: React.FC<{
  travelMode: string;
  duration: number;
}> = ({ travelMode, duration }) => {
  const label = travelMode === 'WALKING' ? '步行' : '驾车';
  return (
    <View style={transportStyles.container}>
      <Text style={transportStyles.icon}>
        {transportModeIcons[travelMode] || '🚶'}
      </Text>
      <Text style={transportStyles.text}>
        {label} {Math.round(duration)}分钟
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(139,92,246,0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  mapWrapper: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
});

const timelineStyles = StyleSheet.create({
  node: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  line: {
    width: 30,
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#8B5CF6',
    marginTop: 4,
  },
  connector: {
    width: 2,
    flex: 1,
    backgroundColor: 'rgba(139,92,246,0.2)',
    marginTop: 4,
  },
  content: {
    flex: 1,
    marginLeft: 8,
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 24,
    marginRight: 10,
  },
  headerText: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  time: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  tags: {
    flexDirection: 'row',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  tag: {
    fontSize: 12,
    color: '#666',
    marginRight: 12,
    marginBottom: 4,
  },
  desc: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    lineHeight: 18,
  },
});

const transportStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 14,
    marginVertical: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(139,92,246,0.06)',
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  icon: {
    fontSize: 14,
    marginRight: 6,
  },
  text: {
    fontSize: 13,
    color: '#8B5CF6',
  },
});

export default Timeline;
