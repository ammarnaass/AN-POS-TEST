package com.anpos.mobile.modules

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Color
import android.net.Uri
import android.provider.MediaStore
import android.util.Base64
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import java.io.ByteArrayOutputStream
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

@androidx.camera.core.ExperimentalGetImage
class AnposCameraModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ActivityEventListener {

    private val CAMERA_REQ_CODE = 100
    private val IMAGE_PICK_CODE = 101
    private val IMAGE_CAPTURE_CODE = 102

    private var isScanning = false
    private var cameraProvider: ProcessCameraProvider? = null
    private var cameraExecutor: ExecutorService? = null
    private var previewView: PreviewView? = null
    private var overlayFrame: FrameLayout? = null

    private var imagePickerPromise: Promise? = null

    init {
        reactContext.addActivityEventListener(this)
    }

    override fun getName(): String = "AnposCamera"

    override fun getConstants(): MutableMap<String, Any> = mutableMapOf()

    @ReactMethod
    fun requestPermission(promise: Promise) {
        val activity = getCurrentActivity()
        if (activity == null) {
            promise.resolve(false)
            return
        }
        if (ContextCompat.checkSelfPermission(activity, Manifest.permission.CAMERA)
            == PackageManager.PERMISSION_GRANTED
        ) {
            promise.resolve(true)
            return
        }
        ActivityCompat.requestPermissions(
            activity,
            arrayOf(Manifest.permission.CAMERA),
            CAMERA_REQ_CODE
        )
        promise.resolve(true)
    }

    @ReactMethod
    fun isPermissionGranted(promise: Promise) {
        val granted = ContextCompat.checkSelfPermission(
            reactApplicationContext, Manifest.permission.CAMERA
        ) == PackageManager.PERMISSION_GRANTED
        promise.resolve(granted)
    }

    @ReactMethod
    fun startScan() {
        val activity = getCurrentActivity() ?: return
        isScanning = true

        activity.runOnUiThread {
            if (overlayFrame != null) {
                return@runOnUiThread
            }

            val root = activity.window.decorView as ViewGroup

            overlayFrame = FrameLayout(activity).apply {
                setBackgroundColor(Color.BLACK)
                layoutParams = ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                )
            }

            previewView = PreviewView(activity).apply {
                layoutParams = ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                )
            }

            overlayFrame!!.addView(previewView)
            root.addView(overlayFrame)

