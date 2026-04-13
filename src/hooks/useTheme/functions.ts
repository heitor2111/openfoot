import { converter } from 'culori'

import type { OKLCH } from './types'

/** Limiar abaixo do qual a cor é considerada acromática */
const ACHROMATIC_THRESHOLD = 0.04

const toOklch = converter('oklch')

export const clamp = (v: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, v))
}

export const normalizeHue = (h: number) => {
  return (h + 360) % 360
}

export const hueDistance = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

export const averageHue = (a: number, b: number) => {
  const diff = ((b - a + 540) % 360) - 180
  return normalizeHue(a + diff / 2)
}

export const content = (bg: OKLCH): OKLCH => {
  return bg.l > 60 ? { l: 15, c: 0.02, h: bg.h } : { l: 95, c: 0, h: 0 }
}

export const toStr = ({ l, c, h }: OKLCH) => {
  return `oklch(${l}% ${c} ${h})`
}

export const isAchromatic = (oklch: OKLCH): boolean => {
  return oklch.c < ACHROMATIC_THRESHOLD
}

export const hexToOKLCH = (hex: string): OKLCH => {
  try {
    const c = toOklch(hex)

    if (!c) throw new Error()

    return {
      l: c.l * 100,
      c: c.c,
      h: c.h ?? 0,
    }
  } catch {
    // fallback neutro seguro
    return { l: 60, c: 0, h: 0 }
  }
}
