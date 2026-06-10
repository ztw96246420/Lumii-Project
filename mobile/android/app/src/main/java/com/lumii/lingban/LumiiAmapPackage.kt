package com.lumii.lingban

import android.Manifest
import android.content.pm.PackageManager
import android.os.Handler
import android.os.Looper
import androidx.core.content.ContextCompat
import com.amap.api.location.AMapLocationClient
import com.amap.api.location.AMapLocationClientOption
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewManager
import com.facebook.react.uimanager.annotations.ReactProp

class LumiiAmapPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): MutableList<NativeModule> {
    return mutableListOf(LumiiAmapSupportModule(reactContext))
  }

  override fun createViewManagers(reactContext: ReactApplicationContext): MutableList<ViewManager<*, *>> {
    return mutableListOf(LumiiAmapViewManager())
  }
}

class LumiiAmapSupportModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "LumiiAmapSupport"

  override fun getConstants(): MutableMap<String, Any> {
    return mutableMapOf(
      "supportsNativeAmap" to LumiiAmapNativeView.supportsNativeAmap(),
      "supportedAbis" to LumiiAmapNativeView.supportedAbis()
    )
  }

  @ReactMethod
  fun getCurrentLocation(promise: Promise) {
    if (!hasLocationPermission()) {
      promise.reject("LOCATION_PERMISSION_DENIED", "请先允许定位权限")
      return
    }

    val handler = Handler(Looper.getMainLooper())
    var settled = false
    var client: AMapLocationClient? = null

    fun finish(block: () -> Unit) {
      if (settled) return
      settled = true
      handler.removeCallbacksAndMessages(null)
      client?.stopLocation()
      client?.onDestroy()
      client = null
      block()
    }

    try {
      AMapLocationClient.updatePrivacyShow(reactContext, true, true)
      AMapLocationClient.updatePrivacyAgree(reactContext, true)

      client = AMapLocationClient(reactContext)
      val option = AMapLocationClientOption().apply {
        locationMode = AMapLocationClientOption.AMapLocationMode.Hight_Accuracy
        isOnceLocation = true
        isOnceLocationLatest = true
        isNeedAddress = true
        httpTimeOut = 10000
      }

      client?.setLocationOption(option)
      client?.setLocationListener { location ->
        if (location != null && location.errorCode == 0) {
          finish {
            val payload = Arguments.createMap().apply {
              putDouble("latitude", location.latitude)
              putDouble("longitude", location.longitude)
              putDouble("accuracy", location.accuracy.toDouble())
              putString("address", location.address ?: "")
              putString("city", location.city ?: "")
              putString("district", location.district ?: "")
              putInt("locationType", location.locationType)
              putString("provider", location.provider ?: "amap")
            }
            promise.resolve(payload)
          }
        } else {
          finish {
            val message = location?.errorInfo?.takeIf { it.isNotBlank() } ?: "高德定位失败"
            promise.reject("AMAP_LOCATION_FAILED", message)
          }
        }
      }

      handler.postDelayed({
        finish {
          promise.reject("AMAP_LOCATION_TIMEOUT", "定位超时，请到开阔处后重试")
        }
      }, 12000)

      client?.startLocation()
    } catch (error: Exception) {
      finish {
        promise.reject("AMAP_LOCATION_EXCEPTION", error.message ?: "高德定位异常", error)
      }
    }
  }

  private fun hasLocationPermission(): Boolean {
    val fineGranted = ContextCompat.checkSelfPermission(reactContext, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
    val coarseGranted = ContextCompat.checkSelfPermission(reactContext, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
    return fineGranted || coarseGranted
  }
}

class LumiiAmapViewManager : SimpleViewManager<LumiiAmapNativeView>() {
  override fun getName(): String = "LumiiAmapView"

  override fun createViewInstance(reactContext: ThemedReactContext): LumiiAmapNativeView {
    return LumiiAmapNativeView(reactContext)
  }

  @ReactProp(name = "latitude", defaultDouble = 23.1291)
  fun setLatitude(view: LumiiAmapNativeView, value: Double) {
    view.setLatitude(value)
  }

  @ReactProp(name = "longitude", defaultDouble = 113.2644)
  fun setLongitude(view: LumiiAmapNativeView, value: Double) {
    view.setLongitude(value)
  }

  @ReactProp(name = "mapType")
  fun setMapType(view: LumiiAmapNativeView, value: String?) {
    view.setMapType(value)
  }

  @ReactProp(name = "zoom", defaultFloat = 14f)
  fun setZoom(view: LumiiAmapNativeView, value: Float) {
    view.setZoom(value)
  }

  @ReactProp(name = "markerTitle")
  fun setMarkerTitle(view: LumiiAmapNativeView, value: String?) {
    view.setMarkerTitle(value)
  }

  @ReactProp(name = "markerSnippet")
  fun setMarkerSnippet(view: LumiiAmapNativeView, value: String?) {
    view.setMarkerSnippet(value)
  }

  @ReactProp(name = "showTraffic", defaultBoolean = false)
  fun setShowTraffic(view: LumiiAmapNativeView, value: Boolean) {
    view.setShowTraffic(value)
  }
}
