package com.anpos.mobile.modules

import com.facebook.react.bridge.*
import android.content.Context
import android.net.wifi.WifiManager
import android.net.ConnectivityManager
import java.net.InetAddress
import java.net.NetworkInterface
import java.net.DatagramSocket
import java.net.DatagramPacket
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
            val ip = getLocalIPSync()
            promise.resolve(ip)
        } catch (e: Exception) {
            promise.resolve("192.168.1.1")
        }
    }

    @ReactMethod
    fun getGateway(promise: Promise) {
        try {
            val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager?
            val dhcpInfo = wifiManager?.dhcpInfo
            val ip = dhcpInfo?.gateway ?: 0
            if (ip != 0) {
                val gateway = String.format(
                    "%d.%d.%d.%d",
                    (ip and 0xFF),
                    (ip shr 8 and 0xFF),
                    (ip shr 16 and 0xFF),
                    (ip shr 24 and 0xFF)
                )
                promise.resolve(gateway)
                return
            }
            val localIp = getLocalIPSync()
            val parts = localIp.split(".")
            if (parts.size == 4) {
                promise.resolve("${parts[0]}.${parts[1]}.${parts[2]}.1")
                return
            }
            promise.resolve("")
        } catch (e: Exception) {
            promise.resolve("")
        }
    }

    @ReactMethod
    fun getSubnet(promise: Promise) {
        try {
            val localIp = getLocalIPSync()
            val parts = localIp.split(".")
            if (parts.size == 4 && localIp != "127.0.0.1" && !localIp.startsWith("0.0.0")) {
                promise.resolve("${parts[0]}.${parts[1]}.${parts[2]}")
                return
            }
            promise.resolve("192.168.1")
        } catch (e: Exception) {
            promise.resolve("192.168.1")
        }
    }

    private fun getLocalIPSync(): String {
        try {
            val interfaces = NetworkInterface.getNetworkInterfaces()
            for (intf in Collections.list(interfaces)) {
                if (intf.isLoopback || !intf.isUp) continue
                val addresses = intf.inetAddresses
                while (addresses.hasMoreElements()) {
                    val addr = addresses.nextElement()
                    if (!addr.isLoopbackAddress && addr is java.net.Inet4Address) {
                        val host = addr.hostAddress
                        if (host != null && !host.startsWith("127.") && !host.startsWith("0.")) {
                            return host
                        }
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

    @ReactMethod
    fun discoverDesktop(timeoutMs: Int, promise: Promise) {
        Thread {
            var socket: DatagramSocket? = null
            try {
                socket = DatagramSocket()
                socket.broadcast = true
                val actualTimeout = if (timeoutMs > 0) timeoutMs else 1200
                socket.soTimeout = actualTimeout

                val requestMsg = """{"type":"anpos-discover-request","v":1}""".toByteArray(Charsets.UTF_8)
                val broadcastAddr = InetAddress.getByName("255.255.255.255")
                val packet = DatagramPacket(requestMsg, requestMsg.size, broadcastAddr, 41999)
                socket.send(packet)

                val results = Arguments.createArray()
                val seenIps = HashSet<String>()
                val buffer = ByteArray(2048)
                val deadline = System.currentTimeMillis() + actualTimeout

                while (System.currentTimeMillis() < deadline) {
                    try {
                        val replyPacket = DatagramPacket(buffer, buffer.size)
                        socket.receive(replyPacket)
                        val senderIp = replyPacket.address.hostAddress ?: ""
                        if (senderIp.isNotEmpty() && !seenIps.contains(senderIp)) {
                            seenIps.add(senderIp)
                            val json = String(replyPacket.data, 0, replyPacket.length, Charsets.UTF_8)
                            val map = Arguments.createMap()
                            map.putString("ip", senderIp)
                            map.putString("raw", json)
                            results.pushMap(map)
                        }
                    } catch (e: java.net.SocketTimeoutException) {
                        break
                    } catch (e: Exception) {
                        break
                    }
                }
                promise.resolve(results)
            } catch (e: Exception) {
                promise.resolve(Arguments.createArray())
            } finally {
                try {
                    socket?.close()
                } catch (e: Exception) {}
            }
        }.start()
    }
}
