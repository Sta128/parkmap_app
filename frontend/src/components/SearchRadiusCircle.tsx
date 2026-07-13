import { Circle } from '@vis.gl/react-google-maps'
import type { Position } from '../types/parkings'

type Props = {
  center: Position
  radiusM: number
}

export const SearchRadiusCircle = ({ center, radiusM }: Props) => (
  <Circle
    center={center}
    radius={radiusM}
    options={{
      strokeColor: '#4285F4',
      strokeOpacity: 0.4,
      strokeWeight: 1,
      fillColor: '#4285F4',
      fillOpacity: 0.05,
    }}
  />
)
