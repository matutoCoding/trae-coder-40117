import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Device, DisinfectionRecord, DisinfectionMethod } from '@/types'

const generateId = () => crypto.randomUUID()

const SAMPLE_DEVICES: Device[] = [
  { id: 'd1', name: 'VR-01 Quest Pro', type: 'standing', status: 'idle', specs: 'Meta Quest Pro, 256GB', totalUses: 142, lastDisinfection: new Date(Date.now() - 3600000).toISOString() },
  { id: 'd2', name: 'VR-02 Valve Index', type: 'seated', status: 'in-use', specs: 'Valve Index, 144Hz', totalUses: 98, lastDisinfection: new Date(Date.now() - 7200000).toISOString() },
  { id: 'd3', name: 'VR-03 PSVR2', type: 'seated', status: 'idle', specs: 'PlayStation VR2, OLED', totalUses: 67, lastDisinfection: new Date(Date.now() - 1800000).toISOString() },
  { id: 'd4', name: 'VR-04 Quest 3', type: 'room-scale', status: 'disinfecting', specs: 'Meta Quest 3, 512GB', totalUses: 203, lastDisinfection: new Date(Date.now() - 900000).toISOString() },
  { id: 'd5', name: 'VR-05 Vive Pro 2', type: 'room-scale', status: 'maintenance', specs: 'HTC Vive Pro 2, 5K', totalUses: 56, lastDisinfection: new Date(Date.now() - 14400000).toISOString() },
  { id: 'd6', name: 'VR-06 Quest 3S', type: 'standing', status: 'idle', specs: 'Meta Quest 3S, 256GB', totalUses: 31, lastDisinfection: new Date(Date.now() - 5400000).toISOString() },
]

interface DeviceState {
  devices: Device[]
  disinfectionRecords: DisinfectionRecord[]
  addDevice: (device: Omit<Device, 'id' | 'totalUses' | 'lastDisinfection'>) => void
  updateDeviceStatus: (id: string, status: Device['status']) => void
  deleteDevice: (id: string) => void
  addDisinfectionRecord: (record: Omit<DisinfectionRecord, 'id'>) => void
  getDeviceById: (id: string) => Device | undefined
  getDisinfectionRecordsByDevice: (deviceId: string) => DisinfectionRecord[]
}

export const useDeviceStore = create<DeviceState>()(
  persist(
    (set, get) => ({
      devices: SAMPLE_DEVICES,
      disinfectionRecords: [],
      addDevice: (device) => {
        const newDevice: Device = {
          ...device,
          id: generateId(),
          totalUses: 0,
          lastDisinfection: new Date().toISOString(),
        }
        set((state) => ({ devices: [...state.devices, newDevice] }))
      },
      updateDeviceStatus: (id, status) => {
        set((state) => ({
          devices: state.devices.map((d) => (d.id === id ? { ...d, status } : d)),
        }))
      },
      deleteDevice: (id) => {
        set((state) => ({
          devices: state.devices.filter((d) => d.id !== id),
        }))
      },
      addDisinfectionRecord: (record) => {
        const newRecord: DisinfectionRecord = { ...record, id: generateId() }
        set((state) => {
          const updatedDevices = state.devices.map((d) =>
            d.id === record.deviceId
              ? { ...d, lastDisinfection: record.timestamp, status: 'disinfecting' as const }
              : d
          )
          return {
            disinfectionRecords: [newRecord, ...state.disinfectionRecords],
            devices: updatedDevices,
          }
        })
      },
      getDeviceById: (id) => get().devices.find((d) => d.id === id),
      getDisinfectionRecordsByDevice: (deviceId) =>
        get().disinfectionRecords.filter((r) => r.deviceId === deviceId),
    }),
    { name: 'vr-device-store' }
  )
)
