import { useEffect, useRef } from 'react'
import { useMap } from '@vis.gl/react-google-maps'
import type { Position } from '../types/types'

type Props = {
  origin: Position
  destination: Position | null
}

export const DirectionsLayer = ({ origin, destination }: Props) => {
  const map = useMap()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rendererRef = useRef<any>(null)

  useEffect(() => {
    if (!map || typeof window.google === 'undefined') return

    if (!rendererRef.current) {
      rendererRef.current = new window.google.maps.DirectionsRenderer({
        suppressMarkers: true,
      })
    }

    if (!destination) {
      rendererRef.current.setMap(null)
      return
    }

    rendererRef.current.setMap(map)

    const service = new window.google.maps.DirectionsService()
    service.route(
      {
        origin,
        destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (result: any, status: any) => {
        if (status === 'OK' && result) {
          rendererRef.current?.setDirections(result)
        } else {
          console.error('Directions エラー:', status)
        }
      }
    )
  }, [map, origin, destination])

  return null
}
