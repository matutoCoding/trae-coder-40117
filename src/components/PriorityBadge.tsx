import type { QueuePriority } from '@/types'
import { QUEUE_PRIORITY_LABELS } from '@/types'
import { cn } from '@/lib/utils'

interface PriorityBadgeProps {
  priority: QueuePriority
}

const priorityStyles: Record<QueuePriority, string> = {
  normal: 'priority-normal',
  vip: 'priority-vip',
  emergency: 'priority-emergency',
}

export default function PriorityBadge({ priority }: PriorityBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium',
        priorityStyles[priority]
      )}
    >
      {QUEUE_PRIORITY_LABELS[priority]}
    </span>
  )
}
