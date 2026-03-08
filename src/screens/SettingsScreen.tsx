/**
 * JARVIS Settings Screen
 * API Key Hub & Real Android Permission Controls
 * PRODUCTION READY - Uses NativeBridge for real system permissions
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants/theme';
import { APIKeyManager, APIKey } from '../utils/api';
import { useAPIKeysStore } from '../stores';
import NativeBridge, {
  VpnBridge,
  ShizukuBridge,
  AccessibilityBridge,
  GestureBridge,
  VpnStats,
} from '../bridge/NativeBridge';

// Permission status type
type PermissionStatus = 'unknown' | 'granted' | 'denied' | 'not_available';

// API Key Input Component
const APIKeyInput: React.FC<{
  label: string;
  provider: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
}> = ({ label, provider, value, onChangeText, placeholder }) => {
  const [showKey, setShowKey] = useState(false);

  return (
    <View style={styles.keyInputContainer}>
      <View style={styles.keyInputHeader}>
        <Text style={styles.keyInputLabel}>{label}</Text>
        <TouchableOpacity onPress={() => setShowKey(!showKey)}>
          <Text style={styles.showHideText}>{showKey ? '🙈' : '👁️'}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.keyInputRow}>
        <Text style={styles.providerBadge}>{provider}</Text>
        <TextInput
          style={styles.keyInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.text.tertiary}
          secureTextEntry={!showKey}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="visible-password"
        />
      </View>
      {value.length > 0 && (
        <Text style={styles.keyStatus}>✓ Key configured ({value.length} chars)</Text>
      )}
    </View>
  );
};

// Real Permission Toggle Component
const PermissionToggle: React.FC<{
  icon: string;
  label: string;
  description: string;
  status: PermissionStatus;
  onToggle: () => Promise<boolean>;
  loading?: boolean;
  stats?: string;
}> = ({ icon, label, description, status, onToggle, loading, stats }) => {
  const [isLoading, setIsLoading] = useState(false);
  const isGranted = status === 'granted';
  const isUnknown = status === 'unknown';

  const handlePress = async () => {
    if (isLoading) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsLoading(true);
    
    try {
      await onToggle();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.toggleContainer}>
      <View style={styles.toggleInfo}>
        <Text style={styles.toggleIcon}>{icon}</Text>
        <View style={styles.toggleTextContainer}>
          <Text style={styles.toggleLabel}>{label}</Text>
          <Text style={styles.toggleDescription}>{description}</Text>
          {stats && <Text style={styles.statsText}>{stats}</Text>}
        </View>
      </View>
      <TouchableOpacity
        onPress={handlePress}
        style={[
          styles.permissionButton,
          isLoading && styles.permissionButtonLoading,
        ]}
        disabled={isLoading}
      >
        <View
          style={[
            styles.permissionStatus,
            isGranted && styles.permissionGranted,
            status === 'not_available' && styles.permissionUnavailable,
          ]}
        >
          <Text style={styles.permissionStatusText}>
            {isLoading ? '⏳' : isGranted ? 'ON' : isUnknown ? 'CHECK' : status === 'not_available' ? 'N/A' : 'OFF'}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

// VPN Stats Display
const VPNStatsDisplay: React.FC<{ stats: VpnStats | null }> = ({ stats }) => {
  if (!stats) return null;

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <View style={styles.vpnStatsContainer}>
      <Text style={styles.vpnStatsTitle}>VPN Statistics</Text>
      <View style={styles.vpnStatsRow}>
        <View style={styles.vpnStatItem}>
          <Text style={styles.vpnStatValue}>{stats.connectedDevices}</Text>
          <Text style={styles.vpnStatLabel}>Devices</Text>
        </View>
        <View style={styles.vpnStatItem}>
          <Text style={styles.vpnStatValue}>{stats.proxyIp || 'N/A'}</Text>
          <Text style={styles.vpnStatLabel}>Proxy IP</Text>
        </View>
        <View style={styles.vpnStatItem}>
          <Text style={styles.vpnStatValue}>{stats.proxyPort || 'N/A'}</Text>
          <Text style={styles.vpnStatLabel}>Port</Text>
        </View>
      </View>
      <View style={styles.vpnStatsRow}>
        <View style={styles.vpnStatItem}>
          <Text style={styles.vpnStatValue}>{formatBytes(stats.bytesReceived)}</Text>
          <Text style={styles.vpnStatLabel}>↓ Received</Text>
        </View>
        <View style={styles.vpnStatItem}>
          <Text style={styles.vpnStatValue}>{formatBytes(stats.bytesSent)}</Text>
          <Text style={styles.vpnStatLabel}>↑ Sent</Text>
        </View>
      </View>
    </View>
  );
};

// Main Settings Screen
export const SettingsScreen: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<APIKey>({
    gemini: '',
    kimi: '',
    glm: '',
    grok: '',
    claude: '',
    deepseek: '',
  });
  
  // Get zustand store actions to sync state
  const { setKeys: setZustandKeys } = useAPIKeysStore();

  const [permissions, setPermissions] = useState({
    accessibility: 'unknown' as PermissionStatus,
    shizuku: 'unknown' as PermissionStatus,
    vpn: 'unknown' as PermissionStatus,
    gesture: 'unknown' as PermissionStatus,
  });

  const [loading, setLoading] = useState(false);
  const [vpnStats, setVpnStats] = useState<VpnStats | null>(null);
  const [vpnActive, setVpnActive] = useState(false);
  const [gestureActive, setGestureActive] = useState(false);

  // Check native module availability
  const moduleAvailability = NativeBridge.checkAvailability();

  // Load saved data on mount
  useEffect(() => {
    loadSettings();
    checkAllPermissions();
  }, []);

  // Poll VPN stats when active
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (vpnActive && VpnBridge.isAvailable()) {
      interval = setInterval(async () => {
        const stats = await VpnBridge.getStats();
        setVpnStats(stats);
      }, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [vpnActive]);

  // Check permissions when app comes to foreground
  useEffect(() => {
    const subscription = Linking.addEventListener('url', () => {
      checkAllPermissions();
    });

    return () => subscription.remove();
  }, []);

  const loadSettings = async () => {
    try {
      const keys = await APIKeyManager.getKeys();
      setApiKeys(keys);
      // Also sync zustand store on load
      setZustandKeys(keys);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Save to AsyncStorage
      await APIKeyManager.saveKeys(apiKeys);
      
      // CRITICAL: Also update zustand store for immediate UI sync
      setZustandKeys(apiKeys);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved', 'API keys saved successfully!', [{ text: 'OK' }]);
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateApiKey = (key: keyof APIKey, value: string) => {
    setApiKeys((prev) => ({ ...prev, [key]: value }));
  };

  // ==================== PERMISSION CHECKS ====================

  const checkAllPermissions = async () => {
    await Promise.all([
      checkAccessibilityPermission(),
      checkShizukuPermission(),
      checkVpnPermission(),
      checkGesturePermission(),
    ]);
  };

  const checkAccessibilityPermission = async () => {
    try {
      const isEnabled = await AccessibilityBridge.isEnabled();
      setPermissions((prev) => ({
        ...prev,
        accessibility: isEnabled ? 'granted' : 'denied',
      }));
    } catch (error) {
      console.error('Failed to check accessibility:', error);
      setPermissions((prev) => ({ ...prev, accessibility: 'unknown' }));
    }
  };

  const checkShizukuPermission = async () => {
    try {
      const hasPermission = await ShizukuBridge.checkPermission();
      setPermissions((prev) => ({
        ...prev,
        shizuku: hasPermission ? 'granted' : 'denied',
      }));
    } catch (error) {
      console.error('Failed to check Shizuku:', error);
      setPermissions((prev) => ({ ...prev, shizuku: 'not_available' }));
    }
  };

  const checkVpnPermission = async () => {
    try {
      const isPrepared = await VpnBridge.isPrepared();
      setPermissions((prev) => ({
        ...prev,
        vpn: isPrepared ? 'granted' : 'denied',
      }));
    } catch (error) {
      console.error('Failed to check VPN:', error);
      setPermissions((prev) => ({ ...prev, vpn: 'unknown' }));
    }
  };

  const checkGesturePermission = async () => {
    try {
      const isTracking = await GestureBridge.isTracking();
      setPermissions((prev) => ({
        ...prev,
        gesture: moduleAvailability.gesture ? 'denied' : 'not_available',
      }));
      setGestureActive(isTracking);
    } catch (error) {
      setPermissions((prev) => ({ ...prev, gesture: 'not_available' }));
    }
  };

  // ==================== PERMISSION REQUESTS ====================

  const handleAccessibilityToggle = async (): Promise<boolean> => {
    const result = await AccessibilityBridge.enable();
    await checkAccessibilityPermission();
    return result;
  };

  const handleShizukuToggle = async (): Promise<boolean> => {
    const granted = await ShizukuBridge.requestPermission();
    await checkShizukuPermission();

    if (!granted) {
      // Show guidance
      Alert.alert(
        'Shizuku Permission',
        'To use Shizuku:\n\n1. Install Shizuku from Play Store\n2. Open Shizuku and start the service\n3. Grant permission when prompted\n4. Return to JARVIS',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Play Store', onPress: () => ShizukuBridge.openPlayStore() },
        ]
      );
    }

    return granted;
  };

  const handleVpnToggle = async (): Promise<boolean> => {
    // First check if prepared
    let isPrepared = await VpnBridge.isPrepared();

    if (!isPrepared) {
      // Request VPN permission
      isPrepared = await VpnBridge.prepare();
      if (!isPrepared) {
        setPermissions((prev) => ({ ...prev, vpn: 'denied' }));
        setVpnActive(false);
        return false;
      }
    }

    // Toggle VPN state
    if (vpnActive) {
      await VpnBridge.stop();
      setVpnActive(false);
      setVpnStats(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      const started = await VpnBridge.start();
      setVpnActive(started);
      if (!started) {
        Alert.alert('VPN Error', 'Failed to start VPN. Please try again.');
        return false;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    await checkVpnPermission();
    return vpnActive;
  };

  const handleGestureToggle = async (): Promise<boolean> => {
    if (gestureActive) {
      await GestureBridge.stopTracking();
      setGestureActive(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      const started = await GestureBridge.startTracking();
      setGestureActive(started);
      if (!started) {
        return false;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    return gestureActive;
  };

  const clearAllKeys = () => {
    Alert.alert(
      'Clear All Keys',
      'This will remove all saved API keys. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setApiKeys({
              gemini: '',
              kimi: '',
              glm: '',
              grok: '',
              claude: '',
              deepseek: '',
            });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          },
        },
      ]
    );
  };

  const configuredKeysCount = Object.values(apiKeys).filter((k) => k.length > 0).length;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={[COLORS.background.primary, COLORS.background.secondary]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>⚙️ Settings</Text>
        <Text style={styles.headerSubtitle}>
          {configuredKeysCount} API key{configuredKeysCount !== 1 ? 's' : ''} configured
        </Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Native Module Status */}
        {!NativeBridge.isProductionBuild && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningBannerText}>
              ⚠️ Running in development mode (Expo Go). Native features require EAS Build.
            </Text>
            <Text style={styles.warningBannerHint}>
              Run: eas build -p android --profile preview
            </Text>
          </View>
        )}

        {/* API Keys Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🔑 API Keys</Text>
            <TouchableOpacity onPress={clearAllKeys}>
              <Text style={styles.clearButton}>Clear All</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionDescription}>
            Add your API keys to enable cloud AI models. Keys are stored securely on your device.
          </Text>

          <APIKeyInput
            label="Gemini API Key"
            provider="Google AI"
            value={apiKeys.gemini}
            onChangeText={(v) => updateApiKey('gemini', v)}
            placeholder="AIza..."
          />

          <APIKeyInput
            label="Kimi API Key"
            provider="Moonshot"
            value={apiKeys.kimi}
            onChangeText={(v) => updateApiKey('kimi', v)}
            placeholder="sk-..."
          />

          <APIKeyInput
            label="GLM API Key"
            provider="Zhipu AI"
            value={apiKeys.glm}
            onChangeText={(v) => updateApiKey('glm', v)}
            placeholder="Enter your GLM API key..."
          />

          <APIKeyInput
            label="Grok API Key"
            provider="X.AI"
            value={apiKeys.grok}
            onChangeText={(v) => updateApiKey('grok', v)}
            placeholder="xai-..."
          />

          <APIKeyInput
            label="Claude API Key"
            provider="Anthropic"
            value={apiKeys.claude}
            onChangeText={(v) => updateApiKey('claude', v)}
            placeholder="sk-ant-..."
          />

          <APIKeyInput
            label="DeepSeek API Key"
            provider="DeepSeek"
            value={apiKeys.deepseek}
            onChangeText={(v) => updateApiKey('deepseek', v)}
            placeholder="sk-..."
          />
        </View>

        {/* GodMode Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚀 GodMode Permissions</Text>
          <Text style={styles.sectionDescription}>
            Enable system-level features for full JARVIS capabilities.
          </Text>

          <PermissionToggle
            icon="⚡"
            label="Shizuku Access"
            description="Run commands with elevated privileges"
            status={permissions.shizuku}
            onToggle={handleShizukuToggle}
          />

          <PermissionToggle
            icon="🖐️"
            label="Accessibility Service"
            description="System-wide gestures & control"
            status={permissions.accessibility}
            onToggle={handleAccessibilityToggle}
          />

          <PermissionToggle
            icon="🌐"
            label="P2P VPN"
            description="VPN tunnel for device communication"
            status={permissions.vpn}
            onToggle={handleVpnToggle}
            stats={vpnActive ? `Active • ${vpnStats?.connectedDevices || 0} devices` : undefined}
          />

          {/* VPN Stats when active */}
          {vpnActive && vpnStats && <VPNStatsDisplay stats={vpnStats} />}

          <PermissionToggle
            icon="✋"
            label="Air Hand Gestures"
            description="MediaPipe hand tracking for air control"
            status={permissions.gesture}
            onToggle={handleGestureToggle}
            stats={gestureActive ? 'Tracking Active' : undefined}
          />
        </View>

        {/* Native Module Status Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📱 Native Module Status</Text>
          <View style={styles.moduleStatusGrid}>
            <View style={styles.moduleStatusItem}>
              <Text style={styles.moduleStatusIcon}>
                {moduleAvailability.vpn ? '✅' : '⚠️'}
              </Text>
              <Text style={styles.moduleStatusName}>VPN</Text>
            </View>
            <View style={styles.moduleStatusItem}>
              <Text style={styles.moduleStatusIcon}>
                {moduleAvailability.shizuku ? '✅' : '⚠️'}
              </Text>
              <Text style={styles.moduleStatusName}>Shizuku</Text>
            </View>
            <View style={styles.moduleStatusItem}>
              <Text style={styles.moduleStatusIcon}>
                {moduleAvailability.accessibility ? '✅' : '⚠️'}
              </Text>
              <Text style={styles.moduleStatusName}>Accessibility</Text>
            </View>
            <View style={styles.moduleStatusItem}>
              <Text style={styles.moduleStatusIcon}>
                {moduleAvailability.gesture ? '✅' : '⚠️'}
              </Text>
              <Text style={styles.moduleStatusName}>Gestures</Text>
            </View>
          </View>
          <Text style={styles.moduleStatusHint}>
            {NativeBridge.isProductionBuild
              ? 'All native modules are compiled and ready.'
              : 'Build with EAS to enable native modules.'}
          </Text>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ About</Text>
          <View style={styles.aboutCard}>
            <Text style={styles.aboutTitle}>JARVIS AI Assistant</Text>
            <Text style={styles.aboutVersion}>Version 2.1.0 - Native Bridge</Text>
            <Text style={styles.aboutText}>
              A futuristic AI assistant powered by multiple cloud LLM providers with native
              Android integration for system-level control.
            </Text>
            <View style={styles.aboutStats}>
              <Text style={styles.aboutStat}>✅ 11 AI Models</Text>
              <Text style={styles.aboutStat}>✅ 6 Providers</Text>
              <Text style={styles.aboutStat}>✅ Streaming</Text>
              <Text style={styles.aboutStat}>✅ Native Bridge</Text>
            </View>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonLoading]}
          onPress={saveSettings}
          disabled={loading}
        >
          <LinearGradient
            colors={[COLORS.neon.blue, COLORS.neon.cyan]}
            style={styles.saveButtonGradient}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Saving...' : '💾 Save API Keys'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  header: {
    paddingTop: 50,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  warningBanner: {
    backgroundColor: (COLORS.status.warning || '#f59e0b') + '20',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.status.warning || '#f59e0b',
  },
  warningBannerText: {
    color: COLORS.status.warning || '#f59e0b',
    fontSize: 12,
    textAlign: 'center',
  },
  warningBannerHint: {
    color: COLORS.status.warning || '#f59e0b',
    fontSize: 10,
    textAlign: 'center',
    marginTop: SPACING.xs,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  section: {
    marginTop: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  sectionDescription: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginBottom: SPACING.md,
    lineHeight: 18,
  },
  clearButton: {
    fontSize: 12,
    color: COLORS.status.error,
  },
  // API Key Input
  keyInputContainer: {
    backgroundColor: COLORS.background.tertiary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  keyInputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  keyInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  showHideText: {
    fontSize: 16,
  },
  keyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  providerBadge: {
    fontSize: 10,
    color: COLORS.neon.blue,
    backgroundColor: COLORS.neon.blue + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    fontWeight: '600',
  },
  keyInput: {
    flex: 1,
    backgroundColor: COLORS.background.input,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    color: COLORS.text.primary,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  keyStatus: {
    fontSize: 11,
    color: COLORS.status.online,
    marginTop: SPACING.xs,
  },
  // Permission Toggles
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background.tertiary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.md,
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleIcon: {
    fontSize: 24,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  toggleDescription: {
    fontSize: 11,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  statsText: {
    fontSize: 10,
    color: COLORS.status.online,
    marginTop: 2,
  },
  permissionButton: {
    marginLeft: SPACING.sm,
  },
  permissionButtonLoading: {
    opacity: 0.7,
  },
  permissionStatus: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.background.elevated,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  permissionGranted: {
    backgroundColor: COLORS.status.online + '30',
    borderColor: COLORS.status.online,
  },
  permissionUnavailable: {
    backgroundColor: COLORS.text.tertiary + '30',
    borderColor: COLORS.text.tertiary,
  },
  permissionStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  // VPN Stats
  vpnStatsContainer: {
    backgroundColor: COLORS.background.tertiary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.neon.green + '40',
  },
  vpnStatsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.neon.green,
    marginBottom: SPACING.sm,
  },
  vpnStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.xs,
  },
  vpnStatItem: {
    alignItems: 'center',
  },
  vpnStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  vpnStatLabel: {
    fontSize: 10,
    color: COLORS.text.tertiary,
  },
  // Module Status Grid
  moduleStatusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.background.tertiary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  moduleStatusItem: {
    alignItems: 'center',
  },
  moduleStatusIcon: {
    fontSize: 20,
  },
  moduleStatusName: {
    fontSize: 10,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  moduleStatusHint: {
    fontSize: 11,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  // About
  aboutCard: {
    backgroundColor: COLORS.background.tertiary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    alignItems: 'center',
  },
  aboutTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.neon.blue,
  },
  aboutVersion: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    marginTop: SPACING.xs,
  },
  aboutText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: SPACING.md,
    lineHeight: 18,
  },
  aboutStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  aboutStat: {
    fontSize: 11,
    color: COLORS.status.online,
  },
  // Save Button
  saveButton: {
    marginTop: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  saveButtonLoading: {
    opacity: 0.7,
  },
  saveButtonGradient: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.background.primary,
  },
});

export default SettingsScreen;
