/**
 * JARVIS Native Bridge
 * Centralized TypeScript wrapper for Native Android Modules
 * 
 * IMPORTANT: These native modules only work after EAS Build.
 * In Expo Go (development), all modules will be undefined.
 * 
 * To use this in production:
 * 1. Build with EAS: `eas build -p android --profile preview`
 * 2. Native modules will be compiled and available
 */

import { NativeModules, NativeEventEmitter, Platform, Alert, Linking } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';

// ==================== TYPE DEFINITIONS ====================

export interface NativeModuleError {
  code: string;
  message: string;
  nativeStackAndroid?: string[];
}

export interface VpnStats {
  isConnected: boolean;
  connectedDevices: number;
  proxyIp: string;
  proxyPort: number;
  bytesReceived: number;
  bytesSent: number;
  uptime: number;
}

export interface GestureEvent {
  type: 'PINCH' | 'SWIPE_LEFT' | 'SWIPE_RIGHT' | 'SWIPE_UP' | 'SWIPE_DOWN' | 'OPEN_PALM' | 'FIST' | 'POINTING' | 'THUMBS_UP' | 'THUMBS_DOWN';
  confidence: number;
  timestamp: number;
}

export interface GestureCoordinates {
  x: number;
  y: number;
  z?: number;
  hand: 'LEFT' | 'RIGHT';
}

export interface ShizukuStatus {
  isRunning: boolean;
  hasPermission: boolean;
  version: string;
}

export interface AccessibilityStatus {
  isEnabled: boolean;
  serviceRunning: boolean;
}

// ==================== NATIVE MODULE INTERFACES ====================

interface VpnModuleInterface {
  prepare(): Promise<boolean>;
  start(config: { serverIp: string; port: number }): Promise<boolean>;
  stop(): Promise<void>;
  getStatus(): Promise<VpnStats>;
  isVpnPrepared(): Promise<boolean>;
}

interface ShizukuModuleInterface {
  requestPermission(): Promise<boolean>;
  checkPermission(): Promise<boolean>;
  getStatus(): Promise<ShizukuStatus>;
  executeCommand(command: string): Promise<string>;
}

interface AccessibilityModuleInterface {
  isServiceEnabled(): Promise<boolean>;
  enableService(): Promise<boolean>;
  disableService(): Promise<void>;
  getStatus(): Promise<AccessibilityStatus>;
  performGesture(gesture: string): Promise<boolean>;
}

interface GestureRecognitionModuleInterface {
  startTracking(): Promise<boolean>;
  stopTracking(): Promise<void>;
  isTracking(): Promise<boolean>;
  setSensitivity(level: number): Promise<void>;
}

interface AirKeyboardModuleInterface {
  show(): Promise<void>;
  hide(): Promise<void>;
  isVisible(): Promise<boolean>;
  processKey(key: string): Promise<void>;
}

// ==================== NATIVE MODULES REFERENCE ====================

// These will be undefined in Expo Go
const NativeVpnModule = NativeModules.VpnModule as VpnModuleInterface | undefined;
const NativeShizukuModule = NativeModules.ShizukuModule as ShizukuModuleInterface | undefined;
const NativeAccessibilityModule = NativeModules.AccessibilityModule as AccessibilityModuleInterface | undefined;
const NativeGestureModule = NativeModules.GestureRecognitionModule as GestureRecognitionModuleInterface | undefined;
const NativeAirKeyboardModule = NativeModules.AirKeyboardModule as AirKeyboardModuleInterface | undefined;

// Check if running in production (EAS Build) vs development (Expo Go)
export const isProductionBuild = NativeVpnModule || NativeShizukuModule || NativeAccessibilityModule;

// Create event emitter for native events
let eventEmitter: NativeEventEmitter | null = null;
if (Platform.OS === 'android' && isProductionBuild) {
  try {
    eventEmitter = new NativeEventEmitter();
  } catch (e) {
    console.warn('[NativeBridge] Could not create NativeEventEmitter:', e);
  }
}

// ==================== ERROR CLASS ====================

export class NativeModuleMissingError extends Error {
  constructor(moduleName: string) {
    super(`Native Module "${moduleName}" is not available. EAS Build required.`);
    this.name = 'NativeModuleMissingError';
  }

  static showAlert(moduleName: string, feature: string): void {
    Alert.alert(
      `${feature} Requires EAS Build`,
      `The ${feature} feature requires native code compilation.\n\n` +
      `Currently running in development mode (Expo Go).\n\n` +
      `To enable this feature:\n` +
      `1. Run: eas build -p android --profile preview\n` +
      `2. Install the built APK\n\n` +
      `The native module "${moduleName}" will then be available.`,
      [
        { text: 'OK' },
        { 
          text: 'Build Instructions', 
          onPress: () => Linking.openURL('https://docs.expo.dev/build/introduction/')
        }
      ]
    );
  }
}

