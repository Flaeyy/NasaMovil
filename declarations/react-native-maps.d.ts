// Temporary declaration for `react-native-maps` so TypeScript and Metro don't fail
// while the native module is not installed. Remove this file after installing
// the real `react-native-maps` package and running pod install / EAS build.
declare module 'react-native-maps' {
  import { ComponentType } from 'react'
  import { ViewProps } from 'react-native'

  export interface MapViewProps extends ViewProps {
    provider?: any
    region?: any
    style?: any
    onRegionChange?: (r: any) => void
    onRegionChangeComplete?: (r: any) => void
  }

  export const PROVIDER_GOOGLE: any
  const MapView: ComponentType<MapViewProps>
  export default MapView

  export interface MarkerProps extends ViewProps {
    coordinate: { latitude: number; longitude: number }
  }
  export const Marker: ComponentType<MarkerProps>
}
