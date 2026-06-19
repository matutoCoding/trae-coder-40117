import { cn } from '@/lib/utils'

interface NeonButtonProps {
  variant?: 'cyan' | 'magenta' | 'mint'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
}

const variantStyles = {
  cyan: 'border-cyan text-cyan hover:bg-cyan/10 hover:shadow-neon-cyan',
  magenta: 'border-magenta text-magenta hover:bg-magenta/10 hover:shadow-neon-magenta',
  mint: 'border-mint text-mint hover:bg-mint/10 hover:shadow-neon-mint',
}

const sizeStyles = {
  sm: 'px-3 py-1 text-sm',
  md: 'px-5 py-2 text-base',
  lg: 'px-7 py-3 text-lg',
}

export default function NeonButton({
  variant = 'cyan',
  size = 'md',
  children,
  onClick,
  disabled = false,
  className,
}: NeonButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'border rounded-lg font-orbitron transition-all duration-300',
        variantStyles[variant],
        sizeStyles[size],
        disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
        className
      )}
    >
      {children}
    </button>
  )
}
