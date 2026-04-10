import type { InputHTMLAttributes, ReactNode } from 'react'
import { forwardRef } from 'react'

import { cn } from '@/utils/styles'

import type { InputBreakpoint, InputColor, InputSize, InputStyle } from './types'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
  /** Cor semântica do input (DaisyUI color modifier) */
  color?: InputColor
  /** Tamanho base do input */
  size?: InputSize
  /**
   * Tamanhos responsivos por breakpoint.
   * Ex: { sm: 'sm', lg: 'lg' } → aplica `sm:input-sm lg:input-lg`
   */
  responsiveSize?: Partial<Record<InputBreakpoint, InputSize>>
  /** Estilo visual do input */
  variant?: InputStyle
  /** Desabilita o input e aplica estilos de desabilitado */
  disabled?: boolean
  /** Ícone ou conteúdo exibido antes do campo de input */
  prefix?: ReactNode
  /** Ícone ou conteúdo exibido após o campo de input */
  suffix?: ReactNode
  /** Ativa o estilo de validação nativa do daisyUI (`validator`) */
  validator?: boolean
  /** Texto/conteúdo de dica exibido quando o input é inválido */
  validatorHint?: ReactNode
  /**
   * Se `true`, o hint fica oculto (`hidden`) e só aparece quando inválido.
   * Se `false`, o hint sempre ocupa espaço (comportamento padrão do daisyUI).
   * @default false
   */
  validatorHintHidden?: boolean
  /** Classes adicionais aplicadas ao wrapper `<label>` (quando prefix/suffix são usados) */
  wrapperClassName?: string
}

// Mapas explícitos garantem que o Tailwind v4 inclua todas as classes no bundle

const COLOR_MAP: Record<InputColor, string> = {
  neutral: 'input-neutral',
  primary: 'input-primary',
  secondary: 'input-secondary',
  accent: 'input-accent',
  info: 'input-info',
  success: 'input-success',
  warning: 'input-warning',
  error: 'input-error',
}

const SIZE_MAP: Record<InputSize, string> = {
  xs: 'input-xs',
  sm: 'input-sm',
  md: 'input-md',
  lg: 'input-lg',
  xl: 'input-xl',
}

const RESPONSIVE_SIZE_MAP: Record<InputBreakpoint, Record<InputSize, string>> = {
  sm: {
    xs: 'sm:input-xs',
    sm: 'sm:input-sm',
    md: 'sm:input-md',
    lg: 'sm:input-lg',
    xl: 'sm:input-xl',
  },
  md: {
    xs: 'md:input-xs',
    sm: 'md:input-sm',
    md: 'md:input-md',
    lg: 'md:input-lg',
    xl: 'md:input-xl',
  },
  lg: {
    xs: 'lg:input-xs',
    sm: 'lg:input-sm',
    md: 'lg:input-md',
    lg: 'lg:input-lg',
    xl: 'lg:input-xl',
  },
  xl: {
    xs: 'xl:input-xs',
    sm: 'xl:input-sm',
    md: 'xl:input-md',
    lg: 'xl:input-lg',
    xl: 'xl:input-xl',
  },
}

const STYLE_MAP: Record<InputStyle, string> = {
  ghost: 'input-ghost',
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      color,
      size,
      responsiveSize,
      variant,
      disabled = false,
      prefix,
      suffix,
      validator = false,
      validatorHint,
      validatorHintHidden = false,
      className,
      wrapperClassName,
      ...props
    },
    ref
  ) => {
    const responsiveClasses = responsiveSize
      ? (Object.entries(responsiveSize) as [InputBreakpoint, InputSize][])
          .map(([bp, s]) => RESPONSIVE_SIZE_MAP[bp][s])
          .join(' ')
      : ''

    const inputClasses = cn(
      'input',
      color && COLOR_MAP[color],
      size && SIZE_MAP[size],
      responsiveClasses,
      variant && STYLE_MAP[variant],
      validator && 'validator'
    )

    const hasWrapper = prefix || suffix

    // Quando há prefix/suffix, a classe `input` vai no <label> wrapper
    // e o <input> recebe `grow` para ocupar o espaço restante
    if (hasWrapper) {
      return (
        <>
          <label className={cn(inputClasses, wrapperClassName)}>
            {prefix}
            <input ref={ref} disabled={disabled} className={cn('grow', className)} {...props} />
            {suffix}
          </label>
          {validatorHint && (
            <p className={cn('validator-hint', validatorHintHidden && 'hidden')}>{validatorHint}</p>
          )}
        </>
      )
    }

    return (
      <>
        <input ref={ref} disabled={disabled} className={cn(inputClasses, className)} {...props} />
        {validatorHint && (
          <p className={cn('validator-hint', validatorHintHidden && 'hidden')}>{validatorHint}</p>
        )}
      </>
    )
  }
)

Input.displayName = 'Input'

export default Input
