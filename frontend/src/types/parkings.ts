export type Position = { lat: number; lng: number }

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
  price?: number
  max_height?: number | null
  max_width?: number | null
  max_length?: number | null
  max_weight?: number | null
  min_ground_clearance?: number | null
  is_light_only?: boolean
  is_ev_available?: boolean
  is_cashless?: boolean
}

export type ParkingWithDistance = Parking & {
  distanceText?: string
  distanceValue?: number
  durationText?: string
}

export type SortMode = 'distance' | 'price'
