import { useState, useEffect, useMemo } from 'react'
import type { QueuePriority, QueueEntry, QueueEntryStatus } from '@/types'
import { QUEUE_PRIORITY_LABELS } from '@/types'
import { useQueueStore } from '@/stores/queueStore'
import { useMemberStore } from '@/stores/memberStore'
import { useDeviceStore } from '@/stores/deviceStore'
import { useReservationStore } from '@/stores/reservationStore'
import { cn } from '@/lib/utils'
import QueueEntryCard from '@/components/QueueEntryCard'
import {
  Mic,
  SkipForward,
  RotateCcw,
  CheckCircle,
  Crown,
  AlertOctagon,
  UserPlus,
  X,
  Sparkles,
  Monitor,
  AlertTriangle,
  ClipboardList,
  LogIn,
  Clock,
  User,
  ShieldCheck,
  Info,
  MapPin,
  FileText,
  Calendar,
} from 'lucide-react'

type InsertType = 'vip' | 'emergency' | null
type QueueTab = 'queue' | 'records'

const STATUS_FILTERS: { value: QueueEntryStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'waiting', label: '等待中' },
  { value: 'serving', label: '服务中' },
  { value: 'completed', label: '已完成' },
  { value: 'skipped', label: '跳号' },
]

const COMPLETION_TYPE_LABELS: Record<string, string> = {
  idle: '直接空闲',
  disinfecting: '需消毒',
  '': '-',
}

