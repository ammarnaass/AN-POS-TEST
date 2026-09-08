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
                val adapter = bluetoothAdapter
                if (adapter == null || !adapter.isEnabled) {
                    promise.resolve(false)
                    return
                }
                val device = adapter.getRemoteDevice(address)
                if (device == null) {
                    promise.resolve(false)
                    return
                }
                val uuid = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB") // Standard Serial Port Profile (SPP) UUID
                try {
                    val socket = device.createRfcommSocketToServiceRecord(uuid)
                    socket.connect()
                    btSocket = socket
                    connectedPrinter = device
                    promise.resolve(true)
                } catch (e: Exception) {
                    try {
                        val fallbackSocket = device.createInsecureRfcommSocketToServiceRecord(uuid)
                        fallbackSocket.connect()
                        btSocket = fallbackSocket
                        connectedPrinter = device
                        promise.resolve(true)
                    } catch (e2: Exception) {
                        promise.resolve(false)
                    }
                }
            } else {
                promise.resolve(false)
            }
        } catch (e: Throwable) {
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

            val shopName = data.getString("shopName") ?: "AN POS"
            val number = data.getString("number") ?: ""
            val date = if (data.hasKey("date")) data.getString("date") ?: "" else ""
            val customerName = if (data.hasKey("customerName")) data.getString("customerName") ?: "" else ""
            val customerPhone = if (data.hasKey("customerPhone")) data.getString("customerPhone") ?: "" else ""
            val customerRc = if (data.hasKey("customerRc")) data.getString("customerRc") ?: "" else ""
            val customerNif = if (data.hasKey("customerNif")) data.getString("customerNif") ?: "" else ""
            val paymentMethod = if (data.hasKey("paymentMethod")) data.getString("paymentMethod") ?: "" else ""
            val soldBy = if (data.hasKey("soldBy")) data.getString("soldBy") ?: "" else ""

            val discount = if (data.hasKey("discount")) data.getDouble("discount") else 0.0
            val tax = if (data.hasKey("tax")) data.getDouble("tax") else 0.0
            val total = if (data.hasKey("total")) data.getDouble("total") else 0.0

            val formerBalance = if (data.hasKey("formerBalance")) data.getDouble("formerBalance") else 0.0
            val paidAmount = if (data.hasKey("paidAmount")) data.getDouble("paidAmount") else 0.0
            val newBalance = if (data.hasKey("newBalance")) data.getDouble("newBalance") else 0.0

            val commands = StringBuilder()
            // Reset / Init printer
            outputStream.write(byteArrayOf(0x1B, 0x40))

            commands.append("\n").append(shopName).append("\n")
            commands.append("================================\n")
            commands.append("Doc: ").append(number).append("\n")
            if (date.isNotEmpty()) commands.append("Date: ").append(date).append("\n")
            if (soldBy.isNotEmpty()) commands.append("Vendeur: ").append(soldBy).append("\n")

            if (customerName.isNotEmpty()) {
                commands.append("--------------------------------\n")
                commands.append("Client: ").append(customerName).append("\n")
                if (customerPhone.isNotEmpty()) commands.append("Tel: ").append(customerPhone).append("\n")
                if (customerRc.isNotEmpty() || customerNif.isNotEmpty()) {
                    commands.append("RC: ").append(customerRc).append(" | NIF: ").append(customerNif).append("\n")
                }
            }

            commands.append("--------------------------------\n")
            commands.append(String.format("%-18s %4s %8s\n", "Designation", "Qte", "Total"))
            commands.append("--------------------------------\n")

            if (data.hasKey("items")) {
                val items = data.getArray("items")
                if (items != null) {
                    for (i in 0 until items.size()) {
                        val item = items.getMap(i) ?: continue
                        val name = item.getString("name") ?: "Item"
                        val qty = if (item.hasKey("qty")) item.getDouble("qty") else 1.0
                        val lineTotal = if (item.hasKey("lineTotal")) item.getDouble("lineTotal") else 0.0

                        val truncatedName = if (name.length > 18) name.substring(0, 18) else name
                        commands.append(String.format("%-18s %4.0f %8.2f\n", truncatedName, qty, lineTotal))
                    }
                }
            }

            commands.append("================================\n")
            if (discount > 0) commands.append(String.format("Remise:                 -%8.2f\n", discount))
            if (tax > 0) commands.append(String.format("TVA:                    +%8.2f\n", tax))
            commands.append(String.format("TOTAL:                   %8.2f DZD\n", total))
            if (paymentMethod.isNotEmpty()) commands.append("Mode: ").append(paymentMethod).append("\n")

            // Wholesale Customer Ledger
            if (formerBalance != 0.0 || paidAmount > 0.0 || newBalance != 0.0) {
                commands.append("--------------------------------\n")
                commands.append("Situation Client / Solde:\n")
                commands.append(String.format("Ancien Solde:            %8.2f DZD\n", formerBalance))
                commands.append(String.format("Montant Verse:           %8.2f DZD\n", paidAmount))
                commands.append(String.format("Nouveau Solde:           %8.2f DZD\n", newBalance))
            }

            commands.append("================================\n")
            commands.append("Merci pour votre visite!\n\n\n")

            outputStream.write(commands.toString().toByteArray(Charsets.UTF_8))
            outputStream.write(0x0A)

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
            outputStream.write(byteArrayOf(0x1D.toByte(), 0x64.toByte(), 0x01.toByte()))
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
            outputStream.write(byteArrayOf(0x1D.toByte(), 0x56.toByte(), 0x00.toByte()))
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
            outputStream.write(byteArrayOf(0x1B.toByte(), 0x70.toByte(), 0x00.toByte(), 0x19.toByte(), 0xFF.toByte()))
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    companion object {
        const val NAME = "AnposPrinter"
    }
}
