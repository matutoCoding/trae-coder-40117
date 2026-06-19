import type { QueueEntry, QueuePriority } from '@/types'
import { QUEUE_PRIORITY_LABELS } from '@/types'
import { cn } from '@/lib/utils'
import { Clock, User } from 'lucide-react'
import { useMemberStore } from '@/stores/memberStore'

interface QueueEntryCardProps {
  entry: QueueEntry
  isCurrent: boolean
}

const PRIORITY_STYLES: Record<QueuePriority, { border: string; glow: string; badge: string }> = {
  normal: {
    border: 'border-[#00F0FF]/50',
    glow: 'shadow-[0_0_12px_rgba(0,240,255,0.3)]',
    badge: 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40',
  },
  vip: {
    border: 'border-yellow-500/50',
    glow: 'shadow-[0_0_16px_rgba(234,179,8,0.35)]',
    badge: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40',
  },
  emergency: {
    border: 'border-[#FF2D78]/50',
    glow: 'shadow-[0_0_16px_rgba(255,45,120,0.4)]',
    badge: 'bg-[#FF2D78]/20 text-[#FF2D78] border border-[#FF2D78]/40',
  },
}

export default function QueueEntryCard({ entry, isCurrent }: QueueEntryCardProps) {
  const style = PRIORITY_STYLES[entry.priority]
  const getMemberById = useMemberStore((s) => s.getMemberById)
  const memberName = getMemberById(entry.memberId)?.name ?? entry.memberId

  const time = new Date(entry.createdAt).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div
      className={cn(
        'rounded-lg border bg-[#141B2D] p-4 transition-all duration-300',
        style.border,
        isCurrent && style.glow,
        isCurrent && 'scale-[1.02]'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-mono text-2xl font-bold text-[#00F0FF]">
            {entry.ticketNumber}
          </span>
          <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', style.badge)}>
            {QUEUE_PRIORITY_LABELS[entry.priority]}
          </span>
        </div>
        {isCurrent && (
          <span className="animate-pulse rounded-full bg-[#00F0FF]/20 px-3 py-1 text-xs font-semibold text-[#00F0FF]">
            服务中
          </span>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between text-sm text-gray-400">
        <span className="flex items-center gap-1.5">
          <User size={14} />
          {memberName}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock size={14} />
          {time}
        </span>
      </div>
      {entry.reason && (
        <div className="mt-2 text-xs text-gray-500 truncate">
          原因：{entry.reason}
        </div>
      )}
    </div>
  )
}
