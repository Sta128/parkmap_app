export type Vehicle = {
  id?: number
  name: string
  height: number
  width: number
  length: number
  groundClearance: number
  createdAt: string
  updatedAt: string
}

export type VehicleInput = Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>

// 旧名称との互換用
export type Car = Vehicle
