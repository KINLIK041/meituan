import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline, Region } from 'react-native-maps';
import type { Route, RouteSegment } from '../types';
import { optimizationGoalColors, categoryIcons } from '../types';
import type { OptimizationGoal } from '../types';

interface RouteMapProps {
  route: Route;
  style?: object;
  interactive?: boolean;
}

const COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

function getRegion(segments: RouteSegment[]): Region {
  const pois = segments.map(s => s.poi);
  const lats = pois.map(p => p.lat);
  const lngs = pois.map(p => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latDelta = (maxLat - minLat) * 1.6 || 0.01;
  const lngDelta = (maxLng - minLng) * 1.6 || 0.01;

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(latDelta, 0.005),
    longitudeDelta: Math.max(lngDelta, 0.005),
  };
}

const RouteMap: React.FC<RouteMapProps> = ({ route, style, interactive = true }) => {
  const mapRef = useRef<MapView>(null);
  const region = getRegion(route.segments);

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.animateToRegion(region, 600);
    }
  }, [route.id]);

  const goal = route.optimizationGoal as OptimizationGoal;
  const routeColor = optimizationGoalColors[goal] || '#8B5CF6';

  // Build polyline coordinates from consecutive POIs
  const polylineCoords = route.segments.map(s => ({
    latitude: s.poi.lat,
    longitude: s.poi.lng,
  }));

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {/* Route polyline */}
        <Polyline
          coordinates={polylineCoords}
          strokeColor={routeColor}
          strokeWidth={4}
          lineDashPattern={[0]}
        />

        {/* POI markers */}
        {route.segments.map((seg, index) => (
          <Marker
            key={seg.poi.id}
            coordinate={{ latitude: seg.poi.lat, longitude: seg.poi.lng }}
            title={seg.poi.name}
            description={`${seg.arrivalTime} - ${seg.departureTime}`}
          >
            <View style={styles.markerOuter}>
              <View style={[styles.markerInner, { backgroundColor: COLORS[index % COLORS.length] }]}>
                <Text style={styles.markerNumber}>{index + 1}</Text>
              </View>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* POI legend */}
      <View style={styles.legend}>
        {route.segments.map((seg, index) => (
          <View key={seg.poi.id} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS[index % COLORS.length] }]}>
              <Text style={styles.legendDotText}>{index + 1}</Text>
            </View>
            <Text style={styles.legendName} numberOfLines={1}>{seg.poi.name}</Text>
            <Text style={styles.legendTime}>{seg.arrivalTime}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  map: {
    height: 200,
  },
  markerOuter: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  markerInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerNumber: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '45%',
  },
  legendDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  legendDotText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  legendName: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
    marginRight: 6,
    flexShrink: 1,
  },
  legendTime: {
    fontSize: 11,
    color: '#999',
  },
});

export default RouteMap;
