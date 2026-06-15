package com.lumii.lingban

import android.os.Build
import android.widget.FrameLayout
import com.amap.api.maps.AMap
import com.amap.api.maps.CameraUpdateFactory
import com.amap.api.maps.MapView
import com.amap.api.maps.MapsInitializer
import com.amap.api.maps.model.LatLng
import com.amap.api.maps.model.Marker
import com.amap.api.maps.model.MarkerOptions
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.uimanager.ThemedReactContext

class LumiiAmapNativeView(
  private val reactContext: ThemedReactContext
) : FrameLayout(reactContext), LifecycleEventListener {
  private val mapView = createMapViewSafely()
  private var marker: Marker? = null
  private var destroyed = false
  private var latitude = 23.1291
  private var longitude = 113.2644
  private var mapType = "lumii"
  private var zoom = 14f
  private var markerTitle = "云杉宠物友好公园"
  private var markerSnippet = "滨江路 88 号"
  private var showTraffic = false

  init {
    val nativeMapView = mapView
    if (nativeMapView != null) {
      addView(
        nativeMapView,
        LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
      )
      nativeMapView.onCreate(null)
      reactContext.addLifecycleEventListener(this)
      configureMap()
    }
  }

  fun setLatitude(value: Double) {
    latitude = value
    updateCameraAndMarker()
  }

  fun setLongitude(value: Double) {
    longitude = value
    updateCameraAndMarker()
  }

  fun setMapType(value: String?) {
    mapType = value?.takeIf { it.isNotBlank() } ?: "lumii"
    applyMapPresentation()
  }

  fun setZoom(value: Float) {
    zoom = value
    updateCameraAndMarker()
  }

  fun setMarkerTitle(value: String?) {
    markerTitle = value?.takeIf { it.isNotBlank() } ?: "云杉宠物友好公园"
    updateCameraAndMarker()
  }

  fun setMarkerSnippet(value: String?) {
    markerSnippet = value?.takeIf { it.isNotBlank() } ?: "滨江路 88 号"
    updateCameraAndMarker()
  }

  fun setShowTraffic(value: Boolean) {
    showTraffic = value
    applyMapPresentation()
  }

  override fun onHostResume() {
    if (!destroyed) mapView?.onResume()
  }

  override fun onHostPause() {
    if (!destroyed) mapView?.onPause()
  }

  override fun onHostDestroy() {
    destroyMap()
  }

  override fun onDetachedFromWindow() {
    destroyMap()
    super.onDetachedFromWindow()
  }

  private fun configureMap() {
    val aMap = mapView?.map ?: return
    aMap.uiSettings.isZoomControlsEnabled = false
    aMap.uiSettings.isScaleControlsEnabled = false
    aMap.uiSettings.isCompassEnabled = false
    aMap.uiSettings.isMyLocationButtonEnabled = false
    applyMapPresentation()
    updateCameraAndMarker()
  }

  private fun createMapViewSafely(): MapView? {
    if (!supportsNativeAmap()) return null
    return try {
      MapsInitializer.updatePrivacyShow(reactContext, true, true)
      MapsInitializer.updatePrivacyAgree(reactContext, true)
      MapView(reactContext)
    } catch (_: Throwable) {
      null
    }
  }

  private fun applyMapPresentation() {
    val aMap = mapView?.map ?: return
    aMap.mapType = when (mapType) {
      "satellite" -> AMap.MAP_TYPE_SATELLITE
      "night" -> AMap.MAP_TYPE_NIGHT
      else -> AMap.MAP_TYPE_NORMAL
    }
    aMap.setTrafficEnabled(showTraffic)
  }

  private fun updateCameraAndMarker() {
    if (destroyed) return
    val position = LatLng(latitude, longitude)
    val aMap = mapView?.map ?: return
    aMap.moveCamera(CameraUpdateFactory.newLatLngZoom(position, zoom))
    marker?.remove()
    marker = aMap.addMarker(
      MarkerOptions()
        .position(position)
        .title(markerTitle)
        .snippet(markerSnippet)
    )
  }

  private fun destroyMap() {
    if (destroyed) return
    destroyed = true
    reactContext.removeLifecycleEventListener(this)
    marker?.remove()
    marker = null
    mapView?.onDestroy()
  }

  companion object {
    fun supportsNativeAmap(): Boolean {
      val preferredAbi = Build.SUPPORTED_ABIS.firstOrNull()
      return preferredAbi == "arm64-v8a" || preferredAbi == "armeabi-v7a"
    }

    fun supportedAbis(): String {
      return Build.SUPPORTED_ABIS.joinToString(",")
    }
  }
}
