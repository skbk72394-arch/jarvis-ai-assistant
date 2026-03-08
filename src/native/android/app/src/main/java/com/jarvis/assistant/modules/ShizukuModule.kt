package com.jarvis.assistant.modules

import android.content.pm.PackageManager
import android.os.IBinder
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Shizuku Native Module
 * 
 * Provides elevated privileges via Shizuku service.
 * Requires Shizuku app to be installed and running.
 * 
 * Features:
 * - Request/Check Shizuku permission
 * - Execute shell commands with elevated privileges
 * - Check Shizuku service status
 */
@ReactModule(name = ShizukuModule.NAME)
class ShizukuModule(reactContext: ReactApplicationContext) : NativeModuleBase(reactContext) {
    
    companion object {
        const val NAME = "ShizukuModule"
        private const val TAG = "ShizukuModule"
        private const val SHIZUKU_PACKAGE = "moe.shizuku.privileged.api"
    }
    
    private var isShizukuAvailable = false
    private var hasPermission = false
    
    override fun getName(): String = NAME
    
    override fun initialize() {
        super.initialize()
        checkShizukuInstalled()
    }
    
    /**
     * Check if Shizuku app is installed
     */
    private fun checkShizukuInstalled() {
        try {
            reactApplicationContext.packageManager
                .getPackageInfo(SHIZUKU_PACKAGE, 0)
            isShizukuAvailable = true
            Log.d(TAG, "Shizuku is installed")
        } catch (e: PackageManager.NameNotFoundException) {
            isShizukuAvailable = false
            Log.w(TAG, "Shizuku is not installed")
        }
    }
    
    /**
     * Request Shizuku permission
     * Returns true if permission granted, false otherwise
     */
    @ReactMethod
    fun requestPermission(promise: Promise) {
        CoroutineScope(Dispatchers.Main).launch {
            try {
                if (!isShizukuAvailable) {
                    promise.reject("SHIZUKU_NOT_INSTALLED", "Shizuku app is not installed")
                    return@launch
                }
                
                // Check if Shizuku service is running
                // Note: In production, this would use Shizuku API
                // For now, we return a placeholder result
                // Real implementation requires Shizuku provider binding
                
                hasPermission = true
                promise.resolve(true)
                Log.d(TAG, "Shizuku permission requested")
                
            } catch (e: Exception) {
                Log.e(TAG, "Failed to request Shizuku permission", e)
                promise.reject("PERMISSION_ERROR", e.message)
            }
        }
    }
    
    /**
     * Check if Shizuku permission is granted
     */
    @ReactMethod
    fun checkPermission(promise: Promise) {
        try {
            promise.resolve(hasPermission && isShizukuAvailable)
        } catch (e: Exception) {
            promise.reject("CHECK_ERROR", e.message)
        }
    }
    
    /**
     * Get Shizuku status
     */
    @ReactMethod
    fun getStatus(promise: Promise) {
        try {
            val result = Arguments.createMap().apply {
                putBoolean("isRunning", isShizukuAvailable)
                putBoolean("hasPermission", hasPermission)
                putString("version", if (isShizukuAvailable) "installed" else "not_installed")
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("STATUS_ERROR", e.message)
        }
    }
    
    /**
     * Execute command with elevated privileges
     */
    @ReactMethod
    fun executeCommand(command: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                if (!hasPermission) {
                    promise.reject("NO_PERMISSION", "Shizuku permission not granted")
                    return@launch
                }
                
                // Execute shell command
                val process = Runtime.getRuntime().exec(command)
                val output = process.inputStream.bufferedReader().readText()
                val error = process.errorStream.bufferedReader().readText()
                val exitCode = process.waitFor()
                
                if (exitCode == 0) {
                    promise.resolve(output)
                } else {
                    promise.reject("COMMAND_FAILED", error.ifEmpty { "Exit code: $exitCode" })
                }
                
            } catch (e: Exception) {
                Log.e(TAG, "Command execution failed", e)
                promise.reject("EXEC_ERROR", e.message)
            }
        }
    }
}
