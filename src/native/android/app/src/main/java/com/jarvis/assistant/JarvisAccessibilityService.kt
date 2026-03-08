package com.jarvis.assistant

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.content.Intent
import android.graphics.Path
import android.graphics.Rect
import android.os.Build
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

/**
 * JARVIS Accessibility Service
 * 
 * Provides system-wide gesture control and UI automation.
 * Must be enabled by user in Android Settings > Accessibility.
 * 
 * Capabilities:
 * - Perform gestures (tap, swipe, scroll)
 * - Find and interact with UI elements
 * - Read screen content
 * - Automate app interactions
 */
class JarvisAccessibilityService : AccessibilityService() {
    
    companion object {
        private const val TAG = "JarvisAccessibility"
        
        @Volatile
        private var instance: JarvisAccessibilityService? = null
        
        /**
         * Get the service instance
         */
        fun getInstance(): JarvisAccessibilityService? = instance
        
        /**
         * Check if service is running
         */
        fun isRunning(): Boolean = instance != null
    }
    
    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        Log.i(TAG, "JARVIS Accessibility Service connected")
        
        // Configure service capabilities
        // These should match the accessibility_service_config.xml
    }
    
    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // Process accessibility events
        event?.let {
            val eventType = it.eventType
            val packageName = it.packageName
            
            // Log events for debugging
            when (eventType) {
                AccessibilityEvent.TYPE_VIEW_CLICKED -> {
                    Log.d(TAG, "View clicked in $packageName")
                }
                AccessibilityEvent.TYPE_VIEW_FOCUSED -> {
                    Log.d(TAG, "View focused in $packageName")
                }
                AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED -> {
                    Log.d(TAG, "Window changed: ${it.className}")
                }
                else -> {
                    // Ignore other event types
                }
            }
        }
    }
    
    override fun onInterrupt() {
        Log.w(TAG, "JARVIS Accessibility Service interrupted")
    }
    
    override fun onDestroy() {
        instance = null
        super.onDestroy()
        Log.i(TAG, "JARVIS Accessibility Service destroyed")
    }
    
    /**
     * Perform a tap gesture at specified coordinates
     */
    fun performTap(x: Float, y: Float, durationMs: Long = 100): Boolean {
        val path = Path().apply {
            moveTo(x, y)
        }
        
        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0, durationMs))
            .build()
        
        return dispatchGesture(gesture, null, null)
    }
    
    /**
     * Perform a swipe gesture
     */
    fun performSwipe(
        startX: Float, startY: Float,
        endX: Float, endY: Float,
        durationMs: Long = 500
    ): Boolean {
        val path = Path().apply {
            moveTo(startX, startY)
            lineTo(endX, endY)
        }
        
        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0, durationMs))
            .build()
        
        return dispatchGesture(gesture, null, null)
    }
    
    /**
     * Perform a pinch gesture
     */
    fun performPinch(
        centerX: Float, centerY: Float,
        startDistance: Float, endDistance: Float,
        durationMs: Long = 500
    ): Boolean {
        // Create two finger paths for pinch
        val path1 = Path().apply {
            moveTo(centerX - startDistance / 2, centerY)
            lineTo(centerX - endDistance / 2, centerY)
        }
        
        val path2 = Path().apply {
            moveTo(centerX + startDistance / 2, centerY)
            lineTo(centerX + endDistance / 2, centerY)
        }
        
        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path1, 0, durationMs))
            .addStroke(GestureDescription.StrokeDescription(path2, 0, durationMs))
            .build()
        
        return dispatchGesture(gesture, null, null)
    }
    
    /**
     * Find a node by text
     */
    fun findNodeByText(text: String): AccessibilityNodeInfo? {
        val root = rootInActiveWindow ?: return null
        
        val nodes = root.findAccessibilityNodeInfosByText(text)
        return nodes.firstOrNull()
    }
    
    /**
     * Find a node by view ID
     */
    fun findNodeById(resourceId: String): AccessibilityNodeInfo? {
        val root = rootInActiveWindow ?: return null
        
        val nodes = root.findAccessibilityNodeInfosByViewId(resourceId)
        return nodes.firstOrNull()
    }
    
    /**
     * Click on a node
     */
    fun clickNode(node: AccessibilityNodeInfo): Boolean {
        return node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
    }
    
    /**
     * Scroll a node
     */
    fun scrollNode(node: AccessibilityNodeInfo, direction: Int): Boolean {
        val action = when (direction) {
            0 -> AccessibilityNodeInfo.ACTION_SCROLL_FORWARD
            1 -> AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD
            else -> return false
        }
        return node.performAction(action)
    }
    
    /**
     * Get all clickable nodes on screen
     */
    fun getClickableNodes(): List<AccessibilityNodeInfo> {
        val root = rootInActiveWindow ?: return emptyList()
        val nodes = mutableListOf<AccessibilityNodeInfo>()
        
        findClickableNodes(root, nodes)
        return nodes
    }
    
    private fun findClickableNodes(node: AccessibilityNodeInfo, result: MutableList<AccessibilityNodeInfo>) {
        if (node.isClickable) {
            result.add(node)
        }
        
        for (i in 0 until node.childCount) {
            node.getChild(i)?.let { findClickableNodes(it, result) }
        }
    }
}
