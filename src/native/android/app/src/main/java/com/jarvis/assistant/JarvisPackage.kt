package com.jarvis.assistant

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import com.jarvis.assistant.modules.*

/**
 * JARVIS Native Modules Package
 * 
 * This package registers all native Android modules with React Native.
 * It MUST be added to the getPackages() list in MainApplication.
 * 
 * Registered Modules:
 * - ShizukuModule: Elevated privileges via Shizuku
 * - AccessibilityModule: System-wide gesture control
 * - VpnModule: P2P VPN tunnel
 * - GestureRecognitionModule: MediaPipe hand tracking
 * - AirKeyboardModule: Air typing interface
 */
class JarvisPackage : ReactPackage {
    
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        val modules: MutableList<NativeModule> = ArrayList()
        
        // Core modules
        modules.add(ShizukuModule(reactContext))
        modules.add(AccessibilityModule(reactContext))
        modules.add(VpnModule(reactContext))
        modules.add(GestureRecognitionModule(reactContext))
        modules.add(AirKeyboardModule(reactContext))
        
        return modules
    }
    
    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
