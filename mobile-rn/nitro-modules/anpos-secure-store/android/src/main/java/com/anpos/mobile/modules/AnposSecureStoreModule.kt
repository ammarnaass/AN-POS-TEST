package com.anpos.mobile.modules

import com.anpos.mobile.modules.AnposSecureStoreSpec
import com.anpos.mobile.modules.AnposSecureStoreSpec.AnposSecureStoreInterface
import com.facebook.react.bridge.*
import android.content.Context
import android.content.SharedPreferences

class AnposSecureStoreModule(reactContext: ReactApplicationContext) : AnposSecureStoreSpec(reactContext) {

  private val prefs: SharedPreferences = reactContext.getSharedPreferences("anpos_secure_store", Context.MODE_PRIVATE)

  override fun getName(): String = NAME

  override fun get(key: String): String? {
    return prefs.getString(key, null)
  }

  override fun set(key: String, value: String) {
    prefs.edit().putString(key, value).apply()
  }

  override fun remove(key: String) {
    prefs.edit().remove(key).apply()
  }

  override fun clear() {
    prefs.edit().clear().apply()
  }

  override fun getAllKeys(): Array<String> {
    return prefs.all.keys.toTypedArray()
  }

  companion object {
    const val NAME = "AnposSecureStore"
  }
}

interface AnposSecureStoreModuleSpec {
  fun get(key: String): String?
  fun set(key: String, value: String)
  fun remove(key: String)
  fun clear()
  fun getAllKeys(): Array<String>
}
