import { useEffect, useState } from 'react'
import type { Parking } from '../types/parkings'

export const useParkings = () => {
  const [parkings, setParkings] = useState<Parking[]>([])

  useEffect(() => {
    fetch('http://localhost:3000/parkings')
      .then(res => res.json())
      .then((data: Parking[]) => setParkings(data))
      .catch(err => console.error('駐車場データ取得エラー:', err))
  }, [])

  return parkings
}