// ==================== VPN MODULE ====================

export const VpnBridge = {
  /**
   * Check if VPN module is available
   */
  isAvailable(): boolean {
    return !!NativeVpnModule;
  },

  /**
   * Prepare VPN permission (shows system VPN dialog)
   */
  async prepare(): Promise<boolean> {
    if (!NativeVpnModule) {
      NativeModuleMissingError.showAlert('VpnModule', 'P2P VPN');
      return false;
    }

    try {
      console.log('[VpnBridge] Requesting VPN permission...');
      const granted = await NativeVpnModule.prepare();
      console.log('[VpnBridge] Permission result:', granted);
      return granted;
    } catch (error: any) {
      console.error('[VpnBridge] Prepare error:', error);
      throw new Error(`VPN prepare failed: ${error.message}`);
    }
  },

  /**
   * Start VPN tunnel
   */
  async start(config?: { serverIp?: string; port?: number }): Promise<boolean> {
    if (!NativeVpnModule) {
      NativeModuleMissingError.showAlert('VpnModule', 'P2P VPN');
      return false;
    }

    try {
      console.log('[VpnBridge] Starting VPN...');
      const result = await NativeVpnModule.start({
        serverIp: config?.serverIp || '0.0.0.0',
        port: config?.port || 8080,
      });
      console.log('[VpnBridge] Start result:', result);
      return result;
    } catch (error: any) {
      console.error('[VpnBridge] Start error:', error);
      throw new Error(`VPN start failed: ${error.message}`);
    }
  },

  /**
   * Stop VPN tunnel
   */
  async stop(): Promise<void> {
    if (!NativeVpnModule) {
      return;
    }

    try {
      console.log('[VpnBridge] Stopping VPN...');
      await NativeVpnModule.stop();
      console.log('[VpnBridge] VPN stopped');
    } catch (error: any) {
      console.error('[VpnBridge] Stop error:', error);
      throw new Error(`VPN stop failed: ${error.message}`);
    }
  },

  /**
   * Get VPN statistics
   */
  async getStats(): Promise<VpnStats | null> {
    if (!NativeVpnModule) {
      return null;
    }

    try {
      const stats = await NativeVpnModule.getStatus();
      return stats;
    } catch (error: any) {
      console.error('[VpnBridge] Get stats error:', error);
      return null;
    }
  },

  /**
   * Check if VPN is already prepared
   */
  async isPrepared(): Promise<boolean> {
    if (!NativeVpnModule) {
      return false;
    }

    try {
      return await NativeVpnModule.isVpnPrepared();
    } catch (error: any) {
      return false;
    }
  },

  /**
   * Open VPN settings page
   */
  async openSettings(): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      await IntentLauncher.startActivityAsync('android.settings.VPN_SETTINGS');
    } catch (error) {
      console.error('[VpnBridge] Could not open VPN settings');
    }
  }
};

// ==================== SHIZUKU MODULE ====================

export const ShizukuBridge = {
  /**
   * Check if Shizuku module is available
   */
  isAvailable(): boolean {
    return !!NativeShizukuModule;
  },

  /**
   * Request Shizuku permission
   */
  async requestPermission(): Promise<boolean> {
    if (!NativeShizukuModule) {
      // Check if Shizuku app is installed
      NativeModuleMissingError.showAlert('ShizukuModule', 'Shizuku Access');
      return false;
    }

    try {
      console.log('[ShizukuBridge] Requesting permission...');
      const granted = await NativeShizukuModule.requestPermission();
      console.log('[ShizukuBridge] Permission result:', granted);
      return granted;
    } catch (error: any) {
      console.error('[ShizukuBridge] Request error:', error);
      
      // Shizuku might not be running
      Alert.alert(
        'Shizuku Not Running',
        'Shizuku app needs to be running to grant permission.\n\n' +
        '1. Open Shizuku app\n' +
        '2. Start Shizuku service\n' +
        '3. Come back and try again',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open Shizuku', 
            onPress: () => {
              Linking.openURL('market://details?id=moe.shizuku.privileged.api');
            }
          }
        ]
      );
      return false;
    }
  },

  /**
   * Check if Shizuku permission is granted
   */
  async checkPermission(): Promise<boolean> {
    if (!NativeShizukuModule) {
      return false;
    }

    try {
      return await NativeShizukuModule.checkPermission();
    } catch (error: any) {
      return false;
    }
  },

  /**
   * Get Shizuku status
   */
  async getStatus(): Promise<ShizukuStatus | null> {
    if (!NativeShizukuModule) {
      return null;
    }

    try {
      return await NativeShizukuModule.getStatus();
    } catch (error: any) {
      return null;
    }
  },

  /**
   * Execute elevated command via Shizuku
   */
  async executeCommand(command: string): Promise<string> {
    if (!NativeShizukuModule) {
      throw new NativeModuleMissingError('ShizukuModule');
    }

    try {
      const result = await NativeShizukuModule.executeCommand(command);
      return result;
    } catch (error: any) {
      throw new Error(`Command execution failed: ${error.message}`);
    }
  },

  /**
   * Open Shizuku in Play Store
   */
  openPlayStore(): void {
    Linking.openURL('market://details?id=moe.shizuku.privileged.api');
  }
};

