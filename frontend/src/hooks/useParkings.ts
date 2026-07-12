import { useCallback, useEffect, useState } from 'react'
import { parkingApi } from '../features/parkings/api/parkingApi'
import type { Parking } from '../types/parkings'

export const useParkings = () => {
  const [parkings, setParkings] = useState<Parking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await parkingApi.list()
      setParkings(Array.isArray(data) ? data : [])
    } catch (cause) {
      console.error(cause)
      setParkings([])
      setError(cause instanceof Error ? cause.message : '駐車場データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => { void reload() }, 0)
    return () => window.clearTimeout(timer)
  }, [reload])

  return { parkings, loading, error, reload }
}
