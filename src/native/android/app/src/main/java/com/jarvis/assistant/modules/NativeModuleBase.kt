package com.jarvis.assistant.modules

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule

/**
 * Base class for JARVIS native modules
 * Provides common functionality and logging
 */
abstract class NativeModuleBase(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    protected val context: ReactApplicationContext
        get() = reactApplicationContext
    
    /**
     * Log debug message with module tag
     */
    protected fun logDebug(message: String) {
        android.util.Log.d(name, message)
    }
    
    /**
     * Log info message with module tag
     */
    protected fun logInfo(message: String) {
        android.util.Log.i(name, message)
    }
    
    /**
     * Log warning with module tag
     */
    protected fun logWarn(message: String) {
        android.util.Log.w(name, message)
    }
    
    /**
     * Log error with module tag
     */
    protected fun logError(message: String, throwable: Throwable? = null) {
        if (throwable != null) {
            android.util.Log.e(name, message, throwable)
        } else {
            android.util.Log.e(name, message)
        }
    }
}
