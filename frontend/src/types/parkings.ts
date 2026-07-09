export type Position = {
  lat: number
  lng: number
}

export type Parking = {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  available: number
  capacity: number
  open_time: string
  close_time: string
  is_24h: boolean
  status: string
  // 料金検索後のみ値が入る
  price?: number
}

export type ParkingWithDistance = Parking & {
  distanceText?: string
  distanceValue?: number
  durationText?: string
}

export type SortMode = 'distance' | 'price'
