package com.anpos.mobile

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import com.anpos.mobile.modules.AnposNetworkModule
import com.anpos.mobile.modules.AnposCameraModule
import com.anpos.mobile.modules.AnposPrinterModule

class MainReactPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(
            AnposNetworkModule(reactContext),
            AnposCameraModule(reactContext),
            AnposPrinterModule(reactContext)
        )
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
