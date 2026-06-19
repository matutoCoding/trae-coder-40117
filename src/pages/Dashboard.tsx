import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  Monitor,
  CalendarCheck,
  Users,
  SprayCan,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDeviceStore } from '@/stores/deviceStore'
import { useQueueStore } from '@/stores/queueStore'
import { useReservationStore } from '@/stores/reservationStore'
import { useMemberStore } from '@/stores/memberStore'

export default function Dashboard() {
  const navigate = useNavigate()
  const [showNotifications, setShowNotifications] = useState(false)

  const devices = useDeviceStore((s) => s.devices)
  const { currentServing, notifications, getUnreadCount, getWaitingCount, getSortedQueue, markNotificationRead } = useQueueStore()
  const { getReservationsByDate } = useReservationStore()
  const getMemberById = useMemberStore((s) => s.getMemberById)

  const today = new Date().toISOString().split('T')[0]
  const todayReservations = getReservationsByDate(today)
  const unreadCount = getUnreadCount()
  const waitingCount = getWaitingCount()
  const sortedQueue = getSortedQueue()
  const latestCall = sortedQueue[0]

  const totalDevices = devices.length
  const idleDevices = devices.filter((d) => d.status === 'idle').length
  const inUseDevices = devices.filter((d) => d.status === 'in-use').length
  const disinfectingDevices = devices.filter((d) => d.status === 'disinfecting').length

  const getDeviceName = (id: string) => devices.find((d) => d.id === id)?.name ?? '未知设备'
  const getMemberName = (id: string) => getMemberById(id)?.name ?? '未知会员'

  const statCards = [
    { label: '设备总数', value: totalDevices, color: '#00F0FF' },
    { label: '空闲', value: idleDevices, color: '#00F0FF' },
    { label: '使用中', value: inUseDevices, color: '#FF2D78' },
    { label: '消毒中', value: disinfectingDevices, color: '#a855f7' },
  ]

  const quickEntries = [
    { label: '设备排期', icon: Monitor, path: '/devices', color: '#00F0FF' },
    { label: '周期预约', icon: CalendarCheck, path: '/reservations', color: '#FF2D78' },
    { label: '排队叫号', icon: Users, path: '/queue', color: '#a855f7' },
    { label: '消毒登记', icon: SprayCan, path: '/devices', color: '#f59e0b' },
  ]

  return (
    <div className="min-h-screen bg-[#060a14] px-4 pb-24 pt-6 text-white">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">
              <span className="text-[#00F0FF]">VR</span> 管理中心
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">{today}</p>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative rounded-lg border border-[#00F0FF]/20 bg-[#0d1220] p-2 transition hover:border-[#00F0FF]/50"
            >
              <Bell size={20} className="text-[#00F0FF]" />
              {unreadCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#FF2D78] text-xs font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-12 z-50 w-72 rounded-xl border border-[#00F0FF]/20 bg-[#0a0e1a] shadow-[0_0_30px_rgba(0,240,255,0.1)]">
                <div className="border-b border-gray-800 px-4 py-3 text-sm font-medium text-[#00F0FF]">
                  通知
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-500">暂无通知</div>
                  ) : (
                    notifications.slice(0, 10).map((n) => (
                      <div
                        key={n.id}
                        onClick={() => markNotificationRead(n.id)}
                        className={cn(
                          'cursor-pointer border-b border-gray-800/50 px-4 py-3 transition hover:bg-white/5',
                          !n.read && 'bg-[#00F0FF]/5'
                        )}
                      >
                        <p className={cn('text-sm', n.read ? 'text-gray-400' : 'text-white')}>
                          {n.message}
                        </p>
                        <p className="mt-1 text-xs text-gray-600">
                          {new Date(n.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <section className="mb-6">
          <h2 className="mb-3 text-sm font-medium text-gray-400">设备状态概览</h2>
          <div className="grid grid-cols-4 gap-2.5">
            {statCards.map((card) => (
              <button
                key={card.label}
                onClick={() => navigate('/devices')}
                className="group rounded-xl border border-white/5 bg-[#0d1220] p-3 transition hover:border-white/20 hover:bg-[#0f1628]"
              >
                <div
                  className="text-2xl font-bold tabular-nums"
                  style={{ color: card.color, textShadow: `0 0 20px ${card.color}60` }}
                >
                  {card.value}
                </div>
                <div className="mt-1 text-xs text-gray-500 group-hover:text-gray-400">{card.label}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="mb-6">
          <h2 className="mb-3 text-sm font-medium text-gray-400">排队概览</h2>
          <div className="rounded-xl border border-[#FF2D78]/20 bg-[#0d1220] p-4">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-xs text-gray-500">当前等待人数</div>
                <div
                  className="text-5xl font-bold tabular-nums"
                  style={{ color: '#FF2D78', textShadow: '0 0 30px #FF2D7860' }}
                >
                  {waitingCount}
                </div>
              </div>
              <div className="text-right">
                {currentServing ? (
                  <>
                    <div className="text-xs text-gray-500">正在服务</div>
                    <div className="text-lg font-bold text-[#00F0FF]">{currentServing.ticketNumber}</div>
                  </>
                ) : (
                  <div className="text-xs text-gray-600">暂无服务中</div>
                )}
              </div>
            </div>
            {latestCall && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#FF2D78]/10 px-3 py-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-[#FF2D78]" />
                <span className="text-sm text-[#FF2D78]">
                  下一位: {latestCall.ticketNumber} - {getMemberName(latestCall.memberId)}
                </span>
              </div>
            )}
          </div>
        </section>

        <section className="mb-6">
          <h2 className="mb-3 text-sm font-medium text-gray-400">快速入口</h2>
          <div className="grid grid-cols-4 gap-3">
            {quickEntries.map((entry) => (
              <button
                key={entry.label}
                onClick={() => navigate(entry.path)}
                className="flex flex-col items-center gap-2 rounded-xl border bg-[#0d1220] p-4 transition hover:scale-105"
                style={{
                  borderColor: `${entry.color}30`,
                  boxShadow: `0 0 15px ${entry.color}15`,
                }}
              >
                <entry.icon size={24} style={{ color: entry.color }} />
                <span className="text-xs text-gray-400">{entry.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-400">今日预约</h2>
            <span className="text-xs text-gray-600">{todayReservations.length} 条</span>
          </div>
          <div className="space-y-2.5">
            {todayReservations.length === 0 ? (
              <div className="rounded-xl border border-gray-800 bg-[#0d1220] px-4 py-8 text-center text-sm text-gray-600">
                今日暂无预约
              </div>
            ) : (
              todayReservations.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-[#0d1220] px-4 py-3"
                >
                  <div>
                    <div className="text-sm font-medium text-white">{getDeviceName(r.deviceId)}</div>
                    <div className="text-xs text-gray-500">{getMemberName(r.memberId)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-[#00F0FF]/10 px-2 py-0.5 text-xs text-[#00F0FF]">
                      {r.startTime}-{r.endTime}
                    </span>
                    <ChevronRight size={14} className="text-gray-600" />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
