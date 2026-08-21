package com.anpos.mobile.modules

import com.facebook.react.bridge.*
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.content.Context
import java.util.*

class AnposPrinterModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val context: Context = reactApplicationContext
    private val bluetoothAdapter: BluetoothAdapter? = BluetoothAdapter.getDefaultAdapter()
    private var btSocket: android.bluetooth.BluetoothSocket? = null
    private var connectedPrinter: BluetoothDevice? = null

    override fun getName(): String = "AnposPrinter"

    @ReactMethod
    fun discoverPrinters(promise: Promise) {
        try {
            val result = Arguments.createArray()
            if (bluetoothAdapter?.isEnabled == true) {
                val pairedDevices = bluetoothAdapter?.bondedDevices
                for (device in pairedDevices ?: setOf()) {
                    if (device.bluetoothClass?.deviceClass == 0x00) { // Printer class
                        val map = Arguments.createMap()
                        map.putString("name", device.name ?: "Unknown")
                        map.putString("address", device.address)
                        map.putString("type", "bluetooth")
                        result.pushMap(map)
                    }
                }
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERR_DISCOVER", e)
        }
    }

    @ReactMethod
    fun connect(address: String, type: String, promise: Promise) {
        try {
            if (type == "bluetooth") {
                val device = bluetoothAdapter?.getRemoteDevice(address)
                if (device == null) {
                    promise.resolve(false)
                    return
                }
                // Create RFCOMM socket
                val uuid = UUID.fromString("0000111B-0000-1000-8000-00805F9B34FB") // SPP UUID
                val socket = device.createRfcommSocketToServiceRecord(uuid)
                socket.connect()
                btSocket = socket
                connectedPrinter = device
                promise.resolve(true)
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            e.printStackTrace()
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun disconnect() {
        try {
            btSocket?.close()
            btSocket = null
            connectedPrinter = null
        } catch (e: Exception) {}
    }

    @ReactMethod
    fun printReceipt(data: ReadableMap, promise: Promise) {
        try {
            val socket = btSocket ?: run { promise.resolve(false); return }
            val outputStream = socket.outputStream

            // Build ESC/POS command
            val shopName = data.getString("shopName") ?: "AN POS"
            val number = data.getString("number") ?: ""
            val items = data.getMap("items")

            val commands = StringBuilder()
            commands.append("\n").append(shopName).append("\n")
            commands.append("========================\n")
            commands.append(number).append("\n")

            // Write to socket
            outputStream.write(commands.toString().toByteArray())

            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun printBarcode(data: ReadableMap, promise: Promise) {
        try {
            val socket = btSocket ?: run { promise.resolve(false); return }
            val outputStream = socket.outputStream

            val value = data.getString("value") ?: ""
            // ESC/POS barcode command
            outputStream.write(0x1D.toByte())
            outputStream.write(0x64.toByte())
            outputStream.write(1.toByte()) // 1-D barcode
            outputStream.write(value.toByteArray())
            outputStream.write(0x0A)

            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun cutPaper(promise: Promise) {
        try {
            val socket = btSocket ?: run { promise.resolve(false); return }
            val outputStream = socket.outputStream
            outputStream.write(0x1D.toByte())
            outputStream.write(0x56.toByte())
            outputStream.write(0x00.toByte())
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun openCashDrawer(promise: Promise) {
        try {
            val socket = btSocket ?: run { promise.resolve(false); return }
            val outputStream = socket.outputStream
            outputStream.write(0x1B.toByte())
            outputStream.write(0x70.toByte())
            outputStream.write(0x00.toByte())
            outputStream.write(0x19.toByte())
            outputStream.write(0x12C.toByte())
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    companion object {
        const val NAME = "AnposPrinter"
    }
}
