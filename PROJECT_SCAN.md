# Project Scan Report

This document captures a full-repository scan of `jarvis-ai-assistant` (excluding `node_modules`).

## Top-level overview

- React Native + Expo app.
- Entry point: `App.tsx`.
- Primary source root: `src/`.
- Android native module implementation included under `src/native/android/...`.
- Expo config plugin for native wiring in `plugins/withJarvisNativeSetup.js`.

## File inventory

Scanned files:

- `App.tsx`
- `README.md`
- `app.json`
- `assets/icon.png`
- `assets/splash.png`
- `assets/favicon.png`
- `assets/adaptive-icon.png`
- `babel.config.js`
- `eas.json`
- `package.json`
- `plugins/withJarvisNativeSetup.js`
- `src/bridge/NativeBridge.ts`
- `src/bridge/index.ts`
- `src/components/Animations.tsx`
- `src/components/GestureOverlay.tsx`
- `src/constants/theme.ts`
- `src/navigation/index.tsx`
- `src/native/android/app/src/main/java/com/jarvis/assistant/JarvisAccessibilityService.kt`
- `src/native/android/app/src/main/java/com/jarvis/assistant/JarvisPackage.kt`
- `src/native/android/app/src/main/java/com/jarvis/assistant/JarvisVpnService.kt`
- `src/native/android/app/src/main/java/com/jarvis/assistant/modules/AccessibilityModule.kt`
- `src/native/android/app/src/main/java/com/jarvis/assistant/modules/AirKeyboardModule.kt`
- `src/native/android/app/src/main/java/com/jarvis/assistant/modules/GestureRecognitionModule.kt`
- `src/native/android/app/src/main/java/com/jarvis/assistant/modules/NativeModuleBase.kt`
- `src/native/android/app/src/main/java/com/jarvis/assistant/modules/ShizukuModule.kt`
- `src/native/android/app/src/main/java/com/jarvis/assistant/modules/VpnModule.kt`
- `src/screens/AgentsScreen.tsx`
- `src/screens/ChatScreen.tsx`
- `src/screens/SettingsScreen.tsx`
- `src/services/index.ts`
- `src/stores/index.ts`
- `src/utils/api.ts`
- `tsconfig.json`

## Architecture summary

- **UI shell**
  - Animated splash + navigation mounted in `App.tsx`.
  - Bottom-tab navigation in `src/navigation/index.tsx`.

- **Screens**
  - Chat interactions in `src/screens/ChatScreen.tsx`.
  - Agent management in `src/screens/AgentsScreen.tsx`.
  - Settings in `src/screens/SettingsScreen.tsx`.

- **State + services**
  - Global state with Zustand in `src/stores/index.ts`.
  - Model/runtime service interactions in `src/services/index.ts`.
  - API utility helpers in `src/utils/api.ts`.

- **Native integration**
  - JS bridge wrappers in `src/bridge/`.
  - Android modules/services in `src/native/android/...`.
  - Expo config plugin updates Gradle/Manifest/MainApplication in `plugins/withJarvisNativeSetup.js`.

## Dependency and tooling snapshot

From `package.json`:

- Runtime stack includes Expo SDK 51, React 18, React Native 0.74.
- Navigation: `@react-navigation/native`, bottom tabs.
- State: `zustand`.
- Scripts: `start`, `android`, `ios`, `web`, `lint`.

## Notes

- No automated tests are currently defined in `scripts`.
- Repository includes checked-in `node_modules/` directory in this environment.
