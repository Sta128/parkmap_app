import { useLiveQuery } from 'dexie-react-hooks'
import { vehicleDb } from '../../../lib/db/vehicleDb'
import type { Vehicle, VehicleInput } from '../../../types/cars'

const MAX_VEHICLES = 5

export const useVehicles = () => {
  const vehicles = useLiveQuery(() => vehicleDb.vehicles.orderBy('id').toArray(), [], [])
  const selectedSetting = useLiveQuery(
    () => vehicleDb.settings.get('selectedVehicleId'),
    [],
    undefined,
  )

  const selectedVehicle = vehicles.find(vehicle => vehicle.id === selectedSetting?.value) ?? null

  const addVehicle = async (input: VehicleInput) => {
    if (await vehicleDb.vehicles.count() >= MAX_VEHICLES) {
      throw new Error(`車両は最大${MAX_VEHICLES}台まで登録できます`)
    }
    const now = new Date().toISOString()
    return vehicleDb.vehicles.add({ ...input, createdAt: now, updatedAt: now })
  }

  const updateVehicle = async (vehicle: Vehicle) => {
    if (vehicle.id == null) return
    await vehicleDb.vehicles.update(vehicle.id, {
      ...vehicle,
      updatedAt: new Date().toISOString(),
    })
  }

  const deleteVehicle = async (id: number) => {
    await vehicleDb.transaction('rw', vehicleDb.vehicles, vehicleDb.settings, async () => {
      await vehicleDb.vehicles.delete(id)
      if (selectedSetting?.value === id) {
        await vehicleDb.settings.put({ key: 'selectedVehicleId', value: null })
      }
    })
  }

  const selectVehicle = (id: number | null) =>
    vehicleDb.settings.put({ key: 'selectedVehicleId', value: id })

  return {
    vehicles,
    selectedVehicle,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    selectVehicle,
    maxVehicles: MAX_VEHICLES,
  }
}
