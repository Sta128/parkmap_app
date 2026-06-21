export type Position = {
  lat: number
  lng: number
}

export type Parking = {
  id: string
  name: string
  lat: number
  lng: number
  status: string
  price?: number
  address?: string
  available?: number
}

export type ParkingWithDistance = Parking & {
  distanceText?: string
  distanceValue?: number
  durationText?: string
}

export type SortMode = 'distance' | 'price'
