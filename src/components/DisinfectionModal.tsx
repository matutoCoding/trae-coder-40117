import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDeviceStore } from '@/stores/deviceStore'
import type { DisinfectionMethod } from '@/types'
import { DISINFECTION_METHOD_LABELS } from '@/types'

interface DisinfectionModalProps {
  deviceId: string
  open: boolean
  onClose: () => void
  queueEntryId?: string
}

export default function DisinfectionModal({ deviceId, open, onClose, queueEntryId = '' }: DisinfectionModalProps) {
  const [method, setMethod] = useState<DisinfectionMethod>('UV')
  const [operator, setOperator] = useState('')
  const addDisinfectionRecord = useDeviceStore((s) => s.addDisinfectionRecord)

  if (!open) return null

  const handleSubmit = () => {
    if (!operator.trim()) return
    addDisinfectionRecord({
      deviceId,
      method,
      operator: operator.trim(),
      timestamp: new Date().toISOString(),
      nextDue: new Date(Date.now() + 3600000).toISOString(),
      queueEntryId,
    })
    setOperator('')
    setMethod('UV')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-xl border border-[#00F0FF]/30 bg-[#0a0e1a] p-6 shadow-[0_0_30px_rgba(0,240,255,0.15)]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#00F0FF]">消毒登记</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-gray-400">消毒方式</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as DisinfectionMethod)}
              className="w-full rounded-lg border border-[#00F0FF]/30 bg-[#0d1220] px-3 py-2 text-white outline-none focus:border-[#00F0FF]"
            >
              {Object.entries(DISINFECTION_METHOD_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-gray-400">操作人</label>
            <input
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              placeholder="输入操作人姓名"
              className="w-full rounded-lg border border-[#00F0FF]/30 bg-[#0d1220] px-3 py-2 text-white placeholder-gray-600 outline-none focus:border-[#00F0FF]"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-600 py-2 text-gray-400 transition hover:border-gray-400 hover:text-gray-300"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!operator.trim()}
            className={cn(
              'flex-1 rounded-lg py-2 font-medium transition',
              operator.trim()
                ? 'bg-[#00F0FF] text-black hover:bg-[#00F0FF]/80'
                : 'cursor-not-allowed bg-gray-700 text-gray-500'
            )}
          >
            确认登记
          </button>
        </div>
      </div>
    </div>
  )
}
