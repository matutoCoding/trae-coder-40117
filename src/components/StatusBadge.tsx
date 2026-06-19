import { cn } from '@/lib/utils'
import type { DeviceStatus } from '@/types'
import { DEVICE_STATUS_LABELS } from '@/types'

const STATUS_STYLES: Record<DeviceStatus, string> = {
  idle: 'bg-[#00F0FF]/20 text-[#00F0FF] border-[#00F0FF]/50',
  'in-use': 'bg-[#FF2D78]/20 text-[#FF2D78] border-[#FF2D78]/50',
  disinfecting: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
  maintenance: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
}

interface StatusBadgeProps {
  status: DeviceStatus
  className?: string
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        STATUS_STYLES[status],
        className
      )}
    >
      {DEVICE_STATUS_LABELS[status]}
    </span>
  )
}
