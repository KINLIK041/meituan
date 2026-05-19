import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  Dimensions,
  Alert,
} from 'react-native';
import RouteCard from '../components/RouteCard';
import RouteMap from '../components/RouteMap';
import Timeline from '../components/Timeline';
import { mockData, routeApi } from '../services/api';
import type { Route } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface RouteResultScreenProps {
  plans: Route[];
  sessionId: string;
  explanation: string;
  onBack: () => void;
}

const RouteResultScreen: React.FC<RouteResultScreenProps> = ({
  plans,
  sessionId,
  explanation,
  onBack,
}) => {
  const [allPlans, setAllPlans] = useState(plans);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [adjustmentText, setAdjustmentText] = useState('');
  const [showTimeline, setShowTimeline] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [useMock] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  const currentPlan = allPlans[selectedIndex];

  // 撤销/重做栈
  const [undoStack, setUndoStack] = useState<Route[][]>([]);
  const [redoStack, setRedoStack] = useState<Route[][]>([]);

  const handleAdjust = async () => {
    if (!adjustmentText.trim()) return;

    setUndoStack(prev => [...prev, allPlans]);
    setRedoStack([]);
    setAdjusting(true);

    try {
      let result;
      if (useMock) {
        result = await mockData.adjustRoute(sessionId, adjustmentText);
      } else {
        result = await routeApi.adjustRoute(sessionId, adjustmentText);
      }

      if (result.routes.length > 0) {
        setAllPlans(result.routes);
        setSelectedIndex(0);
      }
      setAdjustmentText('');
    } catch (err: any) {
      Alert.alert('调整失败', err?.message || '请稍后重试');
    } finally {
      setAdjusting(false);
    }
  };

  const handleUndo = () => {
    const prev = undoStack[undoStack.length - 1];
    if (!prev) return;
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, allPlans]);
    setAllPlans(prev);
  };

  const handleRedo = () => {
    const next = redoStack[redoStack.length - 1];
    if (!next) return;
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, allPlans]);
    setAllPlans(next);
  };

  const handleCardSelect = (index: number) => {
    setSelectedIndex(index);
    flatListRef.current?.scrollToIndex({ index, animated: true });
  };

  if (showTimeline && currentPlan) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.timelineHeader}>
          <TouchableOpacity onPress={() => setShowTimeline(false)} style={styles.backButtonHitArea} hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
            <Text style={styles.backButton}>← 返回</Text>
          </TouchableOpacity>
          <Text style={styles.timelineTitle}>详细日程</Text>
          <View style={{ width: 60 }} />
        </View>
        <Timeline route={currentPlan} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* 顶栏 */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backButtonHitArea} hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
          <Text style={styles.backButton}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.title}>路线方案</Text>
        <View style={styles.undoRow}>
          <TouchableOpacity
            onPress={handleUndo}
            disabled={undoStack.length === 0}
          >
            <Text
              style={[
                styles.undoText,
                undoStack.length === 0 && styles.disabled,
              ]}
            >
              ↩
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleRedo}
            disabled={redoStack.length === 0}
          >
            <Text
              style={[
                styles.undoText,
                redoStack.length === 0 && styles.disabled,
              ]}
            >
              ↪
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 可滚动内容区 */}
      <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
        {/* 方案选择标签 */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tagScroll}
          contentContainerStyle={styles.tagContainer}
        >
          {allPlans.map((plan, index) => (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.tag,
                selectedIndex === index && styles.tagActive,
              ]}
              onPress={() => handleCardSelect(index)}
            >
              <View
                style={[
                  styles.tagDot,
                  {
                    backgroundColor:
                      selectedIndex === index ? '#8B5CF6' : '#ccc',
                  },
                ]}
              />
              <Text
                style={[
                  styles.tagLabel,
                  selectedIndex === index && styles.tagLabelActive,
                ]}
              >
                {plan.optimizationGoal === 'BEST_EXPERIENCE'
                  ? '体验优先'
                  : plan.optimizationGoal === 'FASTEST'
                  ? '最省时'
                  : '最省钱'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 地图 */}
        {currentPlan && currentPlan.segments.length > 0 && (
          <View style={styles.mapContainer}>
            <RouteMap route={currentPlan} interactive={false} />
          </View>
        )}

        {/* 卡片流 */}
        <View style={styles.cardContainer}>
          <FlatList
            ref={flatListRef}
            data={allPlans}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={336}
            decelerationRate="fast"
            nestedScrollEnabled
            onMomentumScrollEnd={e => {
              const index = Math.round(
                e.nativeEvent.contentOffset.x / 336
              );
              if (index !== selectedIndex) {
                setSelectedIndex(index);
              }
            }}
            renderItem={({ item, index }) => (
              <View style={styles.cardWrapper}>
                <RouteCard
                  route={item}
                  isSelected={index === selectedIndex}
                  onPress={() => {
                    setSelectedIndex(index);
                    setShowTimeline(true);
                  }}
                />
              </View>
            )}
            keyExtractor={item => item.id}
          />
        </View>

        {/* 推荐理由 */}
        {currentPlan && (
          <View style={styles.explanation}>
            <Text style={styles.explanationText}>{currentPlan.description}</Text>
          </View>
        )}

        {/* 调整输入 */}
        <View style={styles.adjustmentRow}>
          <View style={styles.adjustmentInputContainer}>
            <TextInput
              style={styles.adjustmentInput}
              value={adjustmentText}
              onChangeText={setAdjustmentText}
              placeholder="换一家不用排队的咖啡店"
              placeholderTextColor="rgba(128,128,128,0.6)"
              returnKeyType="send"
              onSubmitEditing={handleAdjust}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.adjustButton,
              !adjustmentText.trim() && styles.adjustButtonDisabled,
            ]}
            onPress={handleAdjust}
            disabled={!adjustmentText.trim() || adjusting}
          >
            <Text style={styles.adjustButtonText}>
              {adjusting ? '...' : '调整'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 底部操作栏 */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setShowTimeline(true)}
        >
          <Text style={styles.secondaryButtonText}>📋 详细日程</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>📍 开始导航</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backButtonHitArea: {
    padding: 8,
  },
  backButton: {
    fontSize: 17,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  undoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  undoText: {
    fontSize: 18,
    color: '#8B5CF6',
  },
  disabled: {
    opacity: 0.3,
  },
  tagScroll: {
    maxHeight: 44,
    marginTop: 8,
    marginBottom: 0,
  },
  contentScroll: {
    flex: 1,
  },
  tagContainer: {
    paddingHorizontal: 20,
    gap: 8,
    flexDirection: 'row',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  tagActive: {
    backgroundColor: 'rgba(139,92,246,0.1)',
    borderColor: 'rgba(139,92,246,0.3)',
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  tagLabel: {
    fontSize: 13,
    color: '#888',
  },
  tagLabelActive: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
  mapContainer: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardContainer: {
    height: 370,
    marginTop: 12,
  },
  cardWrapper: {
    width: 336,
    paddingLeft: 16,
    paddingVertical: 8,
  },
  explanation: {
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 12,
    backgroundColor: 'rgba(139,92,246,0.06)',
    borderRadius: 12,
  },
  explanationText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  adjustmentRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 8,
    gap: 8,
    alignItems: 'center',
  },
  adjustmentInputContainer: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 24,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  adjustmentInput: {
    fontSize: 15,
    paddingVertical: 12,
    color: '#000',
  },
  adjustButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  adjustButtonDisabled: {
    opacity: 0.4,
  },
  adjustButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  bottomBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 28,
    backgroundColor: 'rgba(139,92,246,0.08)',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1.5,
    paddingVertical: 14,
    borderRadius: 28,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '700',
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  timelineTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
});

export default RouteResultScreen;
