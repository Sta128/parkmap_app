import { useCallback, useEffect, useRef, useState } from 'react'
import type { Parking, ParkingWithDistance, Position } from '../types/parkings'

export const useDistanceMatrix = (
  origin: Position | null,
  parkings: Parking[],
  apiLoaded: boolean,
  searchRadiusM: number
) => {
  const [sortedParkings, setSortedParkings] = useState<ParkingWithDistance[]>([])
  const [distanceLoading, setDistanceLoading] = useState(false)
  const lastCalcPosRef = useRef<Position | null>(null)
  const lastRadiusRef = useRef<number | null>(null)

  const resetCache = useCallback(() => {
    lastCalcPosRef.current = null
    lastRadiusRef.current = null
  }, [])

  useEffect(() => {
    if (!origin || parkings.length === 0 || !apiLoaded || typeof window.google === 'undefined') return

    if (lastCalcPosRef.current && lastRadiusRef.current === searchRadiusM) {
      const dist = window.google.maps.geometry.spherical.computeDistanceBetween(
        new window.google.maps.LatLng(lastCalcPosRef.current.lat, lastCalcPosRef.current.lng),
        new window.google.maps.LatLng(origin.lat, origin.lng)
      )
      if (dist < 100) return
    }

    const nearbyParkings = parkings.filter(p => {
      const d = window.google.maps.geometry.spherical.computeDistanceBetween(
        new window.google.maps.LatLng(origin.lat, origin.lng),
        new window.google.maps.LatLng(p.lat, p.lng)
      )
      return d <= searchRadiusM
    })

    lastCalcPosRef.current = origin
    lastRadiusRef.current = searchRadiusM

    if (nearbyParkings.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSortedParkings([])
      return
    }

    setDistanceLoading(true)

    const service = new window.google.maps.DistanceMatrixService()
    const destinations = nearbyParkings.map(p => ({ lat: p.lat, lng: p.lng }))

    service.getDistanceMatrix(
      {
        origins: [origin],
        destinations,
        travelMode: window.google.maps.TravelMode.DRIVING,
        unitSystem: window.google.maps.UnitSystem.METRIC,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (response: any, status: any) => {
        setDistanceLoading(false)

        if (status !== window.google.maps.DistanceMatrixStatus.OK || !response) {
          console.error('Distance Matrix エラー:', status)
          setSortedParkings(nearbyParkings)
          return
        }

        const elements = response.rows[0]?.elements ?? []
        const withDistance: ParkingWithDistance[] = nearbyParkings.map((p, i) => {
          const el = elements[i]
          if (el?.status === 'OK') {
            return {
              ...p,
              distanceText: el.distance.text,
              distanceValue: el.distance.value,
              durationText: el.duration.text,
            }
          }
          return { ...p }
        })

        withDistance.sort((a, b) => (a.distanceValue ?? Infinity) - (b.distanceValue ?? Infinity))
        setSortedParkings(withDistance)
      }
    )
  }, [origin, parkings, apiLoaded, searchRadiusM])

  return { sortedParkings, distanceLoading, resetCache }
}
