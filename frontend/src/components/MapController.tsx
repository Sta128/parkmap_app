import { useEffect } from 'react'
import { useMap } from '@vis.gl/react-google-maps'
import type { Position } from '../types/types'

type Props = {
  center: Position | null
}

export const MapController = ({ center }: Props) => {
  const map = useMap()

  useEffect(() => {
    if (map && center) {
      map.panTo(center)
      map.setZoom(15)
    }
  }, [map, center])

  return null
}
