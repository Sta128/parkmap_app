import { useEffect, useRef, useState } from 'react'
import type { Position } from '../types/parkings'

export const useGeolocation = () => {
  const [userPos, setUserPos] = useState<Position | null>(null)
  const watchIdRef = useRef<number | null>(null)

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
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    )
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  return userPos
}
