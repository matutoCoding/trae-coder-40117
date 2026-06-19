import { useState, useMemo } from 'react'
import type { CycleRule, Reservation } from '@/types'
import { DAY_OF_WEEK_LABELS, RESERVATION_STATUS_LABELS } from '@/types'
import { useReservationStore } from '@/stores/reservationStore'
import { useDeviceStore } from '@/stores/deviceStore'
import { useMemberStore } from '@/stores/memberStore'
import { cn } from '@/lib/utils'
import {
  CalendarPlus,
  ChevronRight,
  ChevronLeft,
  Clock,
  AlertTriangle,
  X,
  ToggleLeft,
  ToggleRight,
  Calendar,
  Filter,
} from 'lucide-react'

type TabType = 'rules' | 'reservations'
type DateFilter = 'today' | 'week' | 'all'
type FormStep = 1 | 2 | 3 | 4

const STEP_LABELS = ['选择会员', '选择设备', '设置时段', '起止日期']

export default function Reservations() {
  const [activeTab, setActiveTab] = useState<TabType>('rules')
  const [showAddForm, setShowAddForm] = useState(false)
  const [step, setStep] = useState<FormStep>(1)
  const [formMemberId, setFormMemberId] = useState('')
  const [formDeviceId, setFormDeviceId] = useState('')
  const [formDayOfWeek, setFormDayOfWeek] = useState<number>(1)
  const [formStartTime, setFormStartTime] = useState('09:00')
  const [formEndTime, setFormEndTime] = useState('10:00')
  const [formStartDate, setFormStartDate] = useState('')
  const [formEndDate, setFormEndDate] = useState('')
  const [previewResult, setPreviewResult] = useState<{
    generated: Reservation[]
    conflicts: Reservation[]
  } | null>(null)
  const [dateFilter, setDateFilter] = useState<DateFilter>('today')
  const [adjustingReservation, setAdjustingReservation] = useState<Reservation | null>(null)
  const [adjustTime, setAdjustTime] = useState({ startTime: '', endTime: '' })
  const [adjustDeviceId, setAdjustDeviceId] = useState('')

  const { cycleRules, reservations, addCycleRule, toggleCycleRule, cancelReservation, updateReservation, hasConflict } = useReservationStore()
  const { devices } = useDeviceStore()
  const { members, getMemberById } = useMemberStore()

  const today = new Date().toISOString().split('T')[0]

  const filteredReservations = useMemo(() => {
    const active = reservations.filter((r) => r.status !== 'cancelled')
    if (dateFilter === 'today') return active.filter((r) => r.date === today)
    if (dateFilter === 'week') {
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      return active.filter((r) => {
        const d = new Date(r.date)
        return d >= weekStart && d <= weekEnd
      })
    }
    return active
  }, [reservations, dateFilter, today])

  const resetForm = () => {
    setStep(1)
    setFormMemberId('')
    setFormDeviceId('')
    setFormDayOfWeek(1)
    setFormStartTime('09:00')
    setFormEndTime('10:00')
    setFormStartDate('')
    setFormEndDate('')
    setPreviewResult(null)
  }

  const handleNext = () => {
    if (step < 4) setStep((step + 1) as FormStep)
  }

  const handlePrev = () => {
    if (step > 1) setStep((step - 1) as FormStep)
  }

  const handlePreview = () => {
    const ruleData: Omit<CycleRule, 'id'> = {
      memberId: formMemberId,
      deviceId: formDeviceId,
      dayOfWeek: formDayOfWeek,
      startTime: formStartTime,
      endTime: formEndTime,
      startDate: formStartDate,
      endDate: formEndDate,
      active: true,
    }
    const result = addCycleRule(ruleData)
    setPreviewResult(result)
    setStep(4)
  }

  const handleCloseForm = () => {
    setShowAddForm(false)
    resetForm()
  }

  const handleAdjust = (reservation: Reservation) => {
    setAdjustingReservation(reservation)
    setAdjustTime({ startTime: reservation.startTime, endTime: reservation.endTime })
    setAdjustDeviceId(reservation.deviceId)
  }

  const handleAdjustConfirm = () => {
    if (!adjustingReservation) return
    const conflict = hasConflict(adjustDeviceId, adjustingReservation.date, adjustTime.startTime, adjustTime.endTime, adjustingReservation.id)
    updateReservation(adjustingReservation.id, {
      deviceId: adjustDeviceId,
      startTime: adjustTime.startTime,
      endTime: adjustTime.endTime,
      status: conflict ? 'conflict' : 'confirmed',
    })
    setAdjustingReservation(null)
  }

  const getMemberName = (id: string) => getMemberById(id)?.name ?? id
  const getDeviceName = (id: string) => devices.find((d) => d.id === id)?.name ?? id

  return (
    <div className="min-h-screen bg-[#0A0E1A] p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex gap-1 rounded-lg bg-[#141B2D] p-1">
          {(['rules', 'reservations'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex-1 rounded-md px-6 py-2.5 text-sm font-medium transition-all',
                activeTab === tab
                  ? 'bg-gradient-to-r from-[#00F0FF]/20 to-[#FF2D78]/20 text-[#00F0FF] shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                  : 'text-gray-500 hover:text-gray-300'
              )}
            >
              {tab === 'rules' ? '周期规则' : '预约管理'}
            </button>
          ))}
        </div>

        {activeTab === 'rules' && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">周期规则列表</h2>
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#00F0FF] to-[#FF2D78] px-4 py-2 text-sm font-medium text-black transition-all hover:shadow-[0_0_20px_rgba(0,240,255,0.4)]"
              >
                <CalendarPlus size={16} />
                添加规则
              </button>
            </div>

            <div className="space-y-3">
              {cycleRules.map((rule) => (
                <div
                  key={rule.id}
                  className="rounded-lg border border-[#00F0FF]/20 bg-[#141B2D] p-4 transition-all hover:border-[#00F0FF]/40"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="font-medium text-[#00F0FF]">{getMemberName(rule.memberId)}</span>
                      <span className="text-gray-500">·</span>
                      <span className="text-gray-300">{getDeviceName(rule.deviceId)}</span>
                      <span className="rounded bg-[#00F0FF]/10 px-2 py-0.5 text-xs text-[#00F0FF]">
                        {DAY_OF_WEEK_LABELS[rule.dayOfWeek]}
                      </span>
                      <span className="flex items-center gap-1 text-gray-400">
                        <Clock size={12} />
                        {rule.startTime}-{rule.endTime}
                      </span>
                      <span className="text-gray-500">
                        {rule.startDate} ~ {rule.endDate}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleCycleRule(rule.id)}
                      className="flex items-center"
                    >
                      {rule.active ? (
                        <ToggleRight size={28} className="text-[#00F0FF]" />
                      ) : (
                        <ToggleLeft size={28} className="text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
              {cycleRules.length === 0 && (
                <div className="py-12 text-center text-gray-600">暂无周期规则</div>
              )}
            </div>

            {showAddForm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="w-full max-w-lg rounded-xl border border-[#00F0FF]/30 bg-[#141B2D] p-6 shadow-[0_0_30px_rgba(0,240,255,0.15)]">
                  <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">添加周期规则</h3>
                    <button onClick={handleCloseForm} className="text-gray-500 hover:text-white">
                      <X size={20} />
                    </button>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-center gap-1">
                      {STEP_LABELS.map((label, i) => (
                        <div key={i} className="flex items-center">
                          <div
                            className={cn(
                              'h-2 flex-1 rounded-full transition-all',
                              i < step
                                ? 'bg-gradient-to-r from-[#00F0FF] to-[#FF2D78]'
                                : 'bg-gray-700'
                            )}
                            style={{ minWidth: 60 }}
                          />
                          {i < STEP_LABELS.length - 1 && (
                            <ChevronRight size={14} className="mx-1 text-gray-600" />
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-gray-500">
                      {STEP_LABELS.map((label, i) => (
                        <span key={i} className={cn(i < step ? 'text-[#00F0FF]' : '')}>
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {step === 1 && (
                    <div className="space-y-2">
                      <label className="text-sm text-gray-400">选择会员</label>
                      <select
                        value={formMemberId}
                        onChange={(e) => setFormMemberId(e.target.value)}
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
                  )}

                  {step === 2 && (
                    <div className="space-y-2">
                      <label className="text-sm text-gray-400">选择设备</label>
                      <select
                        value={formDeviceId}
                        onChange={(e) => setFormDeviceId(e.target.value)}
                        className="w-full rounded-lg border border-[#00F0FF]/30 bg-[#0A0E1A] px-4 py-2.5 text-white outline-none focus:border-[#00F0FF]"
                      >
                        <option value="">请选择设备</option>
                        {devices.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm text-gray-400">周几</label>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(DAY_OF_WEEK_LABELS).map(([val, label]) => (
                            <button
                              key={val}
                              onClick={() => setFormDayOfWeek(Number(val))}
                              className={cn(
                                'rounded-lg px-3 py-2 text-sm transition-all',
                                formDayOfWeek === Number(val)
                                  ? 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/50'
                                  : 'bg-[#0A0E1A] text-gray-400 border border-gray-700 hover:border-gray-500'
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex-1 space-y-2">
                          <label className="text-sm text-gray-400">开始时间</label>
                          <input
                            type="time"
                            value={formStartTime}
                            onChange={(e) => setFormStartTime(e.target.value)}
                            className="w-full rounded-lg border border-[#00F0FF]/30 bg-[#0A0E1A] px-4 py-2.5 text-white outline-none focus:border-[#00F0FF]"
                          />
                        </div>
                        <div className="flex-1 space-y-2">
                          <label className="text-sm text-gray-400">结束时间</label>
                          <input
                            type="time"
                            value={formEndTime}
                            onChange={(e) => setFormEndTime(e.target.value)}
                            className="w-full rounded-lg border border-[#00F0FF]/30 bg-[#0A0E1A] px-4 py-2.5 text-white outline-none focus:border-[#00F0FF]"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 4 && !previewResult && (
                    <div className="space-y-4">
                      <div className="flex gap-4">
                        <div className="flex-1 space-y-2">
                          <label className="text-sm text-gray-400">开始日期</label>
                          <input
                            type="date"
                            value={formStartDate}
                            onChange={(e) => setFormStartDate(e.target.value)}
                            className="w-full rounded-lg border border-[#00F0FF]/30 bg-[#0A0E1A] px-4 py-2.5 text-white outline-none focus:border-[#00F0FF]"
                          />
                        </div>
                        <div className="flex-1 space-y-2">
                          <label className="text-sm text-gray-400">结束日期</label>
                          <input
                            type="date"
                            value={formEndDate}
                            onChange={(e) => setFormEndDate(e.target.value)}
                            className="w-full rounded-lg border border-[#00F0FF]/30 bg-[#0A0E1A] px-4 py-2.5 text-white outline-none focus:border-[#00F0FF]"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 4 && previewResult && (
                    <div className="space-y-4">
                      <div className="rounded-lg border border-[#00F0FF]/20 bg-[#0A0E1A] p-4">
                        <p className="text-sm text-gray-400">
                          将生成 <span className="text-lg font-bold text-[#00F0FF]">{previewResult.generated.length}</span> 条预约
                        </p>
                        {previewResult.conflicts.length > 0 && (
                          <div className="mt-3">
                            <p className="flex items-center gap-1 text-sm text-[#FF2D78]">
                              <AlertTriangle size={14} />
                              {previewResult.conflicts.length} 条冲突
                            </p>
                            <div className="mt-2 space-y-1">
                              {previewResult.conflicts.map((c) => (
                                <div key={c.id} className="rounded border border-[#FF2D78]/30 bg-[#FF2D78]/5 px-3 py-1.5 text-xs text-[#FF2D78]">
                                  {c.date} {c.startTime}-{c.endTime} {getDeviceName(c.deviceId)}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-6 flex items-center justify-between">
                    <button
                      onClick={handlePrev}
                      disabled={step === 1}
                      className={cn(
                        'flex items-center gap-1 rounded-lg px-4 py-2 text-sm transition-all',
                        step === 1 ? 'text-gray-700' : 'text-gray-400 hover:text-white'
                      )}
                    >
                      <ChevronLeft size={16} />
                      上一步
                    </button>
                    <div className="flex gap-2">
                      {step < 4 && (
                        <button
                          onClick={handleNext}
                          disabled={
                            (step === 1 && !formMemberId) ||
                            (step === 2 && !formDeviceId)
                          }
                          className="rounded-lg bg-gradient-to-r from-[#00F0FF] to-[#FF2D78] px-6 py-2 text-sm font-medium text-black transition-all hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] disabled:opacity-40"
                        >
                          下一步
                        </button>
                      )}
                      {step === 4 && !previewResult && (
                        <button
                          onClick={handlePreview}
                          disabled={!formStartDate || !formEndDate}
                          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#00F0FF] to-[#FF2D78] px-6 py-2 text-sm font-medium text-black transition-all hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] disabled:opacity-40"
                        >
                          <Calendar size={14} />
                          预览生成
                        </button>
                      )}
                      {step === 4 && previewResult && (
                        <button
                          onClick={handleCloseForm}
                          className="rounded-lg bg-gradient-to-r from-[#00F0FF] to-[#FF2D78] px-6 py-2 text-sm font-medium text-black transition-all hover:shadow-[0_0_20px_rgba(0,240,255,0.4)]"
                        >
                          确认完成
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'reservations' && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">预约列表</h2>
              <div className="flex items-center gap-1 rounded-lg bg-[#141B2D] p-1">
                <Filter size={14} className="ml-2 text-gray-500" />
                {(['today', 'week', 'all'] as DateFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setDateFilter(f)}
                    className={cn(
                      'rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                      dateFilter === f
                        ? 'bg-[#00F0FF]/20 text-[#00F0FF]'
                        : 'text-gray-500 hover:text-gray-300'
                    )}
                  >
                    {f === 'today' ? '今天' : f === 'week' ? '本周' : '全部'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {filteredReservations.map((r) => (
                <div
                  key={r.id}
                  className={cn(
                    'rounded-lg border bg-[#141B2D] p-4 transition-all',
                    r.status === 'conflict'
                      ? 'border-[#FF2D78]/40 shadow-[0_0_8px_rgba(255,45,120,0.15)]'
                      : 'border-[#00F0FF]/20 hover:border-[#00F0FF]/40'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="font-medium text-white">{r.date}</span>
                      <span className="text-gray-500">·</span>
                      <span className="text-gray-300">{getDeviceName(r.deviceId)}</span>
                      <span className="text-[#00F0FF]">{getMemberName(r.memberId)}</span>
                      <span className="flex items-center gap-1 text-gray-400">
                        <Clock size={12} />
                        {r.startTime}-{r.endTime}
                      </span>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-medium',
                          r.status === 'conflict'
                            ? 'bg-[#FF2D78]/20 text-[#FF2D78]'
                            : r.status === 'confirmed'
                            ? 'bg-[#00F0FF]/20 text-[#00F0FF]'
                            : r.status === 'completed'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-500/20 text-gray-400'
                        )}
                      >
                        {RESERVATION_STATUS_LABELS[r.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.status === 'conflict' && (
                        <button
                          onClick={() => handleAdjust(r)}
                          className="rounded-md border border-[#FF2D78]/40 bg-[#FF2D78]/10 px-3 py-1 text-xs text-[#FF2D78] transition-all hover:bg-[#FF2D78]/20"
                        >
                          调整
                        </button>
                      )}
                      {r.status !== 'cancelled' && r.status !== 'completed' && (
                        <button
                          onClick={() => cancelReservation(r.id)}
                          className="rounded-md border border-gray-700 bg-[#0A0E1A] px-3 py-1 text-xs text-gray-400 transition-all hover:border-gray-500 hover:text-white"
                        >
                          取消
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {filteredReservations.length === 0 && (
                <div className="py-12 text-center text-gray-600">暂无预约记录</div>
              )}
            </div>

            {adjustingReservation && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="w-full max-w-md rounded-xl border border-[#FF2D78]/30 bg-[#141B2D] p-6 shadow-[0_0_30px_rgba(255,45,120,0.15)]">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-[#FF2D78]">调整冲突预约</h3>
                    <button onClick={() => setAdjustingReservation(null)} className="text-gray-500 hover:text-white">
                      <X size={20} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm text-gray-400">更换设备</label>
                      <select
                        value={adjustDeviceId}
                        onChange={(e) => setAdjustDeviceId(e.target.value)}
                        className="w-full rounded-lg border border-[#00F0FF]/30 bg-[#0A0E1A] px-4 py-2.5 text-white outline-none focus:border-[#00F0FF]"
                      >
                        {devices.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-1 space-y-2">
                        <label className="text-sm text-gray-400">开始时间</label>
                        <input
                          type="time"
                          value={adjustTime.startTime}
                          onChange={(e) => setAdjustTime({ ...adjustTime, startTime: e.target.value })}
                          className="w-full rounded-lg border border-[#00F0FF]/30 bg-[#0A0E1A] px-4 py-2.5 text-white outline-none focus:border-[#00F0FF]"
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <label className="text-sm text-gray-400">结束时间</label>
                        <input
                          type="time"
                          value={adjustTime.endTime}
                          onChange={(e) => setAdjustTime({ ...adjustTime, endTime: e.target.value })}
                          className="w-full rounded-lg border border-[#00F0FF]/30 bg-[#0A0E1A] px-4 py-2.5 text-white outline-none focus:border-[#00F0FF]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-2">
                    <button
                      onClick={() => setAdjustingReservation(null)}
                      className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 hover:text-white"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleAdjustConfirm}
                      className="rounded-lg bg-gradient-to-r from-[#FF2D78] to-[#00F0FF] px-6 py-2 text-sm font-medium text-black transition-all hover:shadow-[0_0_20px_rgba(255,45,120,0.4)]"
                    >
                      确认调整
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