// ==================== ACCESSIBILITY MODULE ====================

export const AccessibilityBridge = {
  /**
   * Check if Accessibility module is available
   */
  isAvailable(): boolean {
    return !!NativeAccessibilityModule;
  },

  /**
   * Check if accessibility service is enabled
   */
  async isEnabled(): Promise<boolean> {
    if (!NativeAccessibilityModule) {
      return false;
    }

    try {
      return await NativeAccessibilityModule.isServiceEnabled();
    } catch (error: any) {
      return false;
    }
  },

  /**
   * Enable accessibility service (opens settings)
   */
  async enable(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    // Even if native module exists, we need to guide user to settings
    return new Promise((resolve) => {
      Alert.alert(
        'Enable Accessibility Service',
        'JARVIS needs Accessibility permission to:\n\n' +
        '• Perform system-wide gestures\n' +
        '• Control other apps\n' +
        '• Air hand gesture tracking\n\n' +
        'You will be redirected to Android Settings.\n' +
        'Find "JARVIS" in the list and enable it.',
        [
          { 
            text: 'Cancel', 
            style: 'cancel',
            onPress: () => resolve(false)
          },
          {
            text: 'Open Settings',
            onPress: async () => {
              try {
                await IntentLauncher.startActivityAsync('android.settings.ACCESSIBILITY_SETTINGS');
                // We can't know if user enabled it, so return true to indicate we opened settings
                resolve(true);
              } catch (error) {
                try {
                  await Linking.openSettings();
                  resolve(true);
                } catch (e) {
                  Alert.alert('Error', 'Could not open accessibility settings');
                  resolve(false);
                }
              }
            }
          }
        ]
      );
    });
  },

  /**
   * Disable accessibility service
   */
  async disable(): Promise<void> {
    if (!NativeAccessibilityModule) {
      return;
    }

    try {
      await NativeAccessibilityModule.disableService();
    } catch (error: any) {
      console.error('[AccessibilityBridge] Disable error:', error);
    }
  },

  /**
   * Get accessibility status
   */
  async getStatus(): Promise<AccessibilityStatus | null> {
    if (!NativeAccessibilityModule) {
      return null;
    }

    try {
      return await NativeAccessibilityModule.getStatus();
    } catch (error: any) {
      return null;
    }
  },

  /**
   * Perform gesture via accessibility service
   */
  async performGesture(gesture: string): Promise<boolean> {
    if (!NativeAccessibilityModule) {
      throw new NativeModuleMissingError('AccessibilityModule');
    }

    try {
      return await NativeAccessibilityModule.performGesture(gesture);
    } catch (error: any) {
      throw new Error(`Gesture failed: ${error.message}`);
    }
  }
};

// ==================== GESTURE RECOGNITION MODULE ====================

