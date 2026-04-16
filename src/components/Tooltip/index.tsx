import type { HTMLAttributes, ReactNode } from 'react'
import { forwardRef } from 'react'

import { cn } from '@/utils/styles'

import type { TooltipColor, TooltipPlacement } from './types'

export interface TooltipProps extends HTMLAttributes<HTMLSpanElement> {
  /** Conteúdo do tooltip. String usa `data-tip`; ReactNode usa `tooltip-content` */
  tip?: ReactNode
  /** Posição do tooltip em relação ao elemento filho */
  placement?: TooltipPlacement
  /** Cor semântica do tooltip (daisyUI color modifier) */
  color?: TooltipColor
  /** Força o tooltip a ficar visível permanentemente */
  open?: boolean
}

// Mapas explícitos garantem que o Tailwind v4 inclua todas as classes no bundle

const PLACEMENT_MAP: Record<TooltipPlacement, string> = {
  top: 'tooltip-top',
  bottom: 'tooltip-bottom',
  left: 'tooltip-left',
  right: 'tooltip-right',
}

const COLOR_MAP: Record<TooltipColor, string> = {
  neutral: 'tooltip-neutral',
  primary: 'tooltip-primary',
  secondary: 'tooltip-secondary',
  accent: 'tooltip-accent',
  info: 'tooltip-info',
  success: 'tooltip-success',
  warning: 'tooltip-warning',
  error: 'tooltip-error',
}

const Tooltip = forwardRef<HTMLSpanElement, TooltipProps>(
  ({ tip, placement, color, open = false, className, children, ...props }, ref) => {
    const isSimpleText = typeof tip === 'string'

    return (
      <span
        ref={ref}
        data-tip={isSimpleText ? tip : undefined}
        className={cn(
          'tooltip',
          placement && PLACEMENT_MAP[placement],
          color && COLOR_MAP[color],
          open && 'tooltip-open',
          className
        )}
        {...props}
      >
        {!isSimpleText && tip && <div className='tooltip-content'>{tip}</div>}
        {children}
      </span>
    )
  }
)

Tooltip.displayName = 'Tooltip'

export default Tooltip
