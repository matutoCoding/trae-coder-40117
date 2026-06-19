import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CycleRule, Reservation, ReservationArrivalStatus } from '@/types'

const generateId = () => crypto.randomUUID()

const emptyReservation: Pick<Reservation, 'arrivalStatus' | 'queueEntryId' | 'checkedInAt'> = {
  arrivalStatus: 'pending',
  queueEntryId: '',
  checkedInAt: '',
}

function generateDatesForRule(rule: Omit<CycleRule, 'id' | 'active'>): string[] {
  const dates: string[] = []
  const start = new Date(rule.startDate)
  const end = new Date(rule.endDate)
  const current = new Date(start)

  while (current <= end) {
    const day = current.getDay()
    const jsDay = day === 0 ? 7 : day
    if (jsDay === rule.dayOfWeek) {
      dates.push(current.toISOString().split('T')[0])
    }
    current.setDate(current.getDate() + 1)
  }
  return dates
}

const SAMPLE_RULES: CycleRule[] = [
  { id: 'cr1', memberId: 'm2', deviceId: 'd1', dayOfWeek: 3, startTime: '14:00', endTime: '15:00', startDate: '2026-06-01', endDate: '2026-08-31', active: true },
  { id: 'cr2', memberId: 'm3', deviceId: 'd2', dayOfWeek: 6, startTime: '10:00', endTime: '12:00', startDate: '2026-06-01', endDate: '2026-09-30', active: true },
]

const SAMPLE_RESERVATIONS: Reservation[] = [
  { id: 'r1', memberId: 'm2', deviceId: 'd1', cycleRuleId: 'cr1', date: '2026-06-17', startTime: '14:00', endTime: '15:00', status: 'confirmed', source: 'cycle', ...emptyReservation },
  { id: 'r2', memberId: 'm3', deviceId: 'd2', cycleRuleId: 'cr2', date: '2026-06-20', startTime: '10:00', endTime: '12:00', status: 'confirmed', source: 'cycle', ...emptyReservation },
  { id: 'r3', memberId: 'm1', deviceId: 'd1', cycleRuleId: null, date: '2026-06-20', startTime: '16:00', endTime: '17:00', status: 'confirmed', source: 'manual', ...emptyReservation },
  { id: 'r4', memberId: 'm4', deviceId: 'd3', cycleRuleId: null, date: '2026-06-20', startTime: '10:00', endTime: '11:00', status: 'confirmed', source: 'manual', ...emptyReservation },
  { id: 'r5', memberId: 'm5', deviceId: 'd4', cycleRuleId: null, date: '2026-06-21', startTime: '14:00', endTime: '16:00', status: 'confirmed', source: 'manual', ...emptyReservation },
]

interface ReservationState {
  cycleRules: CycleRule[]
  reservations: Reservation[]
  addCycleRule: (rule: Omit<CycleRule, 'id'>) => { generated: Reservation[]; conflicts: Reservation[] }
  updateCycleRule: (id: string, updates: Partial<CycleRule>) => void
  toggleCycleRule: (id: string) => void
  deleteCycleRule: (id: string) => void
  generateReservations: (rule: CycleRule) => { generated: Reservation[]; conflicts: Reservation[] }
  addReservation: (reservation: Omit<Reservation, 'id'>) => Reservation
  updateReservation: (id: string, updates: Partial<Reservation>) => void
  cancelReservation: (id: string) => void
  checkInReservation: (id: string, queueEntryId: string) => void
  updateReservationArrival: (id: string, arrivalStatus: ReservationArrivalStatus) => void
  getReservationsByDate: (date: string) => Reservation[]
  getReservationsByDevice: (deviceId: string) => Reservation[]
  getReservationsByMember: (memberId: string) => Reservation[]
  getReservationsByCycleRule: (ruleId: string) => Reservation[]
  getCycleRuleById: (id: string) => CycleRule | undefined
  getReservationById: (id: string) => Reservation | undefined
  hasConflict: (deviceId: string, date: string, startTime: string, endTime: string, excludeId?: string) => boolean
}

