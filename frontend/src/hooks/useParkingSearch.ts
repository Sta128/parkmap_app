import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Parking, ParkingWithDistance, Position } from '../types/types'

const SEARCH_RADIUS_M = 200000

export const useParkingSearch = (apiLoaded: boolean) => {
  const [userPos, setUserPos] = useState<Position | null>(null)
  const [parkings, setParkings] = useState<Parking[]>([])
  const [sortedParkings, setSortedParkings] = useState<ParkingWithDistance[]>([])
  const [selected, setSelected] = useState<ParkingWithDistance | null>(null)
  const [routeTarget, setRouteTarget] = useState<Position | null>(null)
  const [distanceLoading, setDistanceLoading] = useState(false)
  const [filterText, setFilterText] = useState('')
  const [sortMode, setSortMode] = useState<'distance' | 'price'>('distance')
  const [searchCenter, setSearchCenter] = useState<Position | null>(null)

  const watchIdRef = useRef<number | null>(null)
  const lastCalcPosRef = useRef<Position | null>(null)

  // リアルタイム現在地取得
  useEffect(() => {
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setUserPos({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
      },
      (error) => {
        console.error('位置情報エラー:', error)
        setUserPos({ lat: 35.4123, lng: 139.4132 })
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    )
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  // 駐車場データ取得
  useEffect(() => {
    fetch('http://localhost:3000/parkings')
      .then(res => res.json())
      .then((data: Parking[]) => setParkings(data))
      .catch(err => console.error('駐車場データ取得エラー:', err))
  }, [])

  // Distance Matrix APIで距離取得・ソート
  useEffect(() => {
    const origin = searchCenter ?? userPos
    if (!origin || parkings.length === 0) return
    if (!apiLoaded || typeof window.google === 'undefined') return

    // searchCenterがないときだけ100m以内の移動はスキップ
    if (!searchCenter && lastCalcPosRef.current) {
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
      return d <= SEARCH_RADIUS_M
    })

    lastCalcPosRef.current = origin

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

        withDistance.sort((a, b) =>
          (a.distanceValue ?? Infinity) - (b.distanceValue ?? Infinity)
        )

        setSortedParkings(withDistance)
      }
    )
  }, [searchCenter, userPos, parkings, apiLoaded])

  const handlePlaceSelect = useCallback((pos: Position) => {
    setSearchCenter(pos)
    lastCalcPosRef.current = null
  }, [])

  // フィルタリング＆ソート
  const displayedParkings = useMemo(() => {
    const filtered = filterText
      ? sortedParkings.filter(p => {
          const q = filterText.toLowerCase()
          return (
            p.name.toLowerCase().includes(q) ||
            (p.address ?? '').toLowerCase().includes(q)
          )
        })
      : sortedParkings

    return [...filtered].sort((a, b) => {
      if (sortMode === 'price') {
        return (a.price ?? Infinity) - (b.price ?? Infinity)
      }
      return (a.distanceValue ?? Infinity) - (b.distanceValue ?? Infinity)
    })
  }, [sortedParkings, filterText, sortMode])

  return {
    userPos,
    sortedParkings,
    displayedParkings,
    selected,
    setSelected,
    routeTarget,
    setRouteTarget,
    distanceLoading,
    filterText,
    setFilterText,
    sortMode,
    setSortMode,
    searchCenter,
    handlePlaceSelect,
  }
}
