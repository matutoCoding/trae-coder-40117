import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, SprayCan } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDeviceStore } from '@/stores/deviceStore'
import { useReservationStore } from '@/stores/reservationStore'
import { useMemberStore } from '@/stores/memberStore'
import DisinfectionModal from '@/components/DisinfectionModal'
import type { DeviceStatus } from '@/types'
import { DEVICE_TYPE_LABELS, DEVICE_STATUS_LABELS, DISINFECTION_METHOD_LABELS } from '@/types'

export default function DeviceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [showDisinfectModal, setShowDisinfectModal] = useState(false)

  const { getDeviceById, getDisinfectionRecordsByDevice, updateDeviceStatus } = useDeviceStore()
  const getReservationsByDevice = useReservationStore((s) => s.getReservationsByDevice)
  const getMemberById = useMemberStore((s) => s.getMemberById)

  const device = id ? getDeviceById(id) : undefined

  if (!device) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060a14] text-gray-500">
        设备不存在
      </div>
    )
  }

  const reservations = getReservationsByDevice(device.id)
  const records = getDisinfectionRecordsByDevice(device.id).slice(0, 5)
  const today = new Date().toISOString().split('T')[0]
  const todayReservations = reservations.filter((r) => r.date === today)

  const timeSlots = []
  for (let h = 9; h <= 21; h++) {
    timeSlots.push(`${String(h).padStart(2, '0')}:00`)
  }

  const getStatusForSlot = (time: string) => {
    const hour = parseInt(time.split(':')[0])
    const slotStart = `${String(hour).padStart(2, '0')}:00`
    const slotEnd = `${String(hour + 1).padStart(2, '0')}:00`
    return todayReservations.find((r) => r.startTime < slotEnd && r.endTime > slotStart)
  }

  const getMemberName = (memberId: string) => getMemberById(memberId)?.name ?? '未知会员'

  return (
    <div className="min-h-screen bg-[#060a14] px-4 pb-24 pt-4 text-white">
      <div className="mx-auto max-w-lg">
        <div className="mb-5 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-lg border border-[#00F0FF]/20 bg-[#0d1220] p-2 transition hover:border-[#00F0FF]/50"
          >
            <ArrowLeft size={18} className="text-[#00F0FF]" />
          </button>
          <h1 className="text-lg font-bold">{device.name}</h1>
        </div>

        <section className="mb-6 rounded-xl border border-white/5 bg-[#0d1220] p-5">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-gray-400">状态</span>
            <select
              value={device.status}
              onChange={(e) => updateDeviceStatus(device.id, e.target.value as DeviceStatus)}
              className="rounded-lg border border-[#00F0FF]/20 bg-[#060a14] px-3 py-1.5 text-sm outline-none focus:border-[#00F0FF]/50"
            >
              {Object.entries(DEVICE_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">名称</span>
              <span>{device.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">类型</span>
              <span className="text-[#00F0FF]">{DEVICE_TYPE_LABELS[device.type]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">规格</span>
              <span className="text-gray-300">{device.specs || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">累计使用</span>
              <span style={{ color: '#FF2D78', textShadow: '0 0 10px #FF2D7840' }} className="font-bold tabular-nums">
                {device.totalUses} 次
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowDisinfectModal(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-[#a855f7]/30 bg-[#a855f7]/10 py-2.5 text-sm font-medium text-purple-400 transition hover:bg-[#a855f7]/20"
          >
            <SprayCan size={16} />
            消毒登记
          </button>
        </section>

        <section className="mb-6">
          <h2 className="mb-3 text-sm font-medium text-gray-400">今日排期</h2>
          <div className="rounded-xl border border-white/5 bg-[#0d1220] p-4">
            <div className="flex gap-0.5 overflow-x-auto pb-2">
              {timeSlots.map((time) => {
                const reservation = getStatusForSlot(time)
                return (
                  <div key={time} className="flex min-w-[52px] flex-col items-center gap-1">
                    <span className="text-[10px] text-gray-600">{time}</span>
                    <div
                      className={cn(
                        'h-8 w-full rounded-sm',
                        reservation
                          ? 'bg-gradient-to-b from-[#00F0FF]/40 to-[#FF2D78]/40'
                          : 'bg-white/5'
                      )}
                    />
                    {reservation && (
                      <span className="max-w-[48px] truncate text-[9px] text-[#00F0FF]">
                        {getMemberName(reservation.memberId)}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-gray-400">消毒记录</h2>
          <div className="space-y-2">
            {records.length === 0 ? (
              <div className="rounded-xl border border-gray-800 bg-[#0d1220] px-4 py-6 text-center text-sm text-gray-600">
                暂无消毒记录
              </div>
            ) : (
              records.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-[#0d1220] px-4 py-3"
                >
                  <div>
                    <div className="text-sm text-white">
                      {DISINFECTION_METHOD_LABELS[record.method]}
                    </div>
                    <div className="text-xs text-gray-500">
                      {record.operator} · {new Date(record.timestamp).toLocaleString('zh-CN', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-purple-500" />
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <DisinfectionModal
        deviceId={device.id}
        open={showDisinfectModal}
        onClose={() => setShowDisinfectModal(false)}
      />
    </div>
  )
}
