import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { QueueEntry, QueuePriority, Notification, NotificationType } from '@/types'
import { PRIORITY_VALUES } from '@/types'

const generateId = () => crypto.randomUUID()

function findMaxTicketNumber(entries: QueueEntry[]): number {
  let max = 0
  entries.forEach((e) => {
    const num = parseInt(e.ticketNumber.replace(/^[A-Za-z]/, ''), 10)
    if (num > max) max = num
  })
  return max
}

const emptyEntry = {
  calledAt: '',
  completedAt: '',
  completionType: '' as const,
  operator: '',
  reservationId: '',
}

const SAMPLE_QUEUE: QueueEntry[] = [
  { id: 'q1', memberId: 'm1', priority: 'normal', priorityValue: 0, ticketNumber: 'A001', status: 'waiting', createdAt: new Date(Date.now() - 3600000).toISOString(), deviceId: '', reason: '', ...emptyEntry },
  { id: 'q2', memberId: 'm4', priority: 'normal', priorityValue: 0, ticketNumber: 'A002', status: 'waiting', createdAt: new Date(Date.now() - 2400000).toISOString(), deviceId: '', reason: '', ...emptyEntry },
  { id: 'q3', memberId: 'm2', priority: 'vip', priorityValue: 50, ticketNumber: 'A003', status: 'waiting', createdAt: new Date(Date.now() - 1800000).toISOString(), deviceId: '', reason: '', ...emptyEntry },
  { id: 'q4', memberId: 'm5', priority: 'normal', priorityValue: 0, ticketNumber: 'A004', status: 'waiting', createdAt: new Date(Date.now() - 900000).toISOString(), deviceId: '', reason: '', ...emptyEntry },
]

const SAMPLE_NOTIFICATIONS: Notification[] = [
  { id: 'n1', type: 'call', message: '请 A003 号到 VR-01 设备', timestamp: new Date(Date.now() - 60000).toISOString(), read: false },
  { id: 'n2', type: 'device-free', message: 'VR-03 已完成消毒，可以使用', timestamp: new Date(Date.now() - 300000).toISOString(), read: false },
  { id: 'n3', type: 'vip-insert', message: 'VIP会员 李四 已插入队列', timestamp: new Date(Date.now() - 600000).toISOString(), read: true },
]

interface QueueState {
  queue: QueueEntry[]
  notifications: Notification[]
  currentServing: QueueEntry | null
  ticketCounter: number
  lastTicketPrefix: string

  takeNumber: (memberId: string, priority?: QueuePriority, reason?: string, deviceId?: string, operator?: string, reservationId?: string) => QueueEntry
  callNext: (deviceId: string) => QueueEntry | null
  skipCurrent: () => void
  recallCurrent: () => void
  completeCurrent: (completionType: 'idle' | 'disinfecting') => void
  vipInsert: (memberId: string, reason: string, operator?: string) => QueueEntry
  emergencyInsert: (memberId: string, reason: string, operator?: string) => QueueEntry
  checkIn: (memberId: string, reservationId: string, operator?: string) => QueueEntry
  getSortedQueue: () => QueueEntry[]
  getAllQueue: () => QueueEntry[]
  getWaitingCount: () => number
  getQueuePosition: (ticketNumber: string) => number
  generateTicketNumber: () => string
  initTicketCounter: () => void

  addNotification: (type: NotificationType, message: string) => void
  markNotificationRead: (id: string) => void
  clearNotifications: () => void
  getUnreadCount: () => number
}

