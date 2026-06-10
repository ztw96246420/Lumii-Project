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

export function LumiiAmapView(props: LumiiAmapViewProps) {
  if (!NativeLumiiAmapView) return <View style={props.style} />;
  return <NativeLumiiAmapView {...props} />;
}

export async function getLumiiAmapCurrentLocation(): Promise<LumiiAmapLocation> {
  if (!amapSupport?.getCurrentLocation) throw new Error('当前设备暂不支持高德定位');
  return amapSupport.getCurrentLocation();
}
