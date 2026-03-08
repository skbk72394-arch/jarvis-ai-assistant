/**
 * JARVIS Animated Components
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  withDelay,
  interpolate,
} from 'react-native-reanimated';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants/theme';

// Typing Dots
export const TypingDots: React.FC<{ color?: string }> = ({ color = COLORS.neon.blue }) => {
  const d1 = useSharedValue(0);
  const d2 = useSharedValue(0);
  const d3 = useSharedValue(0);

  useEffect(() => {
    const animate = (v: Animated.SharedValue<number>, delayMs: number) => {
      v.value = withDelay(
        delayMs,
        withRepeat(
          withSequence(withTiming(1, { duration: 300 }), withTiming(0, { duration: 300 })),
          -1,
          false
        )
      );
    };
    animate(d1, 0);
    animate(d2, 150);
    animate(d3, 300);
  }, []);

  const s1 = useAnimatedStyle(() => ({ opacity: d1.value, transform: [{ translateY: -d1.value * 4 }] }));
  const s2 = useAnimatedStyle(() => ({ opacity: d2.value, transform: [{ translateY: -d2.value * 4 }] }));
  const s3 = useAnimatedStyle(() => ({ opacity: d3.value, transform: [{ translateY: -d3.value * 4 }] }));

  return (
    <View style={styles.dots}>
      <Animated.View style={[styles.dot, { backgroundColor: color }, s1]} />
      <Animated.View style={[styles.dot, { backgroundColor: color }, s2]} />
      <Animated.View style={[styles.dot, { backgroundColor: color }, s3]} />
    </View>
  );
};

// Listening Orb
export const ListeningOrb: React.FC<{ active: boolean; size?: number }> = ({
  active,
  size = 60,
}) => {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0.3);

  useEffect(() => {
    if (active) {
      scale.value = withRepeat(
        withSequence(withTiming(1.1, { duration: 500 }), withTiming(1, { duration: 500 })),
        -1,
        true
      );
      glow.value = withRepeat(
        withSequence(withTiming(1, { duration: 800 }), withTiming(0.3, { duration: 800 })),
        -1,
        true
      );
    } else {
      scale.value = withTiming(1);
      glow.value = withTiming(0.3);
    }
  }, [active]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: interpolate(glow.value, [0, 1], [0.5, 1]),
  }));

  return (
    <Animated.View
      style={[
        styles.orb,
        { width: size, height: size, borderRadius: size / 2 },
        animStyle,
      ]}
    >
      <Text style={styles.orbText}>J</Text>
    </Animated.View>
  );
};

// Pulse Ring
export const PulseRing: React.FC<{ active: boolean; delay?: number }> = ({
  active,
  delay = 0,
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    if (active) {
      scale.value = withDelay(
        delay,
        withRepeat(withSequence(withTiming(1.5, { duration: 1000 }), withTiming(1, { duration: 0 })), -1, false)
      );
      opacity.value = withDelay(
        delay,
        withRepeat(withSequence(withTiming(0, { duration: 1000 }), withTiming(0.5, { duration: 0 })), -1, false)
      );
    }
  }, [active, delay]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.ring, animStyle]} />
  );
};

// Full Listening Indicator
export const ListeningIndicator: React.FC<{ active: boolean }> = ({ active }) => {
  return (
    <View style={styles.container}>
      <PulseRing active={active} delay={0} />
      <PulseRing active={active} delay={350} />
      <PulseRing active={active} delay={700} />
      <ListeningOrb active={active} />
    </View>
  );
};

const styles = StyleSheet.create({
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.sm,
    backgroundColor: COLORS.background.card,
    borderRadius: BORDER_RADIUS.full,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 2,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  orb: {
    backgroundColor: COLORS.neon.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.background.primary,
  },
  ring: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: COLORS.neon.blue,
  },
});
