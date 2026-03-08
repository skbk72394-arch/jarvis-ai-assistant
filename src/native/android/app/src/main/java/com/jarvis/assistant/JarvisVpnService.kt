package com.jarvis.assistant

import android.app.PendingIntent
import android.content.Intent
import android.net.VpnService
import android.os.ParcelFileDescriptor
import android.util.Log
import com.jarvis.assistant.modules.VpnModule
import java.io.FileInputStream
import java.io.FileOutputStream
import java.nio.ByteBuffer
import java.util.concurrent.atomic.AtomicBoolean

/**
 * JARVIS VPN Service
 * 
 * Provides P2P VPN tunnel for secure device-to-device communication.
 * Must be prepared using VpnService.prepare() before starting.
 * 
 * Features:
 * - Create VPN tunnel interface
 * - Route traffic through tunnel
 * - Monitor connection statistics
 */
class JarvisVpnService : VpnService() {
    
    companion object {
        private const val TAG = "JarvisVpnService"
        private const val VPN_ADDRESS = "10.0.0.2"
        private const val VPN_ROUTE = "0.0.0.0"
        private const val VPN_MTU = 1500
        private const val DEFAULT_PORT = 8080
        
        const val ACTION_CONNECT = "com.jarvis.assistant.CONNECT"
        const val ACTION_DISCONNECT = "com.jarvis.assistant.DISCONNECT"
        
        @Volatile
        private var instance: JarvisVpnService? = null
        
        fun getInstance(): JarvisVpnService? = instance
        fun isRunning(): Boolean = instance != null
    }
    
    private var vpnInterface: ParcelFileDescriptor? = null
    private var isRunning = AtomicBoolean(false)
    private var bytesIn: Long = 0
    private var bytesOut: Long = 0
    private var startTime: Long = 0
    
    override fun onCreate() {
        super.onCreate()
        instance = this
        Log.i(TAG, "JARVIS VPN Service created")
    }
    
    override fun onDestroy() {
        disconnect()
        instance = null
        super.onDestroy()
        Log.i(TAG, "JARVIS VPN Service destroyed")
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_CONNECT -> {
                val port = intent.getIntExtra("port", DEFAULT_PORT)
                Thread { connect(port) }.start()
            }
            ACTION_DISCONNECT -> {
                Thread { disconnect() }.start()
            }
        }
        return START_STICKY
    }
    
    /**
     * Establish VPN connection
     */
    private fun connect(port: Int) {
        if (isRunning.get()) {
            Log.w(TAG, "VPN already running")
            return
        }
        
        try {
            // Build VPN interface
            val builder = Builder()
                .setSession("JARVIS P2P VPN")
                .addAddress(VPN_ADDRESS, 32)
                .addRoute(VPN_ROUTE, 0)
                .setMtu(VPN_MTU)
            
            // Add intent to open app when notification is tapped
            val notificationIntent = packageManager.getLaunchIntentForPackage(packageName)
            val pendingIntent = PendingIntent.getActivity(
                this, 0, notificationIntent,
                PendingIntent.FLAG_IMMUTABLE
            )
            
            builder.setConfigureIntent(pendingIntent)
            
            // Establish the interface
            vpnInterface = builder.establish()
            
            if (vpnInterface == null) {
                Log.e(TAG, "Failed to establish VPN interface")
                return
            }
            
            isRunning.set(true)
            startTime = System.currentTimeMillis()
            
            Log.i(TAG, "VPN connected on port $port")
            
            // Start packet processing
            processPackets()
            
        } catch (e: Exception) {
            Log.e(TAG, "Failed to connect VPN", e)
            disconnect()
        }
    }
    
    /**
     * Disconnect VPN
     */
    private fun disconnect() {
        isRunning.set(false)
        
        try {
            vpnInterface?.close()
        } catch (e: Exception) {
            Log.e(TAG, "Error closing VPN interface", e)
        }
        
        vpnInterface = null
        bytesIn = 0
        bytesOut = 0
        
        Log.i(TAG, "VPN disconnected")
    }
    
    /**
     * Process VPN packets
     */
    private fun processPackets() {
        val vpn = vpnInterface ?: return
        
        val input = FileInputStream(vpn.fileDescriptor)
        val output = FileOutputStream(vpn.fileDescriptor)
        
        val buffer = ByteBuffer.allocate(32767)
        
        while (isRunning.get()) {
            try {
                // Read from VPN interface (outgoing packets from device)
                val length = input.read(buffer.array())
                
                if (length > 0) {
                    bytesOut += length
                    
                    // In production, this would:
                    // 1. Parse the IP packet
                    // 2. Encrypt if needed
                    // 3. Send to peer device via P2P connection
                    
                    // For now, just log packet info
                    if (bytesOut % 10000 == 0L) {
                        Log.d(TAG, "Packets: in=$bytesIn, out=$bytesOut")
                    }
                }
                
                // In production, this would also:
                // 1. Receive packets from peer
                // 2. Decrypt if needed
                // 3. Write to VPN interface (incoming packets)
                
            } catch (e: Exception) {
                if (isRunning.get()) {
                    Log.e(TAG, "Packet processing error", e)
                }
            }
        }
    }
    
    /**
     * Get connection statistics
     */
    fun getStats(): VpnStats {
        val uptime = if (isRunning.get() && startTime > 0) {
            (System.currentTimeMillis() - startTime) / 1000
        } else 0
        
        return VpnStats(
            isConnected = isRunning.get(),
            bytesReceived = bytesIn,
            bytesSent = bytesOut,
            uptime = uptime
        )
    }
    
    data class VpnStats(
        val isConnected: Boolean,
        val bytesReceived: Long,
        val bytesSent: Long,
        val uptime: Long
    )
}
