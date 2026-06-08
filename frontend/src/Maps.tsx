import { useEffect, useRef, useState } from 'react'
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow
} from '@vis.gl/react-google-maps'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

type Position = {
  lat: number
  lng: number
}

type Parking = {
  id: string
  name: string
  lat: number
  lng: number
  status: string
  price?: number
  address?: string
  available?: number
}

type ParkingWithDistance = Parking & {
  distanceText?: string
  distanceValue?: number
  durationText?: string
}

export const Maps = () => {
  const [userPos, setUserPos] = useState<Position | null>(null)
  const [parkings, setParkings] = useState<Parking[]>([])
  const [sortedParkings, setSortedParkings] = useState<ParkingWithDistance[]>([])
  const [selected, setSelected] = useState<ParkingWithDistance | null>(null)
  const [distanceLoading, setDistanceLoading] = useState(false)
  const [apiLoaded, setApiLoaded] = useState(false)

  const watchIdRef = useRef<number | null>(null)
  const lastCalcPosRef = useRef<Position | null>(null)

  // 1. リアルタイム現在地取得
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

  // 2. 駐車場データ取得
  useEffect(() => {
    fetch('http://localhost:3000/parkings')
      .then(res => res.json())
      .then((data: Parking[]) => setParkings(data))
      .catch(err => console.error('駐車場データ取得エラー:', err))
  }, [])

  // 3. Distance Matrix APIで距離取得・ソート（100m以上移動時のみ）
  useEffect(() => {
    if (!userPos || parkings.length === 0) return
    if (!apiLoaded || typeof window.google === 'undefined') return

    if (lastCalcPosRef.current) {
      const dist = window.google.maps.geometry.spherical.computeDistanceBetween(
        new window.google.maps.LatLng(lastCalcPosRef.current.lat, lastCalcPosRef.current.lng),
        new window.google.maps.LatLng(userPos.lat, userPos.lng)
      )
      if (dist < 100) return
    }

    lastCalcPosRef.current = userPos
    setDistanceLoading(true)

    const service = new window.google.maps.DistanceMatrixService()
    const destinations = parkings.map(p => ({ lat: p.lat, lng: p.lng }))

    service.getDistanceMatrix(
      {
        origins: [userPos],
        destinations,
        travelMode: window.google.maps.TravelMode.DRIVING,
        unitSystem: window.google.maps.UnitSystem.METRIC,
      },
      (response: any, status: any) => {
        setDistanceLoading(false)

        if (status !== window.google.maps.DistanceMatrixStatus.OK || !response) {
          console.error('Distance Matrix エラー:', status)
          setSortedParkings(parkings)
          return
        }

        const elements = response.rows[0]?.elements ?? []

        const withDistance: ParkingWithDistance[] = parkings.map((p, i) => {
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

        withDistance.sort((a, b) => {
          const da = a.distanceValue ?? Infinity
          const db = b.distanceValue ?? Infinity
          return da - db
        })

        setSortedParkings(withDistance)
      }
    )
  }, [userPos, parkings, apiLoaded])

  if (!userPos) {
    return <div>位置情報取得中...</div>
  }

  return (
    <APIProvider
      apiKey={GOOGLE_MAPS_API_KEY}
      libraries={['geometry']}
      onLoad={() => setApiLoaded(true)}
    >
      <div style={{ display: 'flex', width: '100%', height: '100vh' }}>

        {/* 地図 (左70%) */}
        <div style={{ width: '70%', height: '100%' }}>
          <Map
            style={{ width: '100%', height: '100%' }}
            defaultZoom={13}
            defaultCenter={userPos}
            defaultHeading={0}
            defaultTilt={0}
            gestureHandling={'greedy'}
            headingInteractionEnabled={true}
            mapId={'map_id'}
            disableDefaultUI={true}
            keyboardShortcuts={false}
            reuseMaps={true}
          >
            <AdvancedMarker position={userPos} />

            {sortedParkings.map(parking => (
              <AdvancedMarker
                key={parking.id}
                position={{ lat: parking.lat, lng: parking.lng }}
                onClick={() => setSelected(parking)}
              />
            ))}

            {selected && (
              <InfoWindow
                position={{ lat: selected.lat, lng: selected.lng }}
                onCloseClick={() => setSelected(null)}
              >
                <div>
                  <h2>{selected.name}</h2>
                  <p>住所: {selected.address}</p>
                  <p>空き: {selected.available}</p>
                  <p>料金: {selected.price}円</p>
                  {selected.distanceText && (
                    <p>距離: {selected.distanceText}（{selected.durationText}）</p>
                  )}
                </div>
              </InfoWindow>
            )}
          </Map>
        </div>

        {/* 駐車場リスト (右30%) */}
        <div style={{ width: '30%', height: '100%', overflowY: 'scroll', borderLeft: '1px solid #ccc' }}>
          <div style={{ padding: '10px 12px', fontWeight: 'bold', borderBottom: '1px solid #eee', background: '#f9f9f9' }}>
            {distanceLoading
              ? '距離を計算中...'
              : `駐車場 ${sortedParkings.length}件（近い順）`}
          </div>

          {sortedParkings.map(parking => (
            <div
              key={parking.id}
              onClick={() => setSelected(parking)}
              style={{
                padding: '10px 12px',
                borderBottom: '1px solid #eee',
                cursor: 'pointer',
                background: selected?.id === parking.id ? '#e8f4fd' : 'white',
              }}
            >
              <strong>{parking.name}</strong>
              <p style={{ fontSize: '12px', margin: '2px 0', color: '#555' }}>{parking.address}</p>
              <p style={{ fontSize: '12px', margin: '2px 0' }}>空き: {parking.available ?? '不明'}</p>
              <p style={{ fontSize: '12px', margin: '2px 0' }}>料金: {parking.price != null ? `${parking.price}円` : '不明'}</p>
              {parking.distanceText ? (
                <p style={{ fontSize: '12px', margin: '2px 0', color: '#1976d2', fontWeight: 'bold' }}>
                  🚗 {parking.distanceText}（{parking.durationText}）
                </p>
              ) : (
                <p style={{ fontSize: '12px', margin: '2px 0', color: '#aaa' }}>距離計算中...</p>
              )}
            </div>
          ))}
        </div>

      </div>
    </APIProvider>
  )
}