export const useQueueStore = create<QueueState>()(
  persist(
    (set, get) => ({
      queue: SAMPLE_QUEUE,
      notifications: SAMPLE_NOTIFICATIONS,
      currentServing: null,
      ticketCounter: 4,
      lastTicketPrefix: 'A',

      generateTicketNumber: () => {
        const state = get()
        const next = state.ticketCounter + 1
        set({ ticketCounter: next })
        return `${state.lastTicketPrefix}${String(next).padStart(3, '0')}`
      },

      initTicketCounter: () => {
        const state = get()
        const maxNum = findMaxTicketNumber(state.queue)
        if (maxNum > state.ticketCounter) {
          set({ ticketCounter: maxNum })
        }
      },

      takeNumber: (memberId, priority = 'normal', reason = '', deviceId = '', operator = '', reservationId = '') => {
        get().initTicketCounter()
        const ticketNumber = get().generateTicketNumber()
        const entry: QueueEntry = {
          id: generateId(),
          memberId,
          priority,
          priorityValue: PRIORITY_VALUES[priority],
          ticketNumber,
          status: 'waiting',
          createdAt: new Date().toISOString(),
          deviceId,
          reason,
          ...emptyEntry,
          operator,
          reservationId,
        }
        set((state) => ({
          queue: [...state.queue, entry],
        }))
        const pos = get().getQueuePosition(ticketNumber)
        get().addNotification('call', `${ticketNumber} 号已取号，前方等待 ${Math.max(0, pos - 1)} 人`)
        return entry
      },

      callNext: (deviceId) => {
        const sorted = get().getSortedQueue()
        const next = sorted[0]
        if (!next) return null

        const updatedEntry: QueueEntry = {
          ...next,
          status: 'serving',
          deviceId,
          calledAt: new Date().toISOString(),
        }

        set((state) => ({
          queue: state.queue.map((e) =>
            e.id === next.id ? updatedEntry : e
          ),
          currentServing: updatedEntry,
        }))
        get().addNotification('call', `请 ${next.ticketNumber} 号到设备使用`)
        return updatedEntry
      },

      skipCurrent: () => {
        const current = get().currentServing
        if (!current) return
        set((state) => ({
          queue: state.queue.map((e) =>
            e.id === current.id
              ? { ...e, status: 'skipped' as const, deviceId: '', completedAt: new Date().toISOString(), completionType: '' as const }
              : e
          ),
          currentServing: null,
        }))
      },

      recallCurrent: () => {
        const current = get().currentServing
        if (!current) return
        get().addNotification('call', `再次呼叫 ${current.ticketNumber} 号`)
      },

      completeCurrent: (completionType = 'idle') => {
        const current = get().currentServing
        if (!current) return
        set((state) => ({
          queue: state.queue.map((e) =>
            e.id === current.id
              ? { ...e, status: 'completed' as const, completedAt: new Date().toISOString(), completionType }
              : e
          ),
          currentServing: null,
        }))
        get().addNotification('device-free', `${current.ticketNumber} 号已完成，设备${completionType === 'disinfecting' ? '待消毒' : '已空闲'}`)
      },

      vipInsert: (memberId, reason, operator = '') => {
        const entry = get().takeNumber(memberId, 'vip', reason, '', operator)
        get().addNotification('vip-insert', `VIP会员已优先排队 ${entry.ticketNumber}`)
        return entry
      },

      emergencyInsert: (memberId, reason, operator = '') => {
        const entry = get().takeNumber(memberId, 'emergency', reason, '', operator)
        get().addNotification('vip-insert', `应急通道 ${entry.ticketNumber} 已插入队首`)
        return entry
      },

      checkIn: (memberId, reservationId, operator = '') => {
        const entry = get().takeNumber(memberId, 'normal', '预约签到', '', operator, reservationId)
        get().addNotification('reservation-reminder', `会员已签到入队 ${entry.ticketNumber}`)
        return entry
      },

      getSortedQueue: () => {
        return get()
          .queue.filter((e) => e.status === 'waiting')
          .sort((a, b) => {
            if (b.priorityValue !== a.priorityValue) return b.priorityValue - a.priorityValue
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          })
      },

      getAllQueue: () => {
        return get()
          .queue.slice()
          .sort((a, b) => {
            if (b.priorityValue !== a.priorityValue) return b.priorityValue - a.priorityValue
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          })
      },

      getWaitingCount: () => get().queue.filter((e) => e.status === 'waiting').length,

      getQueuePosition: (ticketNumber) => {
        const sorted = get().getSortedQueue()
        const idx = sorted.findIndex((e) => e.ticketNumber === ticketNumber)
        return idx >= 0 ? idx + 1 : -1
      },

      addNotification: (type, message) => {
        const notification: Notification = {
          id: generateId(),
          type,
          message,
          timestamp: new Date().toISOString(),
          read: false,
        }
        set((state) => ({
          notifications: [notification, ...state.notifications].slice(0, 50),
        }))
      },

      markNotificationRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        }))
      },

      clearNotifications: () => set({ notifications: [] }),

      getUnreadCount: () => get().notifications.filter((n) => !n.read).length,
    }),
    {
      name: 'vr-queue-store',
      onRehydrateStorage: () => (state) => {
        if (state) {
          const maxNum = findMaxTicketNumber(state.queue)
          if (maxNum > state.ticketCounter) {
            state.ticketCounter = maxNum
          }
          state.queue = state.queue.map((e) => ({
            ...emptyEntry,
            ...e,
          }))
        }
      },
    }
  )
)
