import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
} from 'react-native';

interface LiquidGlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  tint?: string;
  radius?: number;
}

const LiquidGlassCard: React.FC<LiquidGlassCardProps> = ({
  children,
  style,
  tint = '#8B5CF6',
  radius = 24,
}) => {
  return (
    <View style={[styles.container, { borderRadius: radius }, style]}>
      {/* 毛玻璃层 */}
      <View style={[styles.glass, { borderRadius: radius }]} />
      {/* 渐变叠加层 */}
      <View
        style={[
          styles.tintOverlay,
          { borderRadius: radius, backgroundColor: tint + '15' },
        ]}
      />
      {/* 边缘高光 */}
      <View
        style={[
          styles.highlight,
          { borderRadius: radius, borderColor: tint + '30' },
        ]}
      />
      {/* 内容 */}
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  glass: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.12)',
    // @ts-ignore - RN 0.85+ 支持 backdropFilter
    backdropFilter: 'blur(20px)',
  },
  tintOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5,
  },
  highlight: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderStyle: 'solid',
  },
  content: {
    position: 'relative',
    zIndex: 1,
    padding: 16,
  },
});

export default LiquidGlassCard;