export const useReservationStore = create<ReservationState>()(
  persist(
    (set, get) => ({
      cycleRules: SAMPLE_RULES,
      reservations: SAMPLE_RESERVATIONS,

      addCycleRule: (ruleData) => {
        const rule: CycleRule = { ...ruleData, id: generateId() }
        set((state) => ({ cycleRules: [...state.cycleRules, rule] }))
        return get().generateReservations(rule)
      },

      updateCycleRule: (id, updates) => {
        set((state) => ({
          cycleRules: state.cycleRules.map((r) => (r.id === id ? { ...r, ...updates } : r)),
        }))
      },

      toggleCycleRule: (id) => {
        set((state) => ({
          cycleRules: state.cycleRules.map((r) =>
            r.id === id ? { ...r, active: !r.active } : r
          ),
        }))
      },

      deleteCycleRule: (id) => {
        set((state) => ({
          cycleRules: state.cycleRules.filter((r) => r.id !== id),
          reservations: state.reservations.filter(
            (r) => r.cycleRuleId !== id || r.status !== 'confirmed'
          ),
        }))
      },

      generateReservations: (rule) => {
        const dates = generateDatesForRule(rule)
        const generated: Reservation[] = []
        const conflicts: Reservation[] = []

        dates.forEach((date) => {
          const hasConflict = get().hasConflict(rule.deviceId, date, rule.startTime, rule.endTime)
          const reservation: Reservation = {
            id: generateId(),
            memberId: rule.memberId,
            deviceId: rule.deviceId,
            cycleRuleId: rule.id,
            date,
            startTime: rule.startTime,
            endTime: rule.endTime,
            status: hasConflict ? 'conflict' : 'confirmed',
            source: 'cycle',
            ...emptyReservation,
          }
          if (hasConflict) {
            conflicts.push(reservation)
          }
          generated.push(reservation)
        })

        set((state) => ({ reservations: [...state.reservations, ...generated] }))
        return { generated, conflicts }
      },

      addReservation: (reservationData) => {
        const hasConflict = get().hasConflict(
          reservationData.deviceId,
          reservationData.date,
          reservationData.startTime,
          reservationData.endTime
        )
        const reservation: Reservation = {
          ...emptyReservation,
          ...reservationData,
          id: generateId(),
          status: hasConflict ? 'conflict' : reservationData.status || 'confirmed',
        }
        set((state) => ({ reservations: [...state.reservations, reservation] }))
        return reservation
      },

      checkInReservation: (id, queueEntryId) => {
        set((state) => ({
          reservations: state.reservations.map((r) =>
            r.id === id
              ? {
                  ...r,
                  arrivalStatus: 'queued' as const,
                  queueEntryId,
                  checkedInAt: new Date().toISOString(),
                }
              : r
          ),
        }))
      },

      updateReservationArrival: (id, arrivalStatus) => {
        set((state) => ({
          reservations: state.reservations.map((r) =>
            r.id === id ? { ...r, arrivalStatus } : r
          ),
        }))
      },

      updateReservation: (id, updates) => {
        set((state) => ({
          reservations: state.reservations.map((r) => {
            if (r.id !== id) return r
            const updated = { ...r, ...updates }
            if (updates.deviceId !== undefined || updates.startTime !== undefined || updates.endTime !== undefined || updates.date !== undefined) {
              const dId = updated.deviceId
              const dt = updated.date
              const sT = updated.startTime
              const eT = updated.endTime
              const conflict = get().hasConflict(dId, dt, sT, eT, id)
              return { ...updated, status: conflict ? 'conflict' as const : 'confirmed' as const }
            }
            return updated
          }),
        }))
      },

      cancelReservation: (id) => {
        set((state) => ({
          reservations: state.reservations.map((r) =>
            r.id === id ? { ...r, status: 'cancelled' as const } : r
          ),
        }))
      },

      getReservationsByDate: (date) => get().reservations.filter((r) => r.date === date && r.status !== 'cancelled'),
      getReservationsByDevice: (deviceId) => get().reservations.filter((r) => r.deviceId === deviceId && r.status !== 'cancelled'),
      getReservationsByMember: (memberId) => get().reservations.filter((r) => r.memberId === memberId && r.status !== 'cancelled'),
      getReservationsByCycleRule: (ruleId) => get().reservations.filter((r) => r.cycleRuleId === ruleId && r.status !== 'cancelled'),
      getCycleRuleById: (id) => get().cycleRules.find((r) => r.id === id),
      getReservationById: (id) => get().reservations.find((r) => r.id === id),

      hasConflict: (deviceId, date, startTime, endTime, excludeId) => {
        const reservations = get().reservations.filter(
          (r) =>
            r.deviceId === deviceId &&
            r.date === date &&
            r.status !== 'cancelled' &&
            r.id !== excludeId
        )
        return reservations.some(
          (r) => startTime < r.endTime && endTime > r.startTime
        )
      },
    }),
    {
      name: 'vr-reservation-store',
      onRehydrateStorage: () => (state) => {
        if (state && state.reservations) {
          state.reservations = state.reservations.map((r) => ({
            ...emptyReservation,
            ...r,
          }))
        }
      },
    }
  )
)
