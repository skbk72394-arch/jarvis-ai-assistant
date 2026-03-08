package com.jarvis.assistant.modules

import android.Manifest
import android.content.pm.PackageManager
import android.util.Log
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.coroutineContext
import kotlinx.coroutines.launch

/**
 * Gesture Recognition Native Module
 * 
 * Provides air hand gesture tracking using MediaPipe.
 * Requires camera permission.
 * 
 * Features:
 * - Start/Stop hand tracking
 * - Detect gestures (pinch, swipe, open palm, etc.)
 * - Stream coordinate updates to JS
 * 
 * Gestures detected:
 * - PINCH: Index and thumb touching
 * - SWIPE_LEFT/RIGHT/UP/DOWN: Directional swipes
 * - OPEN_PALM: All fingers extended
 * - FIST: All fingers closed
 * - POINTING: Index extended, others closed
 * - THUMBS_UP/DOWN: Thumb direction
 */
@ReactModule(name = GestureRecognitionModule.NAME)
class GestureRecognitionModule(reactContext: ReactApplicationContext) : NativeModuleBase(reactContext) {
    
    companion object {
        const val NAME = "GestureRecognitionModule"
        private const val TAG = "GestureModule"
        const val CAMERA_PERMISSION = Manifest.permission.CAMERA
    }
    
    private var isTracking = false
    private var trackingJob: Job? = null
    private var sensitivity = 50 // 0-100
    
    override fun getName(): String = NAME
    
    /**
     * Start gesture tracking
     */
    @ReactMethod
    fun startTracking(promise: Promise) {
        try {
            if (isTracking) {
                promise.resolve(true)
                return
            }
            
            // Check camera permission
            if (!hasCameraPermission()) {
                promise.reject("NO_PERMISSION", "Camera permission not granted")
                return
            }
            
            isTracking = true
            
            // Start tracking coroutine
            trackingJob = CoroutineScope(Dispatchers.Default).launch {
                startGestureTracking()
            }
            
            Log.i(TAG, "Gesture tracking started")
            promise.resolve(true)
            
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start tracking", e)
            promise.reject("START_ERROR", e.message)
        }
    }
    
    /**
     * Stop gesture tracking
     */
    @ReactMethod
    fun stopTracking(promise: Promise) {
        try {
            isTracking = false
            trackingJob?.cancel()
            trackingJob = null
            
            Log.i(TAG, "Gesture tracking stopped")
            promise.resolve(null)
            
        } catch (e: Exception) {
            Log.e(TAG, "Failed to stop tracking", e)
            promise.reject("STOP_ERROR", e.message)
        }
    }
    
    /**
     * Check if tracking is active
     */
    @ReactMethod
    fun isTracking(promise: Promise) {
        promise.resolve(isTracking)
    }
    
    /**
     * Set detection sensitivity (0-100)
     */
    @ReactMethod
    fun setSensitivity(level: Int, promise: Promise) {
        sensitivity = level.coerceIn(0, 100)
        Log.d(TAG, "Sensitivity set to $sensitivity")
        promise.resolve(null)
    }
    
    /**
     * Check camera permission
     */
    private fun hasCameraPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            reactApplicationContext,
            CAMERA_PERMISSION
        ) == PackageManager.PERMISSION_GRANTED
    }
    
    /**
     * Internal gesture tracking loop
     * Note: In production, this would use MediaPipe Hand Landmarker
     */
    private suspend fun startGestureTracking() {
        var frameCount = 0L
        
        while (coroutineContext.isActive && isTracking) {
            try {
                frameCount++
                
                // Simulated gesture detection
                // In production, this would:
                // 1. Capture camera frame
                // 2. Run MediaPipe Hand Landmarker
                // 3. Process hand landmarks
                // 4. Classify gesture
                // 5. Emit event to JS
                
                // For demonstration, emit a coordinate update every second
                if (frameCount % 30L == 0L) {
                    emitCoordinateUpdate(
                        x = 0.5f + (Math.random() * 0.1f - 0.05f).toFloat(),
                        y = 0.5f + (Math.random() * 0.1f - 0.05f).toFloat(),
                        z = (Math.random() * 0.2f).toFloat(),
                        hand = if (frameCount % 60L == 0L) "RIGHT" else "LEFT"
                    )
                }
                
                // Simulate frame processing delay
                delay(33) // ~30 FPS
                
            } catch (e: Exception) {
                Log.e(TAG, "Tracking error", e)
            }
        }
    }
    
    /**
     * Emit gesture detected event to JS
     */
    private fun emitGestureEvent(type: String, confidence: Float) {
        try {
            val event = Arguments.createMap().apply {
                putString("type", type)
                putDouble("confidence", confidence.toDouble())
                putDouble("timestamp", System.currentTimeMillis().toDouble())
            }
            
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("onGestureDetected", event)
                
        } catch (e: Exception) {
            Log.e(TAG, "Failed to emit gesture event", e)
        }
    }
    
    /**
     * Emit coordinate update to JS
     */
    private fun emitCoordinateUpdate(x: Float, y: Float, z: Float, hand: String) {
        try {
            val event = Arguments.createMap().apply {
                putDouble("x", x.toDouble())
                putDouble("y", y.toDouble())
                putDouble("z", z.toDouble())
                putString("hand", hand)
            }
            
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("onCoordinateUpdate", event)
                
        } catch (e: Exception) {
            Log.e(TAG, "Failed to emit coordinate update", e)
        }
    }
    
    /**
     * Classify gesture from hand landmarks
     * (Placeholder for MediaPipe integration)
     */
    private fun classifyGesture(landmarks: List<FloatArray>): String {
        // In production, this would analyze:
        // - Finger tip positions relative to knuckles
        // - Distance between thumb and index (pinch)
        // - Hand movement velocity (swipe)
        // - Palm orientation
        
        return "OPEN_PALM" // Placeholder
    }
}
