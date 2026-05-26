import { useEffect, useState } from 'react'
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow
} from '@vis.gl/react-google-maps'

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

export const Maps = () => {
  const [userPos, setUserPos] = useState<Position | null>(null)
  const [parkings, setParkings] = useState<Parking[]>([])

  const [selected, setSelected] = useState<Parking | null>(null)
  const [hovered, setHovered] = useState<Parking | null>(null)

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserPos({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        })
      },
      (error) => {
        console.error(error)

        // 位置取得失敗時は東京駅
        setUserPos({
          lat: 35.4123,
          lng: 139.4132
        })
      }
    )
  }, [])

  useEffect(() => {
    fetch('http://localhost:3000/parkings')
      .then(res => res.json())
      .then(data => setParkings(data))
  }, [])

  // 位置取得中
  if (!userPos) {
    return <div>位置情報取得中...</div>
  }

  return (
    <APIProvider apiKey='AIzaSyB3m9bG6xDdW5Jcs72jpX5eIrdTerSJZ7A'>
      <Map
        style={{ width: '100%', height: '100vh' }}
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
        {/* 現在地 */}
        <AdvancedMarker position={userPos} />

        {/* 駐車場 */}
        {parkings.map(parking => (
          <AdvancedMarker
            key={parking.id}
            position={{
              lat: parking.lat,
              lng: parking.lng
            }}
            onClick={() => setSelected(parking)}
            onMouseEnter={() => setHovered(parking)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}

        {/* クリック時 */}
        {selected && (
          <InfoWindow
            position={{
              lat: selected.lat,
              lng: selected.lng
            }}
            onCloseClick={() => setSelected(null)}
          >
            <div>
              <h2>{selected.name}</h2>
              <p>住所: {selected.address}</p>
              <p>空き: {selected.available}</p>
              <p>料金: {selected.price}円</p>
            </div>
          </InfoWindow>
        )}
      </Map>
    </APIProvider>
  )
}