            bindCamera(activity as LifecycleOwner)
        }
    }

    private fun bindCamera(lifecycleOwner: LifecycleOwner) {
        val context = reactApplicationContext
        cameraExecutor = Executors.newSingleThreadExecutor()

        val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
        cameraProviderFuture.addListener({
            cameraProvider = cameraProviderFuture.get()

            val preview = Preview.Builder().build().also {
                it.setSurfaceProvider(previewView!!.surfaceProvider)
            }

            val barcodeScanner = BarcodeScanning.getClient()

            val imageAnalysis = ImageAnalysis.Builder()
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build()

            var lastCode = ""
            var lastTime = 0L

            imageAnalysis.setAnalyzer(cameraExecutor!!) { imageProxy ->
                val mediaImage = imageProxy.image
                if (mediaImage != null && isScanning) {
                    val inputImage = InputImage.fromMediaImage(
                        mediaImage,
                        imageProxy.imageInfo.rotationDegrees
                    )
                    barcodeScanner.process(inputImage)
                        .addOnSuccessListener { barcodes ->
                            val now = System.currentTimeMillis()
                            for (barcode in barcodes) {
                                val rawValue = barcode.rawValue?.trim()
                                if (!rawValue.isNullOrEmpty() && isScanning) {
                                    if (rawValue != lastCode || now - lastTime > 1200) {
                                        lastCode = rawValue
                                        lastTime = now
                                        val format = mapBarcodeFormat(barcode.format)
                                        emitBarcode(rawValue, format)
                                    }
                                    break
                                }
                            }
                        }
                        .addOnCompleteListener { imageProxy.close() }
                } else {
                    imageProxy.close()
                }
            }

            try {
                cameraProvider?.unbindAll()
                cameraProvider?.bindToLifecycle(
                    lifecycleOwner,
                    CameraSelector.DEFAULT_BACK_CAMERA,
                    preview,
                    imageAnalysis
                )
            } catch (e: Exception) {
                // Ignore bind errors
            }
        }, ContextCompat.getMainExecutor(context))
    }

    private fun emitBarcode(code: String, format: String) {
        val params = Arguments.createMap().apply {
            putString("code", code)
            putString("format", format)
        }
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("onBarcodeScan", params)
    }

    private fun mapBarcodeFormat(format: Int): String = when (format) {
        Barcode.FORMAT_QR_CODE -> "qr"
        Barcode.FORMAT_EAN_13 -> "ean13"
        Barcode.FORMAT_EAN_8 -> "ean8"
        Barcode.FORMAT_CODE_128 -> "code128"
        Barcode.FORMAT_CODE_39 -> "code39"
        Barcode.FORMAT_UPC_A -> "upca"
        Barcode.FORMAT_UPC_E -> "upce"
        else -> "unknown"
    }

    private fun stopScanInternal() {
        val activity = getCurrentActivity() ?: return
        activity.runOnUiThread {
            try {
                cameraProvider?.unbindAll()
            } catch (e: Exception) {}
            cameraExecutor?.shutdown()
            cameraExecutor = null

            val root = activity.window.decorView as ViewGroup
            overlayFrame?.let { root.removeView(it) }
            overlayFrame = null
            previewView = null
        }
    }

    @ReactMethod
    fun stopScan() {
        isScanning = false
        stopScanInternal()
    }

    // ── Native Photo Picker & Capture ──

    @ReactMethod
    fun pickImage(promise: Promise) {
        val activity = getCurrentActivity()
        if (activity == null) {
            promise.reject("ERR_NO_ACTIVITY", "Activity not available")
            return
        }
        imagePickerPromise = promise
        try {
            val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
                type = "image/*"
                addCategory(Intent.CATEGORY_OPENABLE)
            }
            activity.startActivityForResult(
                Intent.createChooser(intent, "اختر صورة المنتج"),
                IMAGE_PICK_CODE
            )
        } catch (e: Exception) {
            imagePickerPromise?.reject("ERR_PICK", e.message)
            imagePickerPromise = null
        }
    }

    @ReactMethod
    fun capturePhoto(promise: Promise) {
        val activity = getCurrentActivity()
        if (activity == null) {
            promise.reject("ERR_NO_ACTIVITY", "Activity not available")
            return
        }
        imagePickerPromise = promise
        try {
            val intent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
            activity.startActivityForResult(intent, IMAGE_CAPTURE_CODE)
        } catch (e: Exception) {
            imagePickerPromise?.reject("ERR_CAPTURE", e.message)
            imagePickerPromise = null
        }
    }

    override fun onActivityResult(
        activity: Activity,
        requestCode: Int,
        resultCode: Int,
        data: Intent?
    ) {
        if (requestCode == IMAGE_PICK_CODE) {
            if (resultCode == Activity.RESULT_OK && data?.data != null) {
                val uri: Uri = data.data!!
                imagePickerPromise?.resolve(uri.toString())
            } else {
                imagePickerPromise?.resolve(null)
            }
            imagePickerPromise = null
        } else if (requestCode == IMAGE_CAPTURE_CODE) {
            if (resultCode == Activity.RESULT_OK && data?.extras?.get("data") != null) {
                val bitmap = data.extras!!.get("data") as Bitmap
                val outputStream = ByteArrayOutputStream()
                bitmap.compress(Bitmap.CompressFormat.JPEG, 85, outputStream)
                val byteArray = outputStream.toByteArray()
                val base64 = Base64.encodeToString(byteArray, Base64.NO_WRAP)
                imagePickerPromise?.resolve("data:image/jpeg;base64,$base64")
            } else {
                imagePickerPromise?.resolve(null)
            }
            imagePickerPromise = null
        }
    }

    override fun onNewIntent(intent: Intent) {
        // No-op
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for RN NativeEventEmitter
    }

    @ReactMethod
    fun removeListeners(count: Double) {
        // Required for RN NativeEventEmitter
    }

    companion object {
        const val NAME = "AnposCamera"
    }
}
