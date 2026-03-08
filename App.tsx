/**
 * JARVIS AI Assistant
 * Main App Entry Point
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import RootNavigator from './src/navigation';
import { useSystemStore } from './src/stores';
import { COLORS, SPACING } from './src/constants/theme';

// Keep the native splash screen visible while we initialize
SplashScreen.preventAutoHideAsync();

// Custom Splash Screen Component
const CustomSplash = ({ onFinish }: { onFinish: () => void }) => {
  const logo = useSharedValue(0.5);
  const text = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    logo.value = withSpring(1, { damping: 10, stiffness: 100 });
    text.value = withDelay(600, withTiming(1, { duration: 600 }));
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    const timer = setTimeout(onFinish, 2500);
    return () => clearTimeout(timer);
  }, []);

  const logoStyle = useAnimatedStyle(() => ({ 
    transform: [{ scale: logo.value }], 
    opacity: logo.value 
  }));
  
  const textStyle = useAnimatedStyle(() => ({ opacity: text.value }));
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <View style={styles.splash}>
      <LinearGradient 
        colors={[COLORS.background.primary, COLORS.background.secondary]} 
        style={styles.splashGrad}
      >
        <Animated.View style={[styles.pulse, pulseStyle]} />
        <Animated.View style={[styles.logo, logoStyle]}>
          <LinearGradient 
            colors={[COLORS.neon.blue, COLORS.neon.purple]} 
            style={styles.logoInner}
          >
            <Text style={styles.logoText}>J</Text>
          </LinearGradient>
        </Animated.View>
        <Animated.View style={[styles.titleWrap, textStyle]}>
          <Text style={styles.splashTitle}>JARVIS</Text>
          <Text style={styles.splashSub}>Advanced AI Assistant</Text>
        </Animated.View>
        <Animated.View style={[styles.loading, textStyle]}>
          <LoadingDots />
        </Animated.View>
      </LinearGradient>
    </View>
  );
};

// Loading Dots Animation
const LoadingDots = () => {
  const d1 = useSharedValue(0.3);
  const d2 = useSharedValue(0.3);
  const d3 = useSharedValue(0.3);

  useEffect(() => {
    const animate = (v: Animated.SharedValue<number>, delayMs: number) => {
      v.value = withDelay(
        delayMs, 
        withRepeat(
          withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })), 
          -1, 
          false
        )
      );
    };
    animate(d1, 0);
    animate(d2, 200);
    animate(d3, 400);
  }, []);

  const s1 = useAnimatedStyle(() => ({ opacity: d1.value }));
  const s2 = useAnimatedStyle(() => ({ opacity: d2.value }));
  const s3 = useAnimatedStyle(() => ({ opacity: d3.value }));

  return (
    <View style={styles.dots}>
      <Animated.View style={[styles.dot, s1]} />
      <Animated.View style={[styles.dot, s2]} />
      <Animated.View style={[styles.dot, s3]} />
    </View>
  );
};

// Main App Component
export default function App() {
  const [appReady, setAppReady] = useState(false);
  const [showCustomSplash, setShowCustomSplash] = useState(true);

  const setStatus = useSystemStore((s) => s.setStatus);
  const setSysReady = useSystemStore((s) => s.setReady);

  useEffect(() => {
    async function prepare() {
      try {
        // Initialize any required services here
        setStatus('initializing');
        
        // Hide native splash screen after a short delay
        await SplashScreen.hideAsync();
        
      } catch (e) {
        console.warn('Initialization error:', e);
      }
    }
    
    prepare();
  }, []);

  const handleCustomSplashFinish = () => {
    setShowCustomSplash(false);
    setStatus('ready');
    setSysReady(true);
    setAppReady(true);
  };

  if (showCustomSplash) {
    return (
      <GestureHandlerRootView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background.primary} translucent />
        <CustomSplash onFinish={handleCustomSplashFinish} />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background.primary} translucent />
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background.primary 
  },
  splash: { 
    flex: 1 
  },
  splashGrad: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  pulse: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: COLORS.neon.blue,
    opacity: 0.3,
  },
  logo: { 
    marginBottom: SPACING.lg 
  },
  logoInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: { 
    fontSize: 48, 
    fontWeight: 'bold', 
    color: COLORS.background.primary 
  },
  titleWrap: { 
    alignItems: 'center' 
  },
  splashTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    letterSpacing: 8,
  },
  splashSub: { 
    fontSize: 14, 
    color: COLORS.text.secondary, 
    marginTop: SPACING.sm, 
    letterSpacing: 2 
  },
  loading: { 
    position: 'absolute', 
    bottom: 100 
  },
  dots: { 
    flexDirection: 'row' 
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.neon.blue,
    marginHorizontal: 4,
  },
});
