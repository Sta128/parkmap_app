import { apiRequest } from '../../../lib/api/http'
import type { Parking } from '../../../types/parkings'

export type ParkingSearchParams = {
  start: string
  end: string
  vehicleHeight?: number
  vehicleWidth?: number
  vehicleLength?: number
  vehicleWeight?: number
  groundClearance?: number
  requiresEv?: boolean
  requiresCashless?: boolean
  lightVehicle?: boolean
  maxFee?: number
}

type ParkingSearchResult = Parking & { total_fee?: number }

export const parkingApi = {
  list: () => apiRequest<Parking[]>('/parkings'),
  searchByPrice: (params: ParkingSearchParams) =>
    apiRequest<ParkingSearchResult[]>('/parkings/search', {
      method: 'POST',
      body: JSON.stringify({
        start: params.start,
        end: params.end,
        sortKey: 'fee',
        ascending: true,
        vehicleHeight: params.vehicleHeight ?? null,
        vehicleWidth: params.vehicleWidth ?? null,
        vehicleLength: params.vehicleLength ?? null,
        vehicleWeight: params.vehicleWeight ?? null,
        groundClearance: params.groundClearance ?? null,
        requiresEv: params.requiresEv ?? false,
        requiresCashless: params.requiresCashless ?? false,
        lightVehicle: params.lightVehicle ?? false,
        maxFee: params.maxFee ?? null,
      }),
    }),
}
