import type { CSSProperties } from 'react'

type ArrowDirection = 'up-right' | 'right' | 'left'

type ArrowIconProps = {
  size?: number
  strokeWidth?: number
  color?: string
  direction?: ArrowDirection
  style?: CSSProperties
}

const ROTATION_BY_DIRECTION: Record<ArrowDirection, number> = {
  'up-right': 0,
  right: 45,
  left: -135,
}

export default function ArrowIcon({
  size = 14,
  strokeWidth = 2,
  color = 'currentColor',
  direction = 'up-right',
  style,
}: ArrowIconProps) {
  const rotation = ROTATION_BY_DIRECTION[direction]
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      focusable="false"
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        transform: `rotate(${rotation}deg)`,
        transformOrigin: '50% 50%',
        ...style,
      }}
    >
      <path d="M3 13L13 3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="square" />
      <path d="M5 3H13V11" stroke={color} strokeWidth={strokeWidth} strokeLinecap="square" />
    </svg>
  )
}
