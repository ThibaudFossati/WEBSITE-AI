export type DisplayFontKey = 'bodoni' | 'gloock' | 'cormorant'
export type DisplayCaseMode = 'default' | 'uppercase' | 'lowercase'
export type DisplayEmphasisMode = 'none' | 'important-italic'

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
    preview: 'Curated Visuals',
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

export function getDisplayFontFamily(key: DisplayFontKey | undefined): string {
  return DISPLAY_FONT_OPTIONS.find(option => option.key === key)?.family ?? DISPLAY_FONT_OPTIONS[0].family
}
