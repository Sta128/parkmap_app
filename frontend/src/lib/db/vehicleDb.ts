import Dexie, { type EntityTable } from 'dexie'
import type { Vehicle } from '../../types/cars'

type AppSetting = { key: 'selectedVehicleId'; value: number | null }

class ParkMapDatabase extends Dexie {
  vehicles!: EntityTable<Vehicle, 'id'>
  settings!: EntityTable<AppSetting, 'key'>

  constructor() {
    super('parkmap-local')
    this.version(1).stores({ vehicles: '++id, name, updatedAt', settings: '&key' })
    this.version(2).stores({ vehicles: '++id, name, updatedAt', settings: '&key' }).upgrade(async tx => {
      await tx.table('vehicles').toCollection().modify(vehicle => {
        vehicle.isLightVehicle ??= false
        vehicle.isEv ??= false
        vehicle.requiresCashless ??= false
      })
    })
  }
}

export const vehicleDb = new ParkMapDatabase()
