import * as Location from 'expo-location';
import { NativeModules, Platform, requireNativeComponent, View } from 'react-native';
import type { ViewStyle } from 'react-native';

type LumiiAmapViewProps = {
  latitude?: number;
  longitude?: number;
  mapType?: 'lumii' | 'night' | 'satellite' | 'standard';
  markerSnippet?: string;
  markerTitle?: string;
  showTraffic?: boolean;
  style?: ViewStyle;
  zoom?: number;
};

export type LumiiAmapLocation = {
  accuracy?: number;
  address?: string;
  city?: string;
  district?: string;
  latitude: number;
  locationType?: number;
  longitude: number;
  provider?: string;
};

const NativeLumiiAmapView =
  Platform.OS === 'android' ? requireNativeComponent<LumiiAmapViewProps>('LumiiAmapView') : null;

const amapSupport = NativeModules.LumiiAmapSupport as
  | {
      getCurrentLocation?: () => Promise<LumiiAmapLocation>;
      supportedAbis?: string;
      supportsNativeAmap?: boolean;
    }
  | undefined;

export const lumiiAmapSupport = {
  supportedAbis: amapSupport?.supportedAbis ?? '',
  supportsNativeAmap: Boolean(amapSupport?.supportsNativeAmap),
};

export const isLumiiAmapAvailable =
  Platform.OS === 'android' && Boolean(NativeLumiiAmapView) && lumiiAmapSupport.supportsNativeAmap;

const nativeLocationTimeoutMs = 15000;
const currentLocationTimeoutMs = 12000;
const lastKnownLocationTimeoutMs = 3000;
const reverseGeocodeTimeoutMs = 3500;
const lastKnownMaxAgeMs = 5 * 60 * 1000;

export function LumiiAmapView(props: LumiiAmapViewProps) {
  if (!NativeLumiiAmapView) return <View style={props.style} />;
  return <NativeLumiiAmapView {...props} />;
}

export async function getNativeLumiiAmapCurrentLocation(): Promise<LumiiAmapLocation> {
  if (!amapSupport?.getCurrentLocation) throw new Error('当前设备暂不支持高德定位');
  return withTimeout(amapSupport.getCurrentLocation(), nativeLocationTimeoutMs, '高德定位超时，请检查定位服务和网络后重试');
}

export async function getLumiiAmapCurrentLocation(): Promise<LumiiAmapLocation> {
  const nativeErrors: string[] = [];

  if (Platform.OS === 'android' && amapSupport?.getCurrentLocation) {
    try {
      const nativeLocation = await getNativeLumiiAmapCurrentLocation();
      if (isValidLocation(nativeLocation)) return { ...nativeLocation, provider: nativeLocation.provider || 'amap' };
      nativeErrors.push('高德定位返回了无效坐标');
    } catch (error) {
      nativeErrors.push(locationErrorMessage(error, '高德定位失败'));
    }
  }

  try {
    const position = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      currentLocationTimeoutMs,
      '定位超时，请确认手机 GPS、网络和定位权限已开启',
    );
    return locationFromExpoPosition(position, 'expo-location');
  } catch (currentError) {
    try {
      const lastKnown = await withTimeout(
        Location.getLastKnownPositionAsync({ maxAge: lastKnownMaxAgeMs }),
        lastKnownLocationTimeoutMs,
        '最近定位读取超时',
      );
      if (lastKnown) return locationFromExpoPosition(lastKnown, 'expo-last-known');
    } catch {
      // Last known location is best effort; keep current location failure as the visible reason.
    }

    const primaryMessage = nativeErrors[0] || locationErrorMessage(currentError, '定位失败');
    throw new Error(cleanLocationMessage(primaryMessage));
  }
}

function isValidLocation(location?: Partial<LumiiAmapLocation> | null) {
  if (!location) return false;
  const { latitude, longitude } = location;
  return Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude ?? 999) <= 90 && Math.abs(longitude ?? 999) <= 180;
}

async function locationFromExpoPosition(position: Location.LocationObject, provider: string): Promise<LumiiAmapLocation> {
  const { accuracy, latitude, longitude } = position.coords;
  let address = '';
  let city = '';
  let district = '';

  try {
    const [place] = await withTimeout(
      Location.reverseGeocodeAsync({ latitude, longitude }),
      reverseGeocodeTimeoutMs,
      '地址解析超时',
    );
    if (place) {
      address =
        [place.street, place.name].filter(Boolean).join(' ') ||
        place.formattedAddress ||
        '';
      city = place.city || place.region || '';
      district = place.district || place.subregion || '';
    }
  } catch {
    // Reverse geocoding is best effort; nearby matching only needs lat/lng.
  }

  return {
    accuracy: accuracy ?? undefined,
    address,
    city,
    district,
    latitude,
    longitude,
    provider,
  };
}

function locationErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  if (typeof error === 'string' && error.trim()) return error.trim();
  return fallback;
}

function cleanLocationMessage(message: string) {
  const text = String(message || '').trim();
  if (!text) return '定位失败，请确认手机已开启定位服务和网络后重试';
  if (/GPS|定位|权限|网络|高德|坐标|超时/.test(text)) return text;
  return '定位失败，请确认手机已开启定位服务和网络后重试';
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  return new Promise<T>((resolve, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
    promise
      .then((value) => resolve(value))
      .catch((error) => reject(error))
      .finally(() => {
        if (timeoutId) clearTimeout(timeoutId);
      });
  });
}
