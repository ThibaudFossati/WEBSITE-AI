import type { ColorMode, DesignContent } from '../data/defaultSiteContent'

export function getSystemColorMode(): ColorMode {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'light'
}

export function resolveColorMode(design: Pick<DesignContent, 'colorModePreference' | 'colorMode'>): ColorMode {
  if (design.colorModePreference === 'system') return getSystemColorMode()
  return design.colorModePreference
}
