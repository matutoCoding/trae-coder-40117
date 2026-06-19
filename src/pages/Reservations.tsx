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
  CheckCircle2,
  Monitor,
} from 'lucide-react'

type TabType = 'rules' | 'reservations' | 'calendar'
type DateFilter = 'today' | 'week' | 'all'
type FormStep = 1 | 2 | 3 | 4

const STEP_LABELS = ['选择会员', '选择设备', '设置时段', '起止日期']

function isTimeValid(start: string, end: string): boolean {
  return start < end
}

function isDateValid(start: string, end: string): boolean {
  return start <= end
}

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
  const [timeError, setTimeError] = useState('')
  const [dateError, setDateError] = useState('')
  const [adjustError, setAdjustError] = useState('')
  const [calendarDate, setCalendarDate] = useState(new Date().toISOString().split('T')[0])
  const [calendarDeviceId, setCalendarDeviceId] = useState('')

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
    setTimeError('')
    setDateError('')
  }

  const canGoNext = (): boolean => {
    if (step === 1 && !formMemberId) return false
    if (step === 2 && !formDeviceId) return false
    if (step === 3) {
      if (!isTimeValid(formStartTime, formEndTime)) return false
    }
    if (step === 4 && !previewResult) {
      if (!formStartDate || !formEndDate) return false
      if (!isDateValid(formStartDate, formEndDate)) return false
    }
    return true
  }

  const handleNext = () => {
    if (step === 3) {
      if (!isTimeValid(formStartTime, formEndTime)) {
        setTimeError('结束时间必须晚于开始时间')
        return
      }
      setTimeError('')
    }
    if (step < 4) setStep((step + 1) as FormStep)
  }

  const handlePrev = () => {
    if (step > 1) {
      setStep((step - 1) as FormStep)
      setTimeError('')
      setDateError('')
    }
  }

  const handlePreview = () => {
    if (!isTimeValid(formStartTime, formEndTime)) {
      setTimeError('结束时间必须晚于开始时间')
      return
    }
    if (!isDateValid(formStartDate, formEndDate)) {
      setDateError('结束日期必须晚于或等于开始日期')
      return
    }
    setTimeError('')
    setDateError('')

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
  }

  const handleCloseForm = () => {
    setShowAddForm(false)
    resetForm()
  }

  const handleAdjust = (reservation: Reservation) => {
    setAdjustingReservation(reservation)
    setAdjustTime({ startTime: reservation.startTime, endTime: reservation.endTime })
    setAdjustDeviceId(reservation.deviceId)
    setAdjustError('')
  }

  const handleAdjustConfirm = () => {
    if (!adjustingReservation) return

    if (!isTimeValid(adjustTime.startTime, adjustTime.endTime)) {
      setAdjustError('结束时间必须晚于开始时间')
      return
    }

    const conflict = hasConflict(adjustDeviceId, adjustingReservation.date, adjustTime.startTime, adjustTime.endTime, adjustingReservation.id)
    updateReservation(adjustingReservation.id, {
      deviceId: adjustDeviceId,
      startTime: adjustTime.startTime,
      endTime: adjustTime.endTime,
      status: conflict ? 'conflict' : 'confirmed',
    })

    setAdjustingReservation(null)
    setAdjustError('')
  }

  const getMemberName = (id: string) => getMemberById(id)?.name ?? id
  const getDeviceName = (id: string) => devices.find((d) => d.id === id)?.name ?? id

  return (
    <div className="min-h-screen bg-[#0A0E1A] pb-24 pt-6">
      <div className="mx-auto max-w-5xl px-4">
        <h1 className="mb-6 text-xl font-bold">
          <span className="text-[#00F0FF]">周期</span>预约
        </h1>

        <div className="mb-8 flex gap-1 rounded-lg bg-[#141B2D] p-1">
          {(['rules', 'reservations', 'calendar'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition-all',
                activeTab === tab
                  ? 'bg-gradient-to-r from-[#00F0FF]/20 to-[#FF2D78]/20 text-[#00F0FF] shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                  : 'text-gray-500 hover:text-gray-300'
              )}
            >
              {tab === 'rules' ? '周期规则' : tab === 'reservations' ? '预约管理' : '日历排期'}
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
                  className={cn(
                    'rounded-lg border bg-[#141B2D] p-4 transition-all',
                    rule.active
                      ? 'border-[#00F0FF]/20 hover:border-[#00F0FF]/40'
                      : 'border-gray-800 opacity-60'
                  )}
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
                        <div key={i} className="flex items-center flex-1">
                          <div
                            className={cn(
                              'h-2 w-full rounded-full transition-all',
                              i < step
                                ? 'bg-gradient-to-r from-[#00F0FF] to-[#FF2D78]'
                                : 'bg-gray-700'
                            )}
                          />
                          {i < STEP_LABELS.length - 1 && (
                            <ChevronRight size={14} className="mx-1 shrink-0 text-gray-600" />
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
                            onChange={(e) => { setFormStartTime(e.target.value); setTimeError('') }}
                            className="w-full rounded-lg border border-[#00F0FF]/30 bg-[#0A0E1A] px-4 py-2.5 text-white outline-none focus:border-[#00F0FF]"
                          />
                        </div>
                        <div className="flex-1 space-y-2">
                          <label className="text-sm text-gray-400">结束时间</label>
                          <input
                            type="time"
                            value={formEndTime}
                            onChange={(e) => { setFormEndTime(e.target.value); setTimeError('') }}
                            className="w-full rounded-lg border border-[#00F0FF]/30 bg-[#0A0E1A] px-4 py-2.5 text-white outline-none focus:border-[#00F0FF]"
                          />
                        </div>
                      </div>
                      {timeError && (
                        <div className="flex items-center gap-1.5 rounded-lg bg-[#FF2D78]/10 px-3 py-2">
                          <AlertTriangle size={14} className="text-[#FF2D78]" />
                          <span className="text-xs text-[#FF2D78]">{timeError}</span>
                        </div>
                      )}
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
                            onChange={(e) => { setFormStartDate(e.target.value); setDateError('') }}
                            className="w-full rounded-lg border border-[#00F0FF]/30 bg-[#0A0E1A] px-4 py-2.5 text-white outline-none focus:border-[#00F0FF]"
                          />
                        </div>
                        <div className="flex-1 space-y-2">
                          <label className="text-sm text-gray-400">结束日期</label>
                          <input
                            type="date"
                            value={formEndDate}
                            onChange={(e) => { setFormEndDate(e.target.value); setDateError('') }}
                            className="w-full rounded-lg border border-[#00F0FF]/30 bg-[#0A0E1A] px-4 py-2.5 text-white outline-none focus:border-[#00F0FF]"
                          />
                        </div>
                      </div>
                      {dateError && (
                        <div className="flex items-center gap-1.5 rounded-lg bg-[#FF2D78]/10 px-3 py-2">
                          <AlertTriangle size={14} className="text-[#FF2D78]" />
                          <span className="text-xs text-[#FF2D78]">{dateError}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {step === 4 && previewResult && (
                    <div className="space-y-4">
                      <div className="rounded-lg border border-[#00F0FF]/20 bg-[#0A0E1A] p-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={18} className="text-[#00FF88]" />
                          <p className="text-sm text-gray-300">
                            已生成 <span className="text-lg font-bold text-[#00FF88]">{previewResult.generated.length}</span> 条预约
                          </p>
                        </div>
                        {previewResult.conflicts.length > 0 && (
                          <div className="mt-3">
                            <p className="flex items-center gap-1 text-sm text-[#FF2D78]">
                              <AlertTriangle size={14} />
                              {previewResult.conflicts.length} 条冲突
                            </p>
                            <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
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
                          disabled={!canGoNext()}
                          className="rounded-lg bg-gradient-to-r from-[#00F0FF] to-[#FF2D78] px-6 py-2 text-sm font-medium text-black transition-all hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] disabled:opacity-40"
                        >
                          下一步
                        </button>
                      )}
                      {step === 4 && !previewResult && (
                        <button
                          onClick={handlePreview}
                          disabled={!canGoNext()}
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
                      {(r.status === 'conflict' || r.status === 'confirmed') && (
                        <button
                          onClick={() => handleAdjust(r)}
                          className={cn(
                            'rounded-md border px-3 py-1 text-xs transition-all',
                            r.status === 'conflict'
                              ? 'border-[#FF2D78]/40 bg-[#FF2D78]/10 text-[#FF2D78] hover:bg-[#FF2D78]/20'
                              : 'border-[#00F0FF]/40 bg-[#00F0FF]/10 text-[#00F0FF] hover:bg-[#00F0FF]/20'
                          )}
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
                    <h3 className="text-lg font-semibold text-[#FF2D78]">调整预约</h3>
                    <button onClick={() => setAdjustingReservation(null)} className="text-gray-500 hover:text-white">
                      <X size={20} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm text-gray-400">更换设备</label>
                      <select
                        value={adjustDeviceId}
                        onChange={(e) => { setAdjustDeviceId(e.target.value); setAdjustError('') }}
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
                          onChange={(e) => { setAdjustTime({ ...adjustTime, startTime: e.target.value }); setAdjustError('') }}
                          className="w-full rounded-lg border border-[#00F0FF]/30 bg-[#0A0E1A] px-4 py-2.5 text-white outline-none focus:border-[#00F0FF]"
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <label className="text-sm text-gray-400">结束时间</label>
                        <input
                          type="time"
                          value={adjustTime.endTime}
                          onChange={(e) => { setAdjustTime({ ...adjustTime, endTime: e.target.value }); setAdjustError('') }}
                          className="w-full rounded-lg border border-[#00F0FF]/30 bg-[#0A0E1A] px-4 py-2.5 text-white outline-none focus:border-[#00F0FF]"
                        />
                      </div>
                    </div>
                    {adjustError && (
                      <div className="flex items-center gap-1.5 rounded-lg bg-[#FF2D78]/10 px-3 py-2">
                        <AlertTriangle size={14} className="text-[#FF2D78]" />
                        <span className="text-xs text-[#FF2D78]">{adjustError}</span>
                      </div>
                    )}
                    <div className="text-xs text-gray-500">
                      {hasConflict(adjustDeviceId, adjustingReservation.date, adjustTime.startTime, adjustTime.endTime, adjustingReservation.id) ? (
                        <span className="text-[#FF2D78]">调整后仍与其他预约冲突</span>
                      ) : (
                        <span className="text-[#00FF88]">当前时段可用，可正常预约</span>
                      )}
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
                      disabled={!isTimeValid(adjustTime.startTime, adjustTime.endTime)}
                      className="rounded-lg bg-gradient-to-r from-[#FF2D78] to-[#00F0FF] px-6 py-2 text-sm font-medium text-black transition-all hover:shadow-[0_0_20px_rgba(255,45,120,0.4)] disabled:opacity-40"
                    >
                      确认调整
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'calendar' && (
          <div>
            <div className="mb-4 flex items-center gap-3">
              <input
                type="date"
                value={calendarDate}
                onChange={(e) => setCalendarDate(e.target.value)}
                className="rounded-lg border border-[#00F0FF]/30 bg-[#0A0E1A] px-3 py-2 text-sm text-white outline-none focus:border-[#00F0FF]"
              />
              <select
                value={calendarDeviceId}
                onChange={(e) => setCalendarDeviceId(e.target.value)}
                className="rounded-lg border border-[#00F0FF]/30 bg-[#0A0E1A] px-3 py-2 text-sm text-white outline-none focus:border-[#00F0FF]"
              >
                <option value="">全部设备</option>
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-4">
              {(calendarDeviceId ? devices.filter((d) => d.id === calendarDeviceId) : devices).map((device) => {
                const deviceReservations = reservations.filter(
                  (r) => r.deviceId === device.id && r.date === calendarDate && r.status !== 'cancelled'
                )
                const timeSlots = []
                for (let h = 9; h <= 21; h++) {
                  timeSlots.push(`${String(h).padStart(2, '0')}:00`)
                }

                return (
                  <div key={device.id} className="rounded-xl border border-[#00F0FF]/10 bg-[#141B2D] p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Monitor size={16} className="text-[#00F0FF]" />
                      <span className="font-medium text-white">{device.name}</span>
                      <span className="text-xs text-gray-500">{device.specs}</span>
                    </div>
                    <div className="flex gap-0.5 overflow-x-auto pb-2">
                      {timeSlots.map((time) => {
                        const hour = parseInt(time.split(':')[0])
                        const slotEnd = `${String(hour + 1).padStart(2, '0')}:00`
                        const slotRes = deviceReservations.find(
                          (r) => r.startTime < slotEnd && r.endTime > time
                        )
                        const isConflict = slotRes?.status === 'conflict'
                        return (
                          <div key={time} className="flex min-w-[52px] flex-col items-center gap-1">
                            <span className="text-[10px] text-gray-600">{time}</span>
                            <div
                              className={cn(
                                'h-8 w-full rounded-sm transition-all',
                                isConflict
                                  ? 'bg-[#FF2D78]/50 shadow-[0_0_6px_rgba(255,45,120,0.3)]'
                                  : slotRes
                                  ? 'bg-gradient-to-b from-[#00F0FF]/40 to-[#FF2D78]/40'
                                  : 'bg-white/5'
                              )}
                            />
                            {slotRes && (
                              <span className={cn(
                                'max-w-[48px] truncate text-[9px]',
                                isConflict ? 'text-[#FF2D78]' : 'text-[#00F0FF]'
                              )}>
                                {getMemberName(slotRes.memberId)}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    {deviceReservations.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        {deviceReservations.map((r) => (
                          <div
                            key={r.id}
                            className={cn(
                              'flex items-center justify-between rounded-lg border px-3 py-2',
                              r.status === 'conflict'
                                ? 'border-[#FF2D78]/30 bg-[#FF2D78]/5'
                                : 'border-[#00F0FF]/20 bg-[#0A0E1A]'
                            )}
                          >
                            <div className="flex items-center gap-2 text-sm">
                              <span className={cn(
                                'rounded-full px-2 py-0.5 text-xs font-medium',
                                r.status === 'conflict'
                                  ? 'bg-[#FF2D78]/20 text-[#FF2D78]'
                                  : 'bg-[#00F0FF]/20 text-[#00F0FF]'
                              )}>
                                {r.startTime}-{r.endTime}
                              </span>
                              <span className="text-white">{getMemberName(r.memberId)}</span>
                            </div>
                            <span className={cn(
                              'text-xs',
                              r.status === 'conflict' ? 'text-[#FF2D78]' : 'text-gray-500'
                            )}>
                              {RESERVATION_STATUS_LABELS[r.status]}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {deviceReservations.length === 0 && (
                      <p className="mt-2 text-xs text-gray-600">当日无预约</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}