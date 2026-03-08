/**
 * JARVIS Gesture Overlay
 * Real-time air gesture visualization with MediaPipe tracking
 * 
 * Displays a glowing cursor that follows hand position
 * Shows gesture recognition feedback
 * 
 * IMPORTANT: Requires EAS Build for real tracking
 * In Expo Go, shows a demo mode
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { NativeEventEmitter, NativeModules, DeviceEventEmitter } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants/theme';
import NativeBridge, { GestureEvent, GestureCoordinates, GestureBridge } from '../bridge/NativeBridge';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Gesture types
type GestureType = 'PINCH' | 'SWIPE_LEFT' | 'SWIPE_RIGHT' | 'SWIPE_UP' | 'SWIPE_DOWN' | 
                   'OPEN_PALM' | 'FIST' | 'POINTING' | 'THUMBS_UP' | 'THUMBS_DOWN' | null;

// Gesture display config
const GESTURE_CONFIG: Record<string, { icon: string; color: string; action: string }> = {
  'PINCH': { icon: '🤏', color: COLORS.neon.purple, action: 'Select/Zoom' },
  'SWIPE_LEFT': { icon: '👈', color: COLORS.neon.cyan, action: 'Navigate Back' },
  'SWIPE_RIGHT': { icon: '👉', color: COLORS.neon.cyan, action: 'Navigate Forward' },
  'SWIPE_UP': { icon: '👆', color: COLORS.neon.green, action: 'Scroll Up' },
  'SWIPE_DOWN': { icon: '👇', color: COLORS.neon.green, action: 'Scroll Down' },
  'OPEN_PALM': { icon: '🖐️', color: COLORS.neon.blue, action: 'Stop/Pause' },
  'FIST': { icon: '✊', color: COLORS.status.warning, action: 'Grab/Select' },
  'POINTING': { icon: '👆', color: COLORS.neon.cyan, action: 'Point/Click' },
  'THUMBS_UP': { icon: '👍', color: COLORS.status.online, action: 'Confirm' },
  'THUMBS_DOWN': { icon: '👎', color: COLORS.status.error, action: 'Cancel' },
};

// ==================== CURSOR COMPONENT ====================

interface CursorProps {
  x: number;
  y: number;
  visible: boolean;
  hand: 'LEFT' | 'RIGHT';
}

const GestureCursor: React.FC<CursorProps> = ({ x, y, visible, hand }) => {
  // Use useMemo for Animated values to avoid ref access during render
  const scaleAnim = React.useMemo(() => new Animated.Value(1), []);
  const glowAnim = React.useMemo(() => new Animated.Value(0.5), []);

  useEffect(() => {
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.5, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  if (!visible) return null;

  const cursorColor = hand === 'LEFT' ? COLORS.neon.cyan : COLORS.neon.purple;

  return (
    <Animated.View
      style={[
        styles.cursor,
        {
          left: x - 30,
          top: y - 30,
          transform: [{ scale: scaleAnim }],
        },
      ]}
      pointerEvents="none"
    >
      {/* Outer glow */}
      <Animated.View
        style={[
          styles.cursorGlow,
          {
            backgroundColor: cursorColor,
            opacity: glowAnim,
          },
        ]}
      />
      {/* Inner dot */}
      <View style={[styles.cursorDot, { backgroundColor: cursorColor }]} />
      {/* Hand indicator */}
      <Text style={styles.handLabel}>{hand === 'LEFT' ? 'L' : 'R'}</Text>
    </Animated.View>
  );
};

// ==================== GESTURE FEEDBACK ====================

interface GestureFeedbackProps {
  gesture: GestureType;
  confidence: number;
  onDismiss: () => void;
}

const GestureFeedback: React.FC<GestureFeedbackProps> = ({ gesture, confidence, onDismiss }) => {
  // Use useMemo for Animated values
  const opacityAnim = React.useMemo(() => new Animated.Value(0), []);
  const scaleAnim = React.useMemo(() => new Animated.Value(0.5), []);

  useEffect(() => {
    // Show animation
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();

    // Auto dismiss
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0.5, duration: 200, useNativeDriver: true }),
      ]).start(() => onDismiss());
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (!gesture) return null;

  const config = GESTURE_CONFIG[gesture] || { icon: '❓', color: COLORS.text.tertiary, action: 'Unknown' };

  return (
    <Animated.View
      style={[
        styles.gestureFeedback,
        { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
      ]}
    >
      <LinearGradient
        colors={[config.color + '40', config.color + '20']}
        style={styles.gestureGradient}
      >
        <Text style={styles.gestureIcon}>{config.icon}</Text>
        <Text style={styles.gestureName}>{gesture.replace('_', ' ')}</Text>
        <Text style={styles.gestureAction}>{config.action}</Text>
        <View style={styles.confidenceBar}>
          <View style={[styles.confidenceFill, { width: `${confidence * 100}%`, backgroundColor: config.color }]} />
        </View>
        <Text style={styles.confidenceText}>{Math.round(confidence * 100)}% confidence</Text>
      </LinearGradient>
    </Animated.View>
  );
};

// ==================== HUD OVERLAY ====================

interface GestureHUDProps {
  isActive: boolean;
  cursorPosition: { x: number; y: number } | null;
  currentGesture: GestureType;
  confidence: number;
  isTracking: boolean;
  demoMode: boolean;
}

