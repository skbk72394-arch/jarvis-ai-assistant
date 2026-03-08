/**
 * JARVIS Native Bridge - Export Index
 * 
 * This module provides TypeScript interfaces to native Android modules.
 * 
 * IMPORTANT: These native modules only work after EAS Build.
 * In Expo Go (development), all modules will be undefined and fallbacks will be used.
 * 
 * Usage:
 * ```typescript
 * import NativeBridge, { VpnBridge, ShizukuBridge, GestureBridge } from '../bridge';
 * 
 * // Check availability
 * if (VpnBridge.isAvailable()) {
 *   const granted = await VpnBridge.prepare();
 * }
 * ```
 * 
 * To build with native modules:
 * ```bash
 * eas build -p android --profile preview
 * ```
 */

export {
  default as NativeBridge,
  VpnBridge,
  ShizukuBridge,
  AccessibilityBridge,
  GestureBridge,
  AirKeyboardBridge,
  OverlayBridge,
  NativeModuleMissingError,
  isProductionBuild,
} from './NativeBridge';

export type {
  NativeModuleError,
  VpnStats,
  GestureEvent,
  GestureCoordinates,
  ShizukuStatus,
  AccessibilityStatus,
} from './NativeBridge';