export const GestureBridge = {
  /**
   * Check if Gesture module is available
   */
  isAvailable(): boolean {
    return !!NativeGestureModule;
  },

  /**
   * Start gesture tracking (MediaPipe)
   */
  async startTracking(): Promise<boolean> {
    if (!NativeGestureModule) {
      NativeModuleMissingError.showAlert('GestureRecognitionModule', 'Air Hand Gestures');
      return false;
    }

    try {
      console.log('[GestureBridge] Starting gesture tracking...');
      const result = await NativeGestureModule.startTracking();
      console.log('[GestureBridge] Tracking started:', result);
      return result;
    } catch (error: any) {
      console.error('[GestureBridge] Start error:', error);
      Alert.alert(
        'Gesture Tracking Failed',
        `Could not start gesture tracking: ${error.message}\n\n` +
        'Make sure camera permission is granted.',
        [{ text: 'OK' }]
      );
      return false;
    }
  },

  /**
   * Stop gesture tracking
   */
  async stopTracking(): Promise<void> {
    if (!NativeGestureModule) {
      return;
    }

    try {
      console.log('[GestureBridge] Stopping gesture tracking...');
      await NativeGestureModule.stopTracking();
      console.log('[GestureBridge] Tracking stopped');
    } catch (error: any) {
      console.error('[GestureBridge] Stop error:', error);
    }
  },

  /**
   * Check if gesture tracking is active
   */
  async isTracking(): Promise<boolean> {
    if (!NativeGestureModule) {
      return false;
    }

    try {
      return await NativeGestureModule.isTracking();
    } catch (error: any) {
      return false;
    }
  },

  /**
   * Set gesture detection sensitivity
   */
  async setSensitivity(level: number): Promise<void> {
    if (!NativeGestureModule) {
      return;
    }

    try {
      await NativeGestureModule.setSensitivity(Math.max(0, Math.min(100, level)));
    } catch (error: any) {
      console.error('[GestureBridge] Set sensitivity error:', error);
    }
  },

  /**
   * Subscribe to gesture events
   */
  subscribeToGestures(callback: (event: GestureEvent) => void): { remove: () => void } | null {
    if (!eventEmitter) {
      return null;
    }

    try {
      const subscription = eventEmitter.addListener('onGestureDetected', callback);
      return subscription;
    } catch (error) {
      console.error('[GestureBridge] Subscribe error:', error);
      return null;
    }
  },

  /**
   * Subscribe to coordinate updates
   */
  subscribeToCoordinates(callback: (coords: GestureCoordinates) => void): { remove: () => void } | null {
    if (!eventEmitter) {
      return null;
    }

    try {
      const subscription = eventEmitter.addListener('onCoordinateUpdate', callback);
      return subscription;
    } catch (error) {
      console.error('[GestureBridge] Subscribe coordinates error:', error);
      return null;
    }
  }
};

// ==================== AIR KEYBOARD MODULE ====================

export const AirKeyboardBridge = {
  /**
   * Check if Air Keyboard module is available
   */
  isAvailable(): boolean {
    return !!NativeAirKeyboardModule;
  },

  /**
   * Show air keyboard
   */
  async show(): Promise<void> {
    if (!NativeAirKeyboardModule) {
      NativeModuleMissingError.showAlert('AirKeyboardModule', 'Air Keyboard');
      return;
    }

    try {
      await NativeAirKeyboardModule.show();
    } catch (error: any) {
      console.error('[AirKeyboardBridge] Show error:', error);
    }
  },

  /**
   * Hide air keyboard
   */
  async hide(): Promise<void> {
    if (!NativeAirKeyboardModule) {
      return;
    }

    try {
      await NativeAirKeyboardModule.hide();
    } catch (error: any) {
      console.error('[AirKeyboardBridge] Hide error:', error);
    }
  },

  /**
   * Check if air keyboard is visible
   */
  async isVisible(): Promise<boolean> {
    if (!NativeAirKeyboardModule) {
      return false;
    }

    try {
      return await NativeAirKeyboardModule.isVisible();
    } catch (error: any) {
      return false;
    }
  }
};

// ==================== OVERLAY PERMISSION ====================

export const OverlayBridge = {
  /**
   * Request overlay permission
   */
  async request(): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      await IntentLauncher.startActivityAsync('android.settings.action.MANAGE_OVERLAY_PERMISSION');
    } catch (error) {
      console.error('[OverlayBridge] Could not open overlay settings');
    }
  }
};

// ==================== COMBINED EXPORT ====================

export const NativeBridge = {
  isProductionBuild,
  
  Vpn: VpnBridge,
  Shizuku: ShizukuBridge,
  Accessibility: AccessibilityBridge,
  Gesture: GestureBridge,
  AirKeyboard: AirKeyboardBridge,
  Overlay: OverlayBridge,

  /**
   * Check all native module availability
   */
  checkAvailability() {
    return {
      vpn: VpnBridge.isAvailable(),
      shizuku: ShizukuBridge.isAvailable(),
      accessibility: AccessibilityBridge.isAvailable(),
      gesture: GestureBridge.isAvailable(),
      airKeyboard: AirKeyboardBridge.isAvailable(),
    };
  },

  /**
   * Show global native module warning
   */
  showDevelopmentWarning() {
    if (!isProductionBuild) {
      console.warn(
        '[NativeBridge] Running in development mode (Expo Go). ' +
        'Native modules are not available. Build with EAS to enable.'
      );
    }
  }
};

export default NativeBridge;
