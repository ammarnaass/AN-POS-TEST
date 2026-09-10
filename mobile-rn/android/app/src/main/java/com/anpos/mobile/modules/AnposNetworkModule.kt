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
    fun getDeviceInfo(promise: Promise) {
        try {
            val map = Arguments.createMap()
            map.putString("model", android.os.Build.MODEL ?: "")
            map.putString("manufacturer", android.os.Build.MANUFACTURER ?: "")
            map.putString("brand", android.os.Build.BRAND ?: "")

            var deviceName = ""
            try {
                deviceName = android.provider.Settings.Global.getString(context.contentResolver, "device_name") ?: ""
            } catch (e: Exception) {}
            if (deviceName.isEmpty()) {
                try {
                    val m = android.os.Build.MODEL ?: ""
                    val b = android.os.Build.MANUFACTURER ?: ""
                    deviceName = if (m.startsWith(b, ignoreCase = true)) m else "$b $m".trim()
                } catch (e: Exception) {
                    deviceName = "Android Device"
                }
            }
            map.putString("deviceName", deviceName)

            var isTablet = false
            try {
                val config = context.resources.configuration
                isTablet = (config.screenLayout and android.content.res.Configuration.SCREENLAYOUT_SIZE_MASK) >= android.content.res.Configuration.SCREENLAYOUT_SIZE_LARGE
            } catch (e: Exception) {}
            map.putString("deviceType", if (isTablet) "tablet" else "mobile")

            var hardwareId = ""
            try {
                hardwareId = android.provider.Settings.Secure.getString(context.contentResolver, android.provider.Settings.Secure.ANDROID_ID) ?: ""
            } catch (e: Exception) {}
            map.putString("hardwareId", hardwareId)

            var mac = ""
            try {
                val interfaces = NetworkInterface.getNetworkInterfaces()
                for (intf in Collections.list(interfaces)) {
                    if (intf.name.startsWith("wlan") || intf.name.startsWith("eth")) {
                        val hardwareAddress = intf.hardwareAddress
                        if (hardwareAddress != null && hardwareAddress.isNotEmpty()) {
                            val sb = StringBuilder()
                            for (b in hardwareAddress) {
                                sb.append(String.format("%02x:", b))
                            }
                            if (sb.isNotEmpty()) {
                                sb.deleteCharAt(sb.length - 1)
                            }
                            mac = sb.toString()
                            break
                        }
                    }
                }
            } catch (e: Exception) {}
            map.putString("macAddress", mac)
            map.putString("localIp", getLocalIPSync())

            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("ERR_DEVICE_INFO", e)
        }
    }

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
                val targetAddrs = HashSet<InetAddress>()
                try {
                    targetAddrs.add(InetAddress.getByName("255.255.255.255"))
                } catch (e: Exception) {}

                try {
                    val interfaces = NetworkInterface.getNetworkInterfaces()
                    for (intf in Collections.list(interfaces)) {
                        if (intf.isLoopback || !intf.isUp) continue
                        for (intfAddr in intf.interfaceAddresses) {
                            val bcast = intfAddr.broadcast
                            if (bcast != null) {
                                targetAddrs.add(bcast)
                            }
                        }
                    }
                } catch (e: Exception) {}

                for (target in targetAddrs) {
                    try {
                        val packet = DatagramPacket(requestMsg, requestMsg.size, target, 41999)
                        socket.send(packet)
                    } catch (e: Exception) {}
                }

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

    @ReactMethod
    fun discoverZeroconf(timeoutMs: Int, promise: Promise) {
        val actualTimeout = if (timeoutMs > 0) timeoutMs.toLong() else 3500L
        val nsdManager = context.getSystemService(Context.NSD_SERVICE) as? android.net.nsd.NsdManager
        if (nsdManager == null) {
            promise.resolve(Arguments.createArray())
            return
        }

        Thread {
            val results = Arguments.createArray()
            val seenKeys = HashSet<String>()
            val lock = Object()

            val discoveryListener = object : android.net.nsd.NsdManager.DiscoveryListener {
                override fun onDiscoveryStarted(regType: String) {}

                override fun onServiceFound(service: android.net.nsd.NsdServiceInfo) {
                    try {
                        nsdManager.resolveService(service, object : android.net.nsd.NsdManager.ResolveListener {
                            override fun onResolveFailed(serviceInfo: android.net.nsd.NsdServiceInfo, errorCode: Int) {}

                            override fun onServiceResolved(serviceInfo: android.net.nsd.NsdServiceInfo) {
                                val host = serviceInfo.host?.hostAddress ?: ""
                                val port = serviceInfo.port
                                val key = "$host:$port"
                                synchronized(lock) {
                                    if (host.isNotEmpty() && !host.startsWith("127.") && !seenKeys.contains(key)) {
                                        seenKeys.add(key)
                                        val map = Arguments.createMap()
                                        map.putString("ip", host)
                                        map.putInt("port", port)
                                        map.putString("name", serviceInfo.serviceName ?: "AN POS Desktop")
                                        results.pushMap(map)
                                    }
                                }
                            }
                        })
                    } catch (e: Exception) {}
                }

                override fun onServiceLost(service: android.net.nsd.NsdServiceInfo) {}

                override fun onDiscoveryStopped(serviceType: String) {}

                override fun onStartDiscoveryFailed(serviceType: String, errorCode: Int) {
                    try {
                        nsdManager.stopServiceDiscovery(this)
                    } catch (e: Exception) {}
                }

                override fun onStopDiscoveryFailed(serviceType: String, errorCode: Int) {}
            }

            try {
                nsdManager.discoverServices("_anpos._tcp.", android.net.nsd.NsdManager.PROTOCOL_DNS_SD, discoveryListener)
            } catch (e: Exception) {
                promise.resolve(Arguments.createArray())
                return@Thread
            }

            try {
                Thread.sleep(actualTimeout)
            } catch (e: Exception) {}

            try {
                nsdManager.stopServiceDiscovery(discoveryListener)
            } catch (e: Exception) {}

            promise.resolve(results)
        }.start()
    }
}
