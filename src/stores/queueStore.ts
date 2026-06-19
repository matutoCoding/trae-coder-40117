import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { QueueEntry, QueuePriority, Notification, NotificationType } from '@/types'
import { PRIORITY_VALUES } from '@/types'

const generateId = () => crypto.randomUUID()

let ticketCounter = 0
const generateTicketNumber = () => {
  ticketCounter++
  return `A${String(ticketCounter).padStart(3, '0')}`
}

const SAMPLE_QUEUE: QueueEntry[] = [
  { id: 'q1', memberId: 'm1', priority: 'normal', priorityValue: 0, ticketNumber: 'A001', status: 'waiting', createdAt: new Date(Date.now() - 3600000).toISOString(), deviceId: '', reason: '' },
  { id: 'q2', memberId: 'm4', priority: 'normal', priorityValue: 0, ticketNumber: 'A002', status: 'waiting', createdAt: new Date(Date.now() - 2400000).toISOString(), deviceId: '', reason: '' },
  { id: 'q3', memberId: 'm2', priority: 'vip', priorityValue: 50, ticketNumber: 'A003', status: 'waiting', createdAt: new Date(Date.now() - 1800000).toISOString(), deviceId: '', reason: '' },
  { id: 'q4', memberId: 'm5', priority: 'normal', priorityValue: 0, ticketNumber: 'A004', status: 'waiting', createdAt: new Date(Date.now() - 900000).toISOString(), deviceId: '', reason: '' },
]

ticketCounter = 4

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

  takeNumber: (memberId: string, priority?: QueuePriority, reason?: string, deviceId?: string) => QueueEntry
  callNext: () => QueueEntry | null
  skipCurrent: () => void
  recallCurrent: () => void
  completeCurrent: () => void
  vipInsert: (memberId: string, reason: string) => QueueEntry
  emergencyInsert: (memberId: string, reason: string) => QueueEntry
  getSortedQueue: () => QueueEntry[]
  getWaitingCount: () => number
  getQueuePosition: (ticketNumber: string) => number

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

      takeNumber: (memberId, priority = 'normal', reason = '', deviceId = '') => {
        const ticketNumber = generateTicketNumber()
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
        }
        set((state) => ({
          queue: [...state.queue, entry],
          ticketCounter: state.ticketCounter + 1,
        }))
        get().addNotification('call', `${ticketNumber} 号已取号，前方等待 ${get().getWaitingCount()} 人`)
        return entry
      },

      callNext: () => {
        const sorted = get().getSortedQueue()
        const next = sorted[0]
        if (!next) return null

        set((state) => ({
          queue: state.queue.map((e) =>
            e.id === next.id ? { ...e, status: 'serving' as const } : e
          ),
          currentServing: { ...next, status: 'serving' },
        }))
        get().addNotification('call', `请 ${next.ticketNumber} 号到设备使用`)
        return next
      },

      skipCurrent: () => {
        const current = get().currentServing
        if (!current) return
        set((state) => ({
          queue: state.queue.map((e) =>
            e.id === current.id ? { ...e, status: 'skipped' as const } : e
          ),
          currentServing: null,
        }))
      },

      recallCurrent: () => {
        const current = get().currentServing
        if (!current) return
        get().addNotification('call', `再次呼叫 ${current.ticketNumber} 号`)
      },

      completeCurrent: () => {
        const current = get().currentServing
        if (!current) return
        set((state) => ({
          queue: state.queue.map((e) =>
            e.id === current.id ? { ...e, status: 'completed' as const } : e
          ),
          currentServing: null,
        }))
        get().addNotification('device-free', `${current.ticketNumber} 号已完成，设备空闲`)
      },

      vipInsert: (memberId, reason) => {
        const entry = get().takeNumber(memberId, 'vip', reason)
        get().addNotification('vip-insert', `VIP会员已优先排队 ${entry.ticketNumber}`)
        return entry
      },

      emergencyInsert: (memberId, reason) => {
        const entry = get().takeNumber(memberId, 'emergency', reason)
        get().addNotification('vip-insert', `应急通道 ${entry.ticketNumber} 已插入队首`)
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
    { name: 'vr-queue-store' }
  )
)
