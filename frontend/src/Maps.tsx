import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
  useMapsLibrary
} from '@vis.gl/react-google-maps'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
const SEARCH_RADIUS_M = 200000 // 適宜変更

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

const DirectionsLayer = ({ origin, destination }: {
  origin: Position
  destination: Position | null
}) => {
  const map = useMap()
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

const MapController = ({ center }: { center: Position | null }) => {
  const map = useMap()
  useEffect(() => {
    if (map && center) {
      map.panTo(center)
      map.setZoom(15)
    }
  }, [map, center])
  return null
}

const AutocompleteInput = ({ onPlaceSelect }: {
  onPlaceSelect: (position: Position) => void
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const placesLib = useMapsLibrary('places')

  useEffect(() => {
    if (!placesLib || !inputRef.current) return

    const autocomplete = new placesLib.Autocomplete(inputRef.current, {
      fields: ['geometry'],
    })

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      if (place.geometry?.location) {
        onPlaceSelect({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        })
      }
    })

    return () => {
      window.google.maps.event.clearInstanceListeners(autocomplete)
    }
  }, [placesLib, onPlaceSelect])

  return (
    <input
      ref={inputRef}
      type="text"
      placeholder="エリアを検索（例：渋谷、新宿駅）"
      style={{
        width: '100%',
        padding: '8px 10px',
        fontSize: '13px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        boxSizing: 'border-box',
      }}
    />
  )
}

export const Maps = () => {
  const [userPos, setUserPos] = useState<Position | null>(null)
  const [parkings, setParkings] = useState<Parking[]>([])
  const [sortedParkings, setSortedParkings] = useState<ParkingWithDistance[]>([])
  const [selected, setSelected] = useState<ParkingWithDistance | null>(null)
  const [routeTarget, setRouteTarget] = useState<Position | null>(null)
  const [distanceLoading, setDistanceLoading] = useState(false)
  const [apiLoaded, setApiLoaded] = useState(false)
  const [filterText, setFilterText] = useState('')
  const [sortMode, setSortMode] = useState<'distance' | 'price'>('distance')
  const [searchCenter, setSearchCenter] = useState<Position | null>(null)

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

  // 3. Distance Matrix APIで距離取得・ソート
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

    // 直線距離で3km以内に絞ってからAPIに渡す
    const nearbyParkings = parkings.filter(p => {
      const d = window.google.maps.geometry.spherical.computeDistanceBetween(
        new window.google.maps.LatLng(origin.lat, origin.lng),
        new window.google.maps.LatLng(p.lat, p.lng)
      )
      return d <= SEARCH_RADIUS_M
    })

    lastCalcPosRef.current = origin

    if (nearbyParkings.length === 0) {
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
            <MapController center={searchCenter} />
            <DirectionsLayer
              origin={userPos}
              destination={routeTarget}
            />

            <AdvancedMarker position={userPos} anchorLeft="-50%" anchorTop="-50%">
              <svg width="20" height="20" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="7" fill="#1976D2" stroke="white" strokeWidth="2" />
              </svg>
            </AdvancedMarker>

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
                onCloseClick={() => { setSelected(null); setRouteTarget(null) }}
              >
                <div>
                  <h2 style={{ color: '#111', fontWeight: 'bold' }}>{selected.name}</h2>
                  <p>住所: {selected.address}</p>
                  <p>空き: {selected.available}</p>
                  <p>料金: {selected.price}円</p>
                  {selected.distanceText && (
                    <p>距離: {selected.distanceText}（{selected.durationText}）</p>
                  )}
                  <button
                    onClick={() => setRouteTarget({ lat: selected.lat, lng: selected.lng })}
                    style={{
                      marginTop: '6px',
                      padding: '6px 12px',
                      fontSize: '13px',
                      background: '#1976d2',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      width: '100%',
                    }}
                  >
                    ルートを表示
                  </button>
                </div>
              </InfoWindow>
            )}
          </Map>
        </div>

        {/* 右サイドバー (30%) */}
        <div style={{ width: '30%', height: '100%', display: 'flex', flexDirection: 'column', borderLeft: '1px solid #ccc' }}>

          {/* 検索エリア */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #eee', background: '#f9f9f9', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <AutocompleteInput onPlaceSelect={handlePlaceSelect} />
            <input
              type="text"
              placeholder="名前・住所で絞り込む"
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                fontSize: '13px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* ソート切替 + 件数 */}
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#555', marginRight: 'auto' }}>
              {distanceLoading ? '計算中...' : `${displayedParkings.length}件`}
            </span>
            <button
              onClick={() => setSortMode('distance')}
              style={{
                padding: '4px 10px',
                fontSize: '12px',
                borderRadius: '4px',
                border: '1px solid #1976d2',
                background: sortMode === 'distance' ? '#1976d2' : 'white',
                color: sortMode === 'distance' ? 'white' : '#1976d2',
                cursor: 'pointer',
              }}
            >
              距離順
            </button>
            <button
              onClick={() => setSortMode('price')}
              style={{
                padding: '4px 10px',
                fontSize: '12px',
                borderRadius: '4px',
                border: '1px solid #1976d2',
                background: sortMode === 'price' ? '#1976d2' : 'white',
                color: sortMode === 'price' ? 'white' : '#1976d2',
                cursor: 'pointer',
              }}
            >
              料金順
            </button>
          </div>

          {/* 駐車場リスト */}
          <div style={{ flex: 1, overflowY: 'scroll' }}>
            {displayedParkings.map(parking => (
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
      </div>
    </APIProvider>
  )
}
