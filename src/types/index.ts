export type DeviceStatus = 'idle' | 'in-use' | 'disinfecting' | 'maintenance'
export type DeviceType = 'standing' | 'seated' | 'room-scale'
export type DisinfectionMethod = 'UV' | 'wipe' | 'spray'
export type MemberRole = 'member' | 'vip' | 'admin'
export type VipLevel = 'none' | 'silver' | 'gold' | 'platinum'
export type QueuePriority = 'normal' | 'vip' | 'emergency'
export type QueueEntryStatus = 'waiting' | 'serving' | 'skipped' | 'completed'
export type ReservationStatus = 'confirmed' | 'cancelled' | 'completed' | 'conflict'
export type ReservationSource = 'cycle' | 'manual'
export type NotificationType = 'call' | 'device-free' | 'vip-insert' | 'disinfection-due' | 'reservation-reminder'

export interface Device {
  id: string
  name: string
  type: DeviceType
  status: DeviceStatus
  specs: string
  totalUses: number
  lastDisinfection: string
}

export interface DisinfectionRecord {
  id: string
  deviceId: string
  operator: string
  method: DisinfectionMethod
  timestamp: string
  nextDue: string
}

export interface CycleRule {
  id: string
  memberId: string
  deviceId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  startDate: string
  endDate: string
  active: boolean
}

export interface Reservation {
  id: string
  memberId: string
  deviceId: string
  cycleRuleId: string | null
  date: string
  startTime: string
  endTime: string
  status: ReservationStatus
  source: ReservationSource
}

export interface QueueEntry {
  id: string
  memberId: string
  priority: QueuePriority
  priorityValue: number
  ticketNumber: string
  status: QueueEntryStatus
  createdAt: string
  deviceId: string
  reason: string
  calledAt: string
  completedAt: string
  completionType: '' | 'idle' | 'disinfecting'
  operator: string
  reservationId: string
}

export interface Member {
  id: string
  name: string
  phone: string
  role: MemberRole
  vipLevel: VipLevel
  avatar: string
}

export interface Notification {
  id: string
  type: NotificationType
  message: string
  timestamp: string
  read: boolean
}

export const PRIORITY_VALUES: Record<QueuePriority, number> = {
  emergency: 100,
  vip: 50,
  normal: 0,
}

export const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  standing: '站立式',
  seated: '座椅式',
  'room-scale': '空间式',
}

export const DEVICE_STATUS_LABELS: Record<DeviceStatus, string> = {
  idle: '空闲',
  'in-use': '使用中',
  disinfecting: '消毒中',
  maintenance: '维修中',
}

export const DISINFECTION_METHOD_LABELS: Record<DisinfectionMethod, string> = {
  UV: '紫外线',
  wipe: '擦拭',
  spray: '喷雾',
}

export const VIP_LEVEL_LABELS: Record<VipLevel, string> = {
  none: '普通',
  silver: '银卡',
  gold: '金卡',
  platinum: '白金卡',
}

export const QUEUE_PRIORITY_LABELS: Record<QueuePriority, string> = {
  normal: '普通',
  vip: 'VIP',
  emergency: '应急',
}

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  confirmed: '已确认',
  cancelled: '已取消',
  completed: '已完成',
  conflict: '冲突',
}

export const DAY_OF_WEEK_LABELS: Record<number, string> = {
  1: '周一',
  2: '周二',
  3: '周三',
  4: '周四',
  5: '周五',
  6: '周六',
  7: '周日',
}
