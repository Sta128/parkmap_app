export type Vehicle = {
  id?: number
  name: string
  height: number
  width: number
  length: number
  groundClearance: number
  weight?: number
  isLightVehicle: boolean
  isEv: boolean
  requiresCashless: boolean
  createdAt: string
  updatedAt: string
}

export type VehicleInput = Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>
export type Car = Vehicle
