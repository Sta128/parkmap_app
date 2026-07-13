import { useEffect, useState } from 'react'
import type { Parking } from '../types/parkings'

export const useParkings = () => {
  const [parkings, setParkings] = useState<Parking[]>([])

  useEffect(() => {
    fetch('http://localhost:3000/parkings')
      .then(res => {
        if (!res.ok) {
          throw new Error('駐車場データ取得エラー')
        }
        return res.json()
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setParkings(data)
        } else {
          console.error('駐車場データが配列ではありません:', data)
          setParkings([])
        }
      })
      .catch(err => {
        console.error('駐車場データ取得エラー:', err)
        setParkings([])
      })
  }, [])

  return parkings
}