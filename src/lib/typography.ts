export type DisplayFontKey = 'bodoni' | 'gloock' | 'cormorant' | 'roboto'
export type DisplayCaseMode = 'default' | 'uppercase' | 'lowercase'
export type DisplayEmphasisMode = 'none' | 'important-italic'
export type DisplayWeight = 100 | 300 | 400 | 500 | 700 | 900

export const DISPLAY_SIZE_MIN = 70
export const DISPLAY_SIZE_MAX = 140
export const DISPLAY_SIZE_DEFAULT = 100

export const DISPLAY_LETTER_SPACING_MIN = -0.08
export const DISPLAY_LETTER_SPACING_MAX = 0.12
export const DISPLAY_LETTER_SPACING_DEFAULT = -0.03

export const DISPLAY_LINE_HEIGHT_MIN = 0.8
export const DISPLAY_LINE_HEIGHT_MAX = 1.3
export const DISPLAY_LINE_HEIGHT_DEFAULT = 0.9

export const DISPLAY_WORD_SPACING_MIN = -0.08
export const DISPLAY_WORD_SPACING_MAX = 0.4
export const DISPLAY_WORD_SPACING_DEFAULT = 0

export const DISPLAY_FONT_OPTIONS: Array<{
  key: DisplayFontKey
  label: string
  family: string
  preview: string
}> = [
  {
    key: 'bodoni',
    label: 'Bodoni Moda (actuelle)',
    family: '"Bodoni Moda", Georgia, serif',
    preview: 'Art Direction',
  },
  {
    key: 'gloock',
    label: 'Gloock',
    family: '"Gloock", Georgia, serif',
    preview: 'GLOOCK',
  },
  {
    key: 'cormorant',
    label: 'Cormorant Garamond',
    family: '"Cormorant Garamond", Georgia, serif',
    preview: 'Visuels raffinés',
  },
  {
    key: 'roboto',
    label: 'Roboto',
    family: '"Roboto", "Helvetica Neue", Arial, sans-serif',
    preview: 'Studio digital',
  },
]

export const DISPLAY_CASE_OPTIONS: Array<{
  key: DisplayCaseMode
  label: string
}> = [
  { key: 'default', label: 'Normal' },
  { key: 'uppercase', label: 'Majuscule' },
  { key: 'lowercase', label: 'Minuscule' },
]

export const DISPLAY_EMPHASIS_OPTIONS: Array<{
  key: DisplayEmphasisMode
  label: string
}> = [
  { key: 'none', label: 'Aucune emphase' },
  { key: 'important-italic', label: 'Mot important en italic' },
]

export const DISPLAY_WEIGHT_OPTIONS: Array<{
  key: DisplayWeight
  label: string
}> = [
  { key: 100, label: 'Thin (100)' },
  { key: 300, label: 'Light (300)' },
  { key: 400, label: 'Regular (400)' },
  { key: 500, label: 'Medium (500)' },
  { key: 700, label: 'Bold (700)' },
  { key: 900, label: 'Black (900)' },
]

export function getDisplayFontFamily(key: DisplayFontKey | undefined): string {
  return DISPLAY_FONT_OPTIONS.find(option => option.key === key)?.family ?? DISPLAY_FONT_OPTIONS[0].family
}

export function getDisplayFontWeight(key: DisplayFontKey | undefined, weight: DisplayWeight | undefined): number {
  if (weight === 100 || weight === 300 || weight === 400 || weight === 500 || weight === 700 || weight === 900) {
    return weight
  }
  if (key === 'roboto') return 400
  return 400
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function getDisplaySizeScale(value: number | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return DISPLAY_SIZE_DEFAULT / 100
  return clamp(value, DISPLAY_SIZE_MIN, DISPLAY_SIZE_MAX) / 100
}

export function getDisplayLetterSpacing(value: number | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return DISPLAY_LETTER_SPACING_DEFAULT
  return clamp(value, DISPLAY_LETTER_SPACING_MIN, DISPLAY_LETTER_SPACING_MAX)
}

export function getDisplayLineHeight(value: number | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return DISPLAY_LINE_HEIGHT_DEFAULT
  return clamp(value, DISPLAY_LINE_HEIGHT_MIN, DISPLAY_LINE_HEIGHT_MAX)
}

export function getDisplayWordSpacing(value: number | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return DISPLAY_WORD_SPACING_DEFAULT
  return clamp(value, DISPLAY_WORD_SPACING_MIN, DISPLAY_WORD_SPACING_MAX)
}
