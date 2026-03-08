package com.jarvis.assistant.modules

import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule

/**
 * Air Keyboard Native Module
 * 
 * Provides air typing interface using hand gestures.
 * Works in conjunction with GestureRecognitionModule.
 * 
 * Features:
 * - Show/hide air keyboard overlay
 * - Process key selections from air gestures
 * - Visual feedback for typing
 */
@ReactModule(name = AirKeyboardModule.NAME)
class AirKeyboardModule(reactContext: ReactApplicationContext) : NativeModuleBase(reactContext) {
    
    companion object {
        const val NAME = "AirKeyboardModule"
        private const val TAG = "AirKeyboardModule"
    }
    
    private var isVisible = false
    private var currentText = StringBuilder()
    
    override fun getName(): String = NAME
    
    /**
     * Show air keyboard
     */
    @ReactMethod
    fun show(promise: Promise) {
        try {
            isVisible = true
            Log.i(TAG, "Air keyboard shown")
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("SHOW_ERROR", e.message)
        }
    }
    
    /**
     * Hide air keyboard
     */
    @ReactMethod
    fun hide(promise: Promise) {
        try {
            isVisible = false
            Log.i(TAG, "Air keyboard hidden")
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("HIDE_ERROR", e.message)
        }
    }
    
    /**
     * Check if keyboard is visible
     */
    @ReactMethod
    fun isVisible(promise: Promise) {
        promise.resolve(isVisible)
    }
    
    /**
     * Process a key press from air gesture
     */
    @ReactMethod
    fun processKey(key: String, promise: Promise) {
        try {
            when (key) {
                "backspace" -> {
                    if (currentText.isNotEmpty()) {
                        currentText.deleteCharAt(currentText.length - 1)
                    }
                }
                "clear" -> {
                    currentText.clear()
                }
                "space" -> {
                    currentText.append(" ")
                }
                else -> {
                    currentText.append(key)
                }
            }
            
            Log.d(TAG, "Processed key: $key, current text: $currentText")
            promise.resolve(currentText.toString())
            
        } catch (e: Exception) {
            Log.e(TAG, "Failed to process key", e)
            promise.reject("KEY_ERROR", e.message)
        }
    }
    
    /**
     * Get current text buffer
     */
    @ReactMethod
    fun getText(promise: Promise) {
        promise.resolve(currentText.toString())
    }
    
    /**
     * Clear text buffer
     */
    @ReactMethod
    fun clearText(promise: Promise) {
        currentText.clear()
        promise.resolve(null)
    }
}
