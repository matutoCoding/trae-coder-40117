import { useState, useEffect } from 'react'
import type { QueuePriority, QueueEntry, Device } from '@/types'
import { QUEUE_PRIORITY_LABELS } from '@/types'
import { useQueueStore } from '@/stores/queueStore'
import { useMemberStore } from '@/stores/memberStore'
import { useDeviceStore } from '@/stores/deviceStore'
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
} from 'lucide-react'

type InsertType = 'vip' | 'emergency' | null

export default function Queue() {
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
  const [completeMode, setCompleteMode] = useState<'idle' | 'disinfecting' | null>(null)

  const {
    currentServing,
    takeNumber,
    callNext,
    skipCurrent,
    recallCurrent,
    completeCurrent,
    vipInsert,
    emergencyInsert,
    getSortedQueue,
  } = useQueueStore()

  const { members, getMemberById } = useMemberStore()
  const { devices, updateDeviceStatus } = useDeviceStore()

  const sortedQueue = getSortedQueue()
  const idleDevices = devices.filter((d) => d.status === 'idle')

  useEffect(() => {
    if (currentServing) {
      setFlashKey((k) => k + 1)
    }
  }, [currentServing])

  const getMemberName = (id: string) => getMemberById(id)?.name ?? id
  const getDeviceName = (id: string) => {
    if (!id) return ''
    return devices.find((d) => d.id === id)?.name ?? id
  }

  const handleTakeNumber = () => {
    if (!selectedMemberId) return
    if (showReason && !reason) return
    const entry = takeNumber(selectedMemberId, selectedPriority, reason)
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
    if (insertType === 'vip') {
      vipInsert(insertMemberId, insertReason)
    } else {
      emergencyInsert(insertMemberId, insertReason)
    }
    setInsertType(null)
    setInsertMemberId('')
    setInsertReason('')
  }

  const handleComplete = () => {
    setCompleteMode(null)
    if (!currentServing) return
    const deviceId = currentServing.deviceId
    const status = completeMode ?? 'idle'
    completeCurrent(status)
    if (deviceId) {
      updateDeviceStatus(deviceId, status)
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

  return (
    <div className="min-h-screen bg-[#0A0E1A] pb-32">
      <div className="mx-auto max-w-5xl p-6">
        <div className="mb-8 rounded-xl border border-[#00F0FF]/30 bg-[#141B2D] p-8 text-center shadow-[0_0_40px_rgba(0,240,255,0.1)]">
          {currentServing ? (
            <div key={flashKey}>
              <p className="mb-2 text-sm text-gray-500">当前叫号</p>
              <p className="animate-pulse font-mono text-6xl font-bold text-[#00F0FF] drop-shadow-[0_0_20px_rgba(0,240,255,0.6)]">
                {currentServing.ticketNumber}
              </p>
              <p className="mt-3 text-lg text-white">
                {getMemberName(currentServing.memberId)}
              </p>
              {currentServing.deviceId && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#FF2D78]/20 px-4 py-2">
                  <Monitor size={16} className="text-[#FF2D78]" />
                  <span className="text-sm font-medium text-[#FF2D78]">
                    {getDeviceName(currentServing.deviceId)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className="text-2xl font-medium text-gray-600">等待叫号</p>
              <p className="mt-2 text-sm text-gray-700">点击下方"叫下一位"开始服务</p>
            </div>
          )}
        </div>

        <div className="mb-4 flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Monitor size={14} className="text-[#00F0FF]" />
            <span>空闲设备 <span className="text-[#00F0FF] font-bold">{idleDevices.length}</span> 台</span>
          </div>
          {idleDevices.length === 0 && (
            <div className="flex items-center gap-1 text-xs text-[#FF2D78]">
              <AlertTriangle size={12} />
              <span>暂无空闲设备</span>
            </div>
          )}
        </div>

        <div className="mb-8 rounded-xl border border-[#00F0FF]/20 bg-[#141B2D] p-6">
          <h3 className="mb-4 text-sm font-semibold text-gray-400">取号</h3>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[180px] flex-1">
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full rounded-lg border border-[#00F0FF]/30 bg-[#0A0E1A] px-4 py-2.5 text-sm text-white outline-none focus:border-[#00F0FF]"
              >
                <option value="">选择会员</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-1 rounded-lg bg-[#0A0E1A] p-1">
              {(['normal', 'vip', 'emergency'] as QueuePriority[]).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePriorityChange(p)}
                  className={cn(
                    'rounded-md px-3 py-2 text-xs font-medium transition-all',
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
              className="rounded-lg bg-gradient-to-r from-[#00F0FF] to-[#FF2D78] px-6 py-2.5 text-sm font-medium text-black transition-all hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] disabled:opacity-40"
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
                className="w-full max-w-md rounded-lg border border-[#00F0FF]/30 bg-[#0A0E1A] px-4 py-2.5 text-sm text-white outline-none focus:border-[#00F0FF]"
              />
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-4 text-sm font-semibold text-gray-400">
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
              <div className="py-12 text-center text-gray-600">暂无排队</div>
            )}
          </div>
        </div>
      </div>

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
              <button onClick={() => setShowDeviceSelect(false)} className="text-gray-500 hover:text-white">
                <X size={20} />
              </button>
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
                  <span className="flex items-center gap-1 rounded-full bg-[#00FF88]/10 px-2 py-0.5 text-xs text-[#00FF88]">
                    空闲
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowDeviceSelect(false)}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 hover:text-white"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {completeMode !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-[#00FF88]/30 bg-[#141B2D] p-6 shadow-[0_0_30px_rgba(0,255,136,0.15)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#00FF88]">完成服务</h3>
              <button onClick={() => setCompleteMode(null)} className="text-gray-500 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <p className="mb-4 text-sm text-gray-400">
              {currentServing?.deviceId && (
                <>设备 <span className="text-white">{getDeviceName(currentServing.deviceId)}</span> 使用结束</>
              )}
            </p>
            <div className="space-y-2">
              <button
                onClick={() => { setCompleteMode('idle'); handleComplete(); }}
                className="w-full flex items-center gap-3 rounded-lg border border-[#00FF88]/30 bg-[#00FF88]/10 px-4 py-3 text-left transition-all hover:bg-[#00FF88]/20"
              >
                <CheckCircle size={20} className="text-[#00FF88]" />
                <div>
                  <span className="font-medium text-[#00FF88]">直接空闲</span>
                  <p className="text-xs text-gray-500">设备立即恢复为空闲状态</p>
                </div>
              </button>
              <button
                onClick={() => { setCompleteMode('disinfecting'); handleComplete(); }}
                className="w-full flex items-center gap-3 rounded-lg border border-purple-500/30 bg-purple-500/10 px-4 py-3 text-left transition-all hover:bg-purple-500/20"
              >
                <AlertTriangle size={20} className="text-purple-400" />
                <div>
                  <span className="font-medium text-purple-400">需要消毒</span>
                  <p className="text-xs text-gray-500">设备标记为消毒中，消毒后恢复</p>
                </div>
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
            <button
              onClick={handleSkip}
              disabled={!currentServing}
              className="flex items-center gap-1.5 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-400 transition-all hover:bg-yellow-500/20 disabled:opacity-40"
            >
              <SkipForward size={14} />
              跳号
            </button>
            <button
              onClick={() => recallCurrent()}
              disabled={!currentServing}
              className="flex items-center gap-1.5 rounded-lg border border-[#00F0FF]/40 bg-[#00F0FF]/10 px-3 py-2 text-xs text-[#00F0FF] transition-all hover:bg-[#00F0FF]/20 disabled:opacity-40"
            >
              <RotateCcw size={14} />
              召回
            </button>
            <button
              onClick={() => setCompleteMode('idle')}
              disabled={!currentServing}
              className="flex items-center gap-1.5 rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-xs text-green-400 transition-all hover:bg-green-500/20 disabled:opacity-40"
            >
              <CheckCircle size={14} />
              完成
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
              <h3
                className={cn(
                  'text-lg font-semibold',
                  insertType === 'vip' ? 'text-yellow-400' : 'text-[#FF2D78]'
                )}
              >
                {insertType === 'vip' ? 'VIP插队' : '应急插队'}
              </h3>
              <button onClick={() => setInsertType(null)} className="text-gray-500 hover:text-white">
                <X size={20} />
              </button>
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
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">
                  {insertType === 'vip' ? 'VIP原因' : '应急原因'}
                </label>
                <input
                  type="text"
                  value={insertReason}
                  onChange={(e) => setInsertReason(e.target.value)}
                  placeholder={insertType === 'vip' ? '请填写VIP优先原因' : '请填写应急原因'}
                  className="w-full rounded-lg border border-[#00F0FF]/30 bg-[#0A0E1A] px-4 py-2.5 text-white outline-none focus:border-[#00F0FF]"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setInsertType(null)}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 hover:text-white"
              >
                取消
              </button>
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
