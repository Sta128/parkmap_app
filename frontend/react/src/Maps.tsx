import { useEffect, useState } from 'react'
import {
  APIProvider,
  Map,
  Marker,
} from '@vis.gl/react-google-maps'

type Position = {
  lat: number
  lng: number
}

export const Maps = () => {
  const [userPos, setUserPos] = useState<Position | null>(null)

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
        <Marker position={userPos} />
      </Map>
    </APIProvider>
  )
}