const GestureHUD: React.FC<GestureHUDProps> = ({
  isActive,
  cursorPosition,
  currentGesture,
  confidence,
  isTracking,
  demoMode,
}) => {
  if (!isActive) return null;

  return (
    <View style={styles.hud} pointerEvents="none">
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, { backgroundColor: isTracking ? COLORS.status.online : COLORS.status.busy }]} />
          <Text style={styles.statusText}>
            {demoMode ? 'Demo Mode' : isTracking ? 'Tracking Active' : 'Initializing...'}
          </Text>
        </View>
        {demoMode && (
          <Text style={styles.demoHint}>Build with EAS for real tracking</Text>
        )}
      </View>

      {/* Cursor */}
      {cursorPosition && (
        <GestureCursor
          x={cursorPosition.x}
          y={cursorPosition.y}
          visible={true}
          hand="RIGHT"
        />
      )}

      {/* Gesture feedback */}
      {currentGesture && (
        <GestureFeedback
          gesture={currentGesture}
          confidence={confidence}
          onDismiss={() => {}}
        />
      )}
    </View>
  );
};

// ==================== MAIN COMPONENT ====================

interface GestureOverlayProps {
  enabled: boolean;
  onGesture?: (gesture: GestureEvent) => void;
  onCoordinates?: (coords: GestureCoordinates) => void;
  showHUD?: boolean;
}

export const GestureOverlay: React.FC<GestureOverlayProps> = ({
  enabled,
  onGesture,
  onCoordinates,
  showHUD = true,
}) => {
  const [isTracking, setIsTracking] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);
  const [currentGesture, setCurrentGesture] = useState<GestureType>(null);
  const [confidence, setConfidence] = useState(0);
  const [demoMode, setDemoMode] = useState(false);

  const gestureSubscription = useRef<{ remove: () => void } | null>(null);
  const coordsSubscription = useRef<{ remove: () => void } | null>(null);
  const demoInterval = useRef<NodeJS.Timeout | null>(null);

  // Check if native module is available
  const hasNativeModule = GestureBridge.isAvailable();

  // Start tracking when enabled
  useEffect(() => {
    if (enabled) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [enabled]);

  const startTracking = async () => {
    if (hasNativeModule) {
      // Real tracking with native module
      try {
        const success = await GestureBridge.startTracking();
        setIsTracking(success);

        if (success) {
          // Subscribe to gesture events
          gestureSubscription.current = GestureBridge.subscribeToGestures((event) => {
            console.log('[GestureOverlay] Gesture detected:', event);
            setCurrentGesture(event.type);
            setConfidence(event.confidence);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onGesture?.(event);
          });

          // Subscribe to coordinate updates
          coordsSubscription.current = GestureBridge.subscribeToCoordinates((coords) => {
            setCursorPosition({ x: coords.x, y: coords.y });
            onCoordinates?.(coords);
          });
        }
      } catch (error) {
        console.error('[GestureOverlay] Failed to start tracking:', error);
        startDemoMode();
      }
    } else {
      // Demo mode for development
      startDemoMode();
    }
  };

  const stopTracking = async () => {
    // Clean up subscriptions
    gestureSubscription.current?.remove();
    coordsSubscription.current?.remove();
    gestureSubscription.current = null;
    coordsSubscription.current = null;

    if (demoInterval.current) {
      clearInterval(demoInterval.current);
      demoInterval.current = null;
    }

    if (hasNativeModule) {
      await GestureBridge.stopTracking();
    }

    setIsTracking(false);
    setCursorPosition(null);
    setCurrentGesture(null);
    setDemoMode(false);
  };

  const startDemoMode = () => {
    setDemoMode(true);
    setIsTracking(true);

    // Simulate cursor movement
    let angle = 0;
    demoInterval.current = setInterval(() => {
      angle += 0.05;
      const centerX = SCREEN_WIDTH / 2;
      const centerY = SCREEN_HEIGHT / 2;
      const radius = 100;

      setCursorPosition({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      });
    }, 50);

    // Simulate occasional gestures
    const gestureInterval = setInterval(() => {
      const gestures: GestureType[] = ['PINCH', 'SWIPE_LEFT', 'SWIPE_RIGHT', 'OPEN_PALM', 'FIST'];
      const randomGesture = gestures[Math.floor(Math.random() * gestures.length)];
      
      setCurrentGesture(randomGesture);
      setConfidence(0.7 + Math.random() * 0.3);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      setTimeout(() => setCurrentGesture(null), 1500);
    }, 3000);

    demoInterval.current = gestureInterval as any;
  };

  if (!showHUD) return null;

  return (
    <GestureHUD
      isActive={enabled}
      cursorPosition={cursorPosition}
      currentGesture={currentGesture}
      confidence={confidence}
      isTracking={isTracking}
      demoMode={demoMode}
    />
  );
};

// ==================== STYLES ====================

const styles = StyleSheet.create({
  hud: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.sm,
  },
  statusText: {
    color: COLORS.text.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  demoHint: {
    color: COLORS.status.warning,
    fontSize: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  cursor: {
    position: 'absolute',
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cursorGlow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    opacity: 0.5,
  },
  cursorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  handLabel: {
    position: 'absolute',
    bottom: -15,
    color: COLORS.text.primary,
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gestureFeedback: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    marginLeft: -75,
    width: 150,
    alignItems: 'center',
  },
  gestureGradient: {
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  gestureIcon: {
    fontSize: 40,
    marginBottom: SPACING.xs,
  },
  gestureName: {
    color: COLORS.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  gestureAction: {
    color: COLORS.text.secondary,
    fontSize: 12,
    marginTop: 2,
  },
  confidenceBar: {
    width: '100%',
    height: 4,
    backgroundColor: COLORS.background.elevated,
    borderRadius: 2,
    marginTop: SPACING.sm,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 2,
  },
  confidenceText: {
    color: COLORS.text.tertiary,
    fontSize: 10,
    marginTop: 4,
  },
});

export default GestureOverlay;
