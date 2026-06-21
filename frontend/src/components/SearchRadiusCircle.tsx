import { Circle } from '@vis.gl/react-google-maps'
import type { Position } from '../types/parkings'

const SEARCH_RADIUS_M = 200000

type Props = {
  center: Position
}

export const SearchRadiusCircle = ({ center }: Props) => (
  <Circle
    center={center}
    radius={SEARCH_RADIUS_M}
    options={{
      strokeColor: '#4285F4',
      strokeOpacity: 0.4,
      strokeWeight: 1,
      fillColor: '#4285F4',
      fillOpacity: 0.05,
    }}
  />
)