export default function Queue() {
  const [activeTab, setActiveTab] = useState<QueueTab>('queue')
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [selectedPriority, setSelectedPriority] = useState<QueuePriority>('normal')
  const [reason, setReason] = useState('')
  const [showReason, setShowReason] = useState(false)
  const [insertType, setInsertType] = useState<InsertType>(null)
  const [insertMemberId, setInsertMemberId] = useState('')
  const [insertReason, setInsertReason] = useState('')
  const [ticketAnimation, setTicketAnimation] = useState<QueueEntry | null>(null)
  const [flashKey, setFlashKey] = useState(0)
  const [showDeviceSelect, setShowDeviceSelect] = useState(false)
  const [recordFilter, setRecordFilter] = useState<QueueEntryStatus | 'all'>('all')
  const [showCheckIn, setShowCheckIn] = useState(false)
  const [checkInMemberId, setCheckInMemberId] = useState('')
  const [currentAdminId] = useState('m6')
  const [selectedRecord, setSelectedRecord] = useState<QueueEntry | null>(null)

  const {
    currentServing,
    takeNumber,
    callNext,
    skipCurrent,
    recallCurrent,
    completeCurrent,
    vipInsert,
    emergencyInsert,
    checkIn,
    getSortedQueue,
    getAllQueue,
  } = useQueueStore()

  const { members, getMemberById } = useMemberStore()
  const { devices, updateDeviceStatus } = useDeviceStore()
  const { getReservationsByMember, reservations, checkInReservation, updateReservationArrival, getReservationById } = useReservationStore()

  const sortedQueue = getSortedQueue()
  const allQueue = getAllQueue()
  const idleDevices = devices.filter((d) => d.status === 'idle')

  useEffect(() => {
    if (currentServing) {
      setFlashKey((k) => k + 1)
    }
  }, [currentServing])

  const getMemberName = (id: string) => getMemberById(id)?.name ?? id
  const getDeviceName = (id: string) => {
    if (!id) return '-'
    return devices.find((d) => d.id === id)?.name ?? id
  }

  const filteredRecords = useMemo(() => {
    if (recordFilter === 'all') return allQueue
    return allQueue.filter((e) => e.status === recordFilter)
  }, [allQueue, recordFilter])

  const checkInCandidates = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return members.filter((m) => {
      if (m.role === 'admin') return false
      const memberRes = getReservationsByMember(m.id).filter(
        (r) => r.date === today && r.status === 'confirmed' && r.arrivalStatus === 'pending'
      )
      return memberRes.length > 0
    })
  }, [members, getReservationsByMember])

  const getTodayReservations = (memberId: string) => {
    const today = new Date().toISOString().split('T')[0]
    return getReservationsByMember(memberId).filter(
      (r) => r.date === today && r.status === 'confirmed' && r.arrivalStatus === 'pending'
    )
  }

  const handleTakeNumber = () => {
    if (!selectedMemberId) return
    if (showReason && !reason) return
    const member = getMemberById(selectedMemberId)
    const isVip = member?.role === 'vip'
    const entry = takeNumber(
      selectedMemberId,
      selectedPriority,
      reason,
      '',
      isVip || selectedPriority !== 'normal' ? getMemberName(currentAdminId) : ''
    )
    setTicketAnimation(entry)
    setTimeout(() => setTicketAnimation(null), 2500)
    setSelectedMemberId('')
    setReason('')
    setShowReason(false)
    setSelectedPriority('normal')
  }

  const handlePriorityChange = (p: QueuePriority) => {
    setSelectedPriority(p)
    if (p === 'vip' || p === 'emergency') {
      setShowReason(true)
    } else {
      setShowReason(false)
      setReason('')
    }
  }

  const handleCallNext = () => {
    if (sortedQueue.length === 0) return
    if (idleDevices.length === 0) return
    if (idleDevices.length === 1) {
      doCallNext(idleDevices[0].id)
    } else {
      setShowDeviceSelect(true)
    }
  }

  const doCallNext = (deviceId: string) => {
    callNext(deviceId)
    updateDeviceStatus(deviceId, 'in-use')
    setShowDeviceSelect(false)
  }

  const handleInsert = (type: InsertType) => {
    setInsertType(type)
    setInsertMemberId('')
    setInsertReason('')
  }

  const handleInsertConfirm = () => {
    if (!insertMemberId || !insertReason || !insertType) return
    const operatorName = getMemberName(currentAdminId)
    if (insertType === 'vip') {
      vipInsert(insertMemberId, insertReason, operatorName)
    } else {
      emergencyInsert(insertMemberId, insertReason, operatorName)
    }
    setInsertType(null)
    setInsertMemberId('')
    setInsertReason('')
  }

  const handleComplete = (completionType: 'idle' | 'disinfecting') => {
    if (!currentServing) return
    const deviceId = currentServing.deviceId
    if (currentServing.reservationId) {
      updateReservationArrival(currentServing.reservationId, 'served')
    }
    completeCurrent(completionType)
    if (deviceId) {
      updateDeviceStatus(deviceId, completionType)
    }
  }

  const handleSkip = () => {
    if (!currentServing) return
    const deviceId = currentServing.deviceId
    skipCurrent()
    if (deviceId) {
      updateDeviceStatus(deviceId, 'idle')
    }
  }

  const handleCheckIn = (memberId: string, reservationId: string) => {
    const operatorName = getMemberName(currentAdminId)
    const entry = checkIn(memberId, reservationId, operatorName)
    checkInReservation(reservationId, entry.id)
    setShowCheckIn(false)
    setCheckInMemberId('')
  }

  const formatTime = (iso: string) => {
    if (!iso) return '-'
    return new Date(iso).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  return (
    <div className="min-h-screen bg-[#0A0E1A] pb-32 pt-4">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-4 flex gap-1 rounded-lg bg-[#141B2D] p-1">
          {(['queue', 'records'] as QueueTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all',
                activeTab === tab
                  ? 'bg-gradient-to-r from-[#00F0FF]/20 to-[#FF2D78]/20 text-[#00F0FF]'
                  : 'text-gray-500 hover:text-gray-300'
              )}
            >
              {tab === 'queue' ? '实时排队' : '服务记录'}
            </button>
          ))}
        </div>

        {activeTab === 'queue' && (
          <>
            <div className="mb-6 rounded-xl border border-[#00F0FF]/30 bg-[#141B2D] p-6 text-center shadow-[0_0_40px_rgba(0,240,255,0.1)]">
              {currentServing ? (
                <div key={flashKey}>
                  <p className="mb-1 text-xs text-gray-500">当前叫号</p>
                  <p className="animate-pulse font-mono text-5xl font-bold text-[#00F0FF] drop-shadow-[0_0_20px_rgba(0,240,255,0.6)]">
                    {currentServing.ticketNumber}
                  </p>
                  <p className="mt-2 text-base text-white">
                    {getMemberName(currentServing.memberId)}
                  </p>
                  {currentServing.deviceId && (
                    <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-[#FF2D78]/20 px-3 py-1.5">
                      <Monitor size={14} className="text-[#FF2D78]" />
                      <span className="text-sm font-medium text-[#FF2D78]">
                        {getDeviceName(currentServing.deviceId)}
                      </span>
                    </div>
                  )}
                  {currentServing.calledAt && (
                    <p className="mt-2 text-xs text-gray-500">
                      叫号时间 {formatTime(currentServing.calledAt)}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-xl font-medium text-gray-600">等待叫号</p>
                  <p className="mt-1 text-sm text-gray-700">点击"叫下一位"开始服务</p>
                </div>
              )}
            </div>

            <div className="mb-3 flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Monitor size={14} className="text-[#00F0FF]" />
                <span>空闲 <span className="text-[#00F0FF] font-bold">{idleDevices.length}</span> 台</span>
              </div>
              {idleDevices.length === 0 && (
                <div className="flex items-center gap-1 text-xs text-[#FF2D78]">
                  <AlertTriangle size={12} />
                  <span>暂无空闲设备</span>
                </div>
              )}
              <button
                onClick={() => setShowCheckIn(true)}
                className="ml-auto flex items-center gap-1.5 rounded-lg border border-[#00FF88]/40 bg-[#00FF88]/10 px-3 py-1.5 text-xs text-[#00FF88] transition-all hover:bg-[#00FF88]/20"
              >
                <LogIn size={12} />
                预约签到
              </button>
            </div>

            <div className="mb-6 rounded-xl border border-[#00F0FF]/20 bg-[#141B2D] p-4">
              <h3 className="mb-3 text-sm font-semibold text-gray-400">取号</h3>
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[160px] flex-1">
                  <select
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="w-full rounded-lg border border-[#00F0FF]/30 bg-[#0A0E1A] px-3 py-2 text-sm text-white outline-none focus:border-[#00F0FF]"
                  >
                    <option value="">选择会员</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-1 rounded-lg bg-[#0A0E1A] p-1">
                  {(['normal', 'vip', 'emergency'] as QueuePriority[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => handlePriorityChange(p)}
                      className={cn(
                        'rounded-md px-2.5 py-1.5 text-xs font-medium transition-all',
                        selectedPriority === p
                          ? p === 'normal'
                            ? 'bg-[#00F0FF]/20 text-[#00F0FF]'
                            : p === 'vip'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-[#FF2D78]/20 text-[#FF2D78]'
                          : 'text-gray-500 hover:text-gray-300'
                      )}
                    >
                      {QUEUE_PRIORITY_LABELS[p]}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleTakeNumber}
                  disabled={!selectedMemberId || (showReason && !reason)}
                  className="rounded-lg bg-gradient-to-r from-[#00F0FF] to-[#FF2D78] px-5 py-2 text-sm font-medium text-black transition-all hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] disabled:opacity-40"
                >
                  取号
                </button>
              </div>
              {showReason && (
                <div className="mt-3">
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={selectedPriority === 'vip' ? '请填写VIP原因' : '请填写应急原因'}
                    className="w-full max-w-md rounded-lg border border-[#00F0FF]/30 bg-[#0A0E1A] px-3 py-2 text-sm text-white outline-none focus:border-[#00F0FF]"
                  />
                </div>
              )}
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold text-gray-400">
                实时队列
                <span className="ml-2 text-[#00F0FF]">{sortedQueue.length}</span> 人等待
              </h3>
              <div className="space-y-3">
                {sortedQueue.map((entry) => (
                  <QueueEntryCard
                    key={entry.id}
                    entry={entry}
                    isCurrent={currentServing?.id === entry.id}
                  />
                ))}
                {sortedQueue.length === 0 && (
                  <div className="py-10 text-center text-gray-600">暂无排队</div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'records' && (
          <div>
            <div className="mb-4 flex items-center gap-2 overflow-x-auto">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setRecordFilter(f.value)}
                  className={cn(
                    'shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                    recordFilter === f.value
                      ? 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40'
                      : 'text-gray-500 border border-gray-800 hover:text-gray-300'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {filteredRecords.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => setSelectedRecord(entry)}
                  className={cn(
                    'cursor-pointer rounded-lg border bg-[#141B2D] p-4 transition-all',
                    entry.status === 'serving'
                      ? 'border-[#00F0FF]/40 shadow-[0_0_12px_rgba(0,240,255,0.15)]'
                      : entry.status === 'waiting'
                      ? 'border-[#00F0FF]/20'
                      : entry.status === 'completed'
                      ? 'border-green-500/20'
                      : 'border-gray-700',
                    'hover:border-[#00F0FF]/60'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        'font-mono text-lg font-bold',
                        entry.priority === 'emergency' ? 'text-[#FF2D78]' :
                        entry.priority === 'vip' ? 'text-yellow-400' : 'text-[#00F0FF]'
                      )}>
                        {entry.ticketNumber}
                      </span>
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        entry.priority === 'emergency' ? 'bg-[#FF2D78]/20 text-[#FF2D78]' :
                        entry.priority === 'vip' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-[#00F0FF]/20 text-[#00F0FF]'
                      )}>
                        {QUEUE_PRIORITY_LABELS[entry.priority]}
                      </span>
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        entry.status === 'serving' ? 'bg-[#00F0FF]/20 text-[#00F0FF]' :
                        entry.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        entry.status === 'skipped' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-gray-500/20 text-gray-400'
                      )}>
                        {entry.status === 'waiting' ? '等待中' :
                         entry.status === 'serving' ? '服务中' :
                         entry.status === 'completed' ? '已完成' : '跳号'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <User size={12} />
                      <span>{getMemberName(entry.memberId)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Monitor size={12} />
                      <span>{entry.deviceId ? getDeviceName(entry.deviceId) : '未分配'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} />
                      <span>取号 {formatTime(entry.createdAt)}</span>
                    </div>
                    {entry.calledAt && (
                      <div className="flex items-center gap-1.5">
                        <Mic size={12} />
                        <span>叫号 {formatTime(entry.calledAt)}</span>
                      </div>
                    )}
                    {entry.completedAt && (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle size={12} />
                        <span>完成 {formatTime(entry.completedAt)}</span>
                      </div>
                    )}
                    {entry.completionType && (
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck size={12} />
                        <span>{COMPLETION_TYPE_LABELS[entry.completionType]}</span>
                      </div>
                    )}
                    {entry.reason && (
                      <div className="col-span-2 text-gray-500">
                        原因：{entry.reason}
                      </div>
                    )}
                    {entry.operator && (
                      <div className="col-span-2 text-gray-500">
                        处理人：{entry.operator}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {filteredRecords.length === 0 && (
                <div className="py-12 text-center text-gray-600">暂无记录</div>
              )}
            </div>
          </div>
        )}
      </div>

      {selectedRecord && (() => {
        const res = selectedRecord.reservationId ? getReservationById(selectedRecord.reservationId) : undefined
        const timeline: { icon: any; label: string; time: string; color: string }[] = []
        timeline.push({ icon: ClipboardList, label: '取号', time: selectedRecord.createdAt, color: 'text-[#00F0FF]' })
        if (selectedRecord.calledAt) {
          timeline.push({ icon: Mic, label: `叫号 · ${getDeviceName(selectedRecord.deviceId)}`, time: selectedRecord.calledAt, color: 'text-yellow-400' })
        }
        if (selectedRecord.status === 'serving' && selectedRecord.calledAt) {
          timeline.push({ icon: Monitor, label: '服务中', time: selectedRecord.calledAt, color: 'text-[#00FF88]' })
        }
        if (selectedRecord.status === 'skipped' && selectedRecord.completedAt) {
          timeline.push({ icon: SkipForward, label: '跳号', time: selectedRecord.completedAt, color: 'text-yellow-400' })
        }
        if (selectedRecord.status === 'completed') {
          timeline.push({ icon: CheckCircle, label: `完成服务 · ${COMPLETION_TYPE_LABELS[selectedRecord.completionType]}`, time: selectedRecord.completedAt, color: 'text-green-400' })
          if (selectedRecord.completionType === 'disinfecting') {
            const device = devices.find((d) => d.id === selectedRecord.deviceId)
            if (device && device.status === 'idle' && device.lastDisinfection) {
              timeline.push({ icon: ShieldCheck, label: '消毒登记完成', time: device.lastDisinfection, color: 'text-green-400' })
            } else {
              timeline.push({ icon: ShieldCheck, label: '待消毒登记', time: '', color: 'text-[#FF2D78]' })
            }
          }
        }
        return (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
            <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-[#00F0FF]/30 bg-[#0A0E1A] p-5 sm:rounded-2xl">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'font-mono text-2xl font-bold',
                      selectedRecord.priority === 'emergency' ? 'text-[#FF2D78]' :
                      selectedRecord.priority === 'vip' ? 'text-yellow-400' : 'text-[#00F0FF]'
                    )}>
                      {selectedRecord.ticketNumber}
                    </span>
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      selectedRecord.status === 'serving' ? 'bg-[#00F0FF]/20 text-[#00F0FF]' :
                      selectedRecord.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      selectedRecord.status === 'skipped' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-gray-500/20 text-gray-400'
                    )}>
                      {selectedRecord.status === 'waiting' ? '等待中' :
                       selectedRecord.status === 'serving' ? '服务中' :
                       selectedRecord.status === 'completed' ? '已完成' : '跳号'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-white">{getMemberName(selectedRecord.memberId)}</p>
                </div>
                <button onClick={() => setSelectedRecord(null)} className="rounded-lg p-2 text-gray-500 hover:bg-white/5 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              {res && (
                <div className="mb-4 rounded-lg border border-[#00FF88]/20 bg-[#00FF88]/5 p-3">
                  <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[#00FF88]">
                    <Calendar size={12} /> 关联预约
                  </div>
                  <div className="space-y-1 text-xs text-gray-300">
                    <div><span className="text-gray-500">日期：</span>{res.date}</div>
                    <div><span className="text-gray-500">时段：</span>{res.startTime} - {res.endTime}</div>
                    <div><span className="text-gray-500">设备：</span>{getDeviceName(res.deviceId)}</div>
                  </div>
                </div>
              )}

              <div className="mb-4 rounded-lg border border-white/5 bg-white/2 p-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">分配设备</span>
                    <p className="mt-0.5 text-white">{selectedRecord.deviceId ? getDeviceName(selectedRecord.deviceId) : '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">优先级</span>
                    <p className="mt-0.5 text-white">{QUEUE_PRIORITY_LABELS[selectedRecord.priority]}</p>
                  </div>
                  {selectedRecord.reason && (
                    <div className="col-span-2">
                      <span className="text-gray-500">原因</span>
                      <p className="mt-0.5 text-white">{selectedRecord.reason}</p>
                    </div>
                  )}
                  {selectedRecord.operator && (
                    <div className="col-span-2">
                      <span className="text-gray-500">处理人</span>
                      <p className="mt-0.5 text-white">{selectedRecord.operator}</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-3 text-sm font-medium text-white">服务时间线</div>
                <div className="relative space-y-0">
                  {timeline.map((t, idx) => (
                    <div key={idx} className="flex gap-3 pb-4 last:pb-0">
                      <div className="flex flex-col items-center">
                        <div className={cn('flex h-7 w-7 items-center justify-center rounded-full bg-[#141B2D] border border-white/10', t.color)}>
                          <t.icon size={13} />
                        </div>
                        {idx < timeline.length - 1 && <div className="mt-1 w-px flex-1 bg-white/10" />}
                      </div>
                      <div className="flex-1 pt-1">
                        <div className={cn('text-sm font-medium', t.color)}>{t.label}</div>
                        {t.time && <div className="text-xs text-gray-500">{formatTime(t.time)}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {ticketAnimation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="animate-bounce text-center">
            <Sparkles size={32} className="mx-auto mb-3 text-[#00F0FF]" />
            <p className="mb-2 text-sm text-gray-400">取号成功</p>
            <p className="font-mono text-5xl font-bold text-[#00F0FF] drop-shadow-[0_0_30px_rgba(0,240,255,0.6)]">
              {ticketAnimation.ticketNumber}
            </p>
            <p className="mt-3 text-lg text-white">{getMemberName(ticketAnimation.memberId)}</p>
          </div>
        </div>
      )}

      {showDeviceSelect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-[#00F0FF]/30 bg-[#141B2D] p-6 shadow-[0_0_30px_rgba(0,240,255,0.15)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#00F0FF]">选择设备</h3>
              <button onClick={() => setShowDeviceSelect(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>
            <p className="mb-4 text-sm text-gray-400">为下一位会员分配空闲设备</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {idleDevices.map((device) => (
                <button
                  key={device.id}
                  onClick={() => doCallNext(device.id)}
                  className="w-full flex items-center justify-between rounded-lg border border-[#00F0FF]/30 bg-[#0A0E1A] px-4 py-3 text-left transition-all hover:border-[#00F0FF] hover:bg-[#00F0FF]/5"
                >
                  <div>
                    <span className="font-medium text-white">{device.name}</span>
                    <p className="text-xs text-gray-500">{device.specs}</p>
                  </div>
                  <span className="rounded-full bg-[#00FF88]/10 px-2 py-0.5 text-xs text-[#00FF88]">空闲</span>
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={() => setShowDeviceSelect(false)} className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 hover:text-white">取消</button>
            </div>
          </div>
        </div>
      )}

      {showCheckIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-[#00FF88]/30 bg-[#141B2D] p-6 shadow-[0_0_30px_rgba(0,255,136,0.15)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#00FF88]">预约签到</h3>
              <button onClick={() => { setShowCheckIn(false); setCheckInMemberId('') }} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>
            <p className="mb-4 text-sm text-gray-400">今日有预约的会员可一键签到入队</p>

            <div className="mb-4">
              <select
                value={checkInMemberId}
                onChange={(e) => setCheckInMemberId(e.target.value)}
                className="w-full rounded-lg border border-[#00FF88]/30 bg-[#0A0E1A] px-4 py-2.5 text-white outline-none focus:border-[#00FF88]"
              >
                <option value="">选择会员</option>
                {checkInCandidates.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            {checkInMemberId && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500">今日预约：</p>
                {getTodayReservations(checkInMemberId).map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg border border-[#00FF88]/20 bg-[#0A0E1A] px-3 py-2">
                    <div className="text-sm">
                      <span className="text-[#00F0FF]">{getDeviceName(r.deviceId)}</span>
                      <span className="ml-2 text-gray-400">{r.startTime}-{r.endTime}</span>
                    </div>
                    <button
                      onClick={() => handleCheckIn(checkInMemberId, r.id)}
                      className="flex items-center gap-1 rounded-lg bg-[#00FF88] px-3 py-1 text-xs font-medium text-black transition-all hover:shadow-[0_0_15px_rgba(0,255,136,0.4)]"
                    >
                      <LogIn size={12} />
                      签到入队
                    </button>
                  </div>
                ))}
              </div>
            )}

            {checkInCandidates.length === 0 && (
              <div className="py-6 text-center text-sm text-gray-600">今日暂有预约的会员</div>
            )}
          </div>
        </div>
      )}

      {currentServing && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-[#00FF88]/30 bg-[#141B2D] p-6 shadow-[0_0_30px_rgba(0,255,136,0.15)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#00FF88]">完成服务</h3>
              <button onClick={handleSkip} className="text-sm text-yellow-400 hover:text-yellow-300">跳号</button>
            </div>
            <div className="mb-4 text-center">
              <p className="font-mono text-3xl font-bold text-[#00F0FF]">{currentServing.ticketNumber}</p>
              <p className="mt-1 text-sm text-white">{getMemberName(currentServing.memberId)}</p>
              {currentServing.deviceId && (
                <p className="mt-1 text-xs text-gray-400">
                  设备：<span className="text-[#FF2D78]">{getDeviceName(currentServing.deviceId)}</span>
                </p>
              )}
            </div>
            <div className="space-y-2">
              <button
                onClick={() => handleComplete('idle')}
                className="w-full flex items-center gap-3 rounded-lg border border-[#00FF88]/30 bg-[#00FF88]/10 px-4 py-3 text-left transition-all hover:bg-[#00FF88]/20"
              >
                <CheckCircle size={20} className="text-[#00FF88]" />
                <div>
                  <span className="font-medium text-[#00FF88]">直接空闲</span>
                  <p className="text-xs text-gray-500">设备立即恢复为空闲状态</p>
                </div>
              </button>
              <button
                onClick={() => handleComplete('disinfecting')}
                className="w-full flex items-center gap-3 rounded-lg border border-purple-500/30 bg-purple-500/10 px-4 py-3 text-left transition-all hover:bg-purple-500/20"
              >
                <AlertTriangle size={20} className="text-purple-400" />
                <div>
                  <span className="font-medium text-purple-400">需要消毒</span>
                  <p className="text-xs text-gray-500">设备标记为消毒中，消毒登记后恢复</p>
                </div>
              </button>
            </div>
            <div className="mt-4 flex justify-center">
              <button
                onClick={recallCurrent}
                className="flex items-center gap-1.5 rounded-lg border border-[#00F0FF]/40 bg-[#00F0FF]/10 px-4 py-2 text-xs text-[#00F0FF] transition-all hover:bg-[#00F0FF]/20"
              >
                <RotateCcw size={14} />
                召回
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 border-t border-[#00F0FF]/20 bg-[#141B2D]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 p-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCallNext}
              disabled={sortedQueue.length === 0 || idleDevices.length === 0}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#00F0FF] to-[#FF2D78] px-5 py-2.5 text-sm font-bold text-black shadow-[0_0_20px_rgba(0,240,255,0.3)] transition-all hover:shadow-[0_0_30px_rgba(0,240,255,0.5)] disabled:opacity-40"
            >
              <Mic size={16} />
              叫下一位
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleInsert('vip')}
              className="flex items-center gap-1.5 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-400 transition-all hover:bg-yellow-500/20"
            >
              <Crown size={14} />
              VIP插队
            </button>
            <button
              onClick={() => handleInsert('emergency')}
              className="flex items-center gap-1.5 rounded-lg border border-[#FF2D78]/40 bg-[#FF2D78]/10 px-3 py-2 text-xs text-[#FF2D78] transition-all hover:bg-[#FF2D78]/20"
            >
              <AlertOctagon size={14} />
              应急插队
            </button>
          </div>
        </div>
      </div>

      {insertType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className={cn(
              'w-full max-w-md rounded-xl border bg-[#141B2D] p-6',
              insertType === 'vip'
                ? 'border-yellow-500/30 shadow-[0_0_30px_rgba(234,179,8,0.15)]'
                : 'border-[#FF2D78]/30 shadow-[0_0_30px_rgba(255,45,120,0.15)]'
            )}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className={cn('text-lg font-semibold', insertType === 'vip' ? 'text-yellow-400' : 'text-[#FF2D78]')}>
                {insertType === 'vip' ? 'VIP插队' : '应急插队'}
              </h3>
              <button onClick={() => setInsertType(null)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-400">选择会员</label>
                <select
                  value={insertMemberId}
                  onChange={(e) => setInsertMemberId(e.target.value)}
                  className="w-full rounded-lg border border-[#00F0FF]/30 bg-[#0A0E1A] px-4 py-2.5 text-white outline-none focus:border-[#00F0FF]"
                >
                  <option value="">请选择会员</option>
                  {members.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">{insertType === 'vip' ? 'VIP原因' : '应急原因'}</label>
                <input
                  type="text"
                  value={insertReason}
                  onChange={(e) => setInsertReason(e.target.value)}
                  placeholder={insertType === 'vip' ? '请填写VIP优先原因' : '请填写应急原因'}
                  className="w-full rounded-lg border border-[#00F0FF]/30 bg-[#0A0E1A] px-4 py-2.5 text-white outline-none focus:border-[#00F0FF]"
                />
              </div>
              <div className="text-xs text-gray-500">处理人：{getMemberName(currentAdminId)}</div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setInsertType(null)} className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 hover:text-white">取消</button>
              <button
                onClick={handleInsertConfirm}
                disabled={!insertMemberId || !insertReason}
                className={cn(
                  'rounded-lg px-6 py-2 text-sm font-medium text-black transition-all disabled:opacity-40',
                  insertType === 'vip'
                    ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 hover:shadow-[0_0_20px_rgba(234,179,8,0.4)]'
                    : 'bg-gradient-to-r from-[#FF2D78] to-[#FF6B9D] hover:shadow-[0_0_20px_rgba(255,45,120,0.4)]'
                )}
              >
                <UserPlus size={14} className="mr-1.5 inline" />
                确认插队
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
