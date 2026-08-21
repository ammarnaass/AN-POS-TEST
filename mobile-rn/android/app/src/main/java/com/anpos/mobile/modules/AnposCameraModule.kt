package com.anpos.mobile.modules

import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.util.Size
import androidx.activity.result.ActivityResultCallback
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleObserver
import com.google.mlkit.vision.barcode.BarcodeScanner
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
// Note: We use a simple CameraX-based approach. For full ML Kit integration,
// add the dependency to build.gradle: implementation 'com.google.mlkit:barcode-scanning:17.2.0'

class AnposCameraModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext), LifecycleObserver {

    private val context: ReactApplicationContext = reactApplicationContext
    private val CAMERA_REQ_CODE = 100
    private var preview: androidx.camera.core.Preview? = null
    private var camera: androidx.camera.core.Camera? = null
    private var cameraProvider: androidx.camera.lifecycle.ProcessCameraProvider? = null
    private var barcodeScanner: Any? = null
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
        val granted = ActivityCompat.checkSelfPermission(
            context, Manifest.permission.CAMERA
        ) == PackageManager.PERMISSION_GRANTED
        promise.resolve(granted)
    }

    @ReactMethod
    fun startScan() {
        // Simplified: emit events when barcode detected
        // Full implementation requires CameraX + ML Kit integration
        PromiseBuilder.emitScanStarted()
    }

    @ReactMethod
    fun stopScan() {
        isScanning = false
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for RN module with event emitter
    }

    @ReactMethod
    fun removeListeners(count: Double) {
        // Required for RN module with event emitter
    }

    companion object {
        const val NAME = "AnposCamera"

        fun emitScanResult(code: String, format: String) {
            // Send event to JS
        }
    }
}
