package com.anpos.mobile.modules

import com.facebook.react.bridge.*
import android.Manifest
import android.content.pm.PackageManager
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class AnposCameraModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val context: ReactApplicationContext = reactApplicationContext
    private val CAMERA_REQ_CODE = 100
    private var isScanning = false

    override fun getName(): String = "AnposCamera"

    @ReactMethod
    fun requestPermission(promise: Promise) {
        val activity = currentActivity ?: run { promise.resolve(false); return }
        if (ContextCompat.checkSelfPermission(activity, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            promise.resolve(true)
            return
        }
        ActivityCompat.requestPermissions(activity, arrayOf(Manifest.permission.CAMERA), CAMERA_REQ_CODE)
        promise.resolve(true)
    }

    @ReactMethod
    fun isPermissionGranted(promise: Promise) {
        val granted = ContextCompat.checkSelfPermission(
            context, Manifest.permission.CAMERA
        ) == PackageManager.PERMISSION_GRANTED
        promise.resolve(granted)
    }

    @ReactMethod
    fun startScan() {
        isScanning = true
    }

    @ReactMethod
    fun stopScan() {
        isScanning = false
    }

    @ReactMethod
    fun addListener(eventName: String) {
    }

    @ReactMethod
    fun removeListeners(count: Double) {
    }

    companion object {
        const val NAME = "AnposCamera"
    }
}
