package com.anpos.mobile.modules

import com.facebook.react.bridge.*
import android.content.Context
import android.net.wifi.WifiManager
import android.net.ConnectivityManager
import java.net.InetAddress
import java.net.NetworkInterface
import java.util.*

class AnposNetworkModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val context: Context = reactApplicationContext

    override fun getName(): String = "AnposNetwork"

    @ReactMethod
    fun getIPAddresses(promise: Promise) {
        try {
            val result = Arguments.createArray()
            val interfaces = NetworkInterface.getNetworkInterfaces()
            for (intf in Collections.list(interfaces)) {
                val addresses = intf.inetAddresses
                while (addresses.hasMoreElements()) {
                    val addr = addresses.nextElement()
                    val ip = addr.hostAddress
                    if (ip != null && !addr.isLoopbackAddress && addr is java.net.Inet4Address) {
                        val map = Arguments.createMap()
                        map.putString("name", intf.name)
                        map.putString("ip", ip)
                        map.putBoolean("isInternal", addr.isSiteLocalAddress)
                        result.pushMap(map)
                    }
                }
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERR_IP", e)
        }
    }

    @ReactMethod
    fun getLocalIP(promise: Promise) {
        try {
            val interfaces = NetworkInterface.getNetworkInterfaces()
            for (intf in Collections.list(interfaces)) {
                val addresses = intf.inetAddresses
                while (addresses.hasMoreElements()) {
                    val addr = addresses.nextElement()
                    if (!addr.isLoopbackAddress && addr is java.net.Inet4Address && addr.isSiteLocalAddress) {
                        promise.resolve(addr.hostAddress)
                        return
                    }
                }
            }
            promise.resolve("192.168.1.1")
        } catch (e: Exception) {
            promise.reject("ERR_LOCAL_IP", e)
        }
    }

    @ReactMethod
    fun getGateway(promise: Promise) {
        try {
            val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager?
            val dhcpInfo = wifiManager?.dhcpInfo
            val ip = dhcpInfo?.gateway ?: 0
            val gateway = String.format(
                "%d.%d.%d.%d",
                (ip and 0xFF),
                (ip shr 8 and 0xFF),
                (ip shr 16 and 0xFF),
                (ip shr 24 and 0xFF)
            )
            promise.resolve(gateway)
        } catch (e: Exception) {
            promise.resolve("")
        }
    }

    @ReactMethod
    fun getSubnet(promise: Promise) {
        try {
            val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager?
            val ip = wifiManager?.connectionInfo?.ipAddress ?: 0
            val subnet = (ip and 0x00FFFFFF).let {
                String.format(
                    "%d.%d.%d",
                    (it and 0xFF),
                    (it shr 8 and 0xFF),
                    (it shr 16 and 0xFF)
                )
            }
            val localIp = getLocalIPSync()
            if (localIp.startsWith("192.168.0")) promise.resolve("192.168.0")
            else if (localIp.startsWith("10.0")) promise.resolve("10.0")
            else promise.resolve(subnet)
        } catch (e: Exception) {
            promise.resolve("192.168.1")
        }
    }

    private fun getLocalIPSync(): String {
        try {
            val interfaces = NetworkInterface.getNetworkInterfaces()
            for (intf in Collections.list(interfaces)) {
                val addresses = intf.inetAddresses
                while (addresses.hasMoreElements()) {
                    val addr = addresses.nextElement()
                    if (!addr.isLoopbackAddress && addr is java.net.Inet4Address && addr.isSiteLocalAddress) {
                        return addr.hostAddress
                    }
                }
            }
        } catch (e: Exception) {}
        return "192.168.1.1"
    }

    @ReactMethod
    fun getSSID(promise: Promise) {
        try {
            val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager?
            val ssid = wifiManager?.connectionInfo?.ssid?.replace("\"", "") ?: ""
            promise.resolve(ssid)
        } catch (e: Exception) {
            promise.resolve("")
        }
    }

    @ReactMethod
    fun isOnline(promise: Promise) {
        try {
            val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            val activeNetwork = cm.activeNetworkInfo
            promise.resolve(activeNetwork?.isConnectedOrConnecting == true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun isOnWifi(promise: Promise) {
        try {
            val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            val activeNetwork = cm.activeNetworkInfo
            promise.resolve(activeNetwork?.type == ConnectivityManager.TYPE_WIFI)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }
}
