# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
-keepattributes *Annotation*

# Lumii custom React Native native modules/views
-keep class com.lumii.lingban.LumiiAmapPackage { *; }
-keep class com.lumii.lingban.LumiiAmapSupportModule { *; }
-keep class com.lumii.lingban.LumiiAmapViewManager { *; }
-keep class com.lumii.lingban.LumiiAmapNativeView { *; }
-keepclassmembers class * {
  @com.facebook.react.bridge.ReactMethod <methods>;
  @com.facebook.react.uimanager.annotations.ReactProp <methods>;
}

# Add any project specific keep options here:
-keep class com.amap.api.maps.** { *; }
-keep class com.autonavi.** { *; }
-keep class com.amap.api.location.** { *; }
-keep class com.amap.api.fence.** { *; }
-keep class com.autonavi.aps.amapapi.model.** { *; }
-keep class com.amap.api.services.** { *; }
-dontwarn com.amap.ams.gnss.GnssSoftLocator
-dontwarn net.jafama.FastMath
