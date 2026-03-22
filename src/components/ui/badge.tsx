import { cn } from '@/lib/utils/cn'
import type { JobSource } from '@/types/database'

type BadgeVariant = 'default' | 'secondary' | 'outline' | 'source'
type BadgeSize = 'sm' | 'md'

interface BadgeProps {
  variant?: BadgeVariant
  size?: BadgeSize
  source?: JobSource
  className?: string
  children: React.ReactNode
}

const sourceStyles: Record<JobSource, string> = {
  wanted: 'bg-blue-100 text-blue-700 border-blue-200',
  jobkorea: 'bg-green-100 text-green-700 border-green-200',
  saramin: 'bg-orange-100 text-orange-700 border-orange-200',
  jobplanet: 'bg-purple-100 text-purple-700 border-purple-200',
}

const variantStyles: Record<Exclude<BadgeVariant, 'source'>, string> = {
  default: 'bg-slate-800 text-slate-100 border-slate-700',
  secondary: 'bg-slate-700 text-slate-200 border-slate-600',
  outline: 'bg-transparent text-slate-300 border-slate-500',
}

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2.5 py-0.5 text-xs',
}

export function Badge({
  variant = 'default',
  size = 'md',
  source,
  className,
  children,
}: BadgeProps) {
  const variantClass =
    variant === 'source' && source
      ? sourceStyles[source]
      : variantStyles[variant === 'source' ? 'default' : variant]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium leading-none whitespace-nowrap',
        variantClass,
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  )
}
