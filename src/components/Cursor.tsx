import { useEffect, useRef } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// ADAPTIVE CIRCLE CURSOR — Détecte la couleur de fond sous le curseur
// Blanc sur sombre, noir sur clair — via elementFromPoint + computed styles
// ─────────────────────────────────────────────────────────────────────────────

export default function Cursor() {
  const mainRef = useRef<HTMLDivElement>(null)
  const followerRef = useRef<HTMLDivElement>(null)
  const waveARef = useRef<HTMLDivElement>(null)
  const waveBRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (coarsePointer || reduceMotion) return

    const main = mainRef.current
    const follower = followerRef.current
    const waveA = waveARef.current
    const waveB = waveBRef.current

    if (!main || !follower || !waveA || !waveB) return

    let tx = -50, ty = -50
    let fx = -50, fy = -50
    let isDark = true  // true = blanc, false = noir
    let checkCounter = 0
    let currentState: 'default' | 'hover' | 'click' = 'default'
    let lastInteractive = false
    let pointerDown = false
    let lastHoverTimestamp = 0
    const hoverGraceMs = 80

    const interactiveSelector = [
      'a',
      'button',
      'input',
      'textarea',
      'select',
      '[role="button"]',
      '[data-cursor="hover"]',
      '.project-card',
    ].join(', ')

    const onMove = (e: MouseEvent) => {
      tx = e.clientX
      ty = e.clientY
    }

    const setState = (nextState: 'default' | 'hover' | 'click') => {
      if (currentState === nextState) return
      currentState = nextState
      main.dataset.state = nextState
      follower.dataset.state = nextState
      waveA.dataset.state = nextState
      waveB.dataset.state = nextState
    }

    // Parse couleur RGB string
    const parseRGB = (rgbStr: string): [number, number, number] | null => {
      const match = rgbStr.match(/\d+/g)
      if (match && match.length >= 3) {
        return [parseInt(match[0]), parseInt(match[1]), parseInt(match[2])]
      }
      return null
    }

    // Calcul luminance
    const getLuminance = (rgb: [number, number, number]): number => {
      const [r, g, b] = rgb
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255
    }

    // Détecte couleur sous le curseur via DOM
    const inspectPoint = (
      x: number,
      y: number
    ): { luminance: number; interactive: boolean; hidden: boolean; hideCustom: boolean } => {
      try {
        // Cacher temporairement le curseur pour ne pas l'inclure
        main.style.display = 'none'
        follower.style.display = 'none'

        const el = document.elementFromPoint(x, y)

        main.style.display = 'block'
        follower.style.display = 'block'

        if (!el) return { luminance: isDark ? 0.2 : 0.8, interactive: false, hidden: false, hideCustom: false }

        let current = el as HTMLElement | null
        const target = el as HTMLElement
        const cursorOverride = target.closest('[data-cursor]')?.getAttribute('data-cursor')
        const nativeCursor = window.getComputedStyle(target).cursor
        const hideCustom = (
          nativeCursor.includes('pointer') ||
          nativeCursor.includes('text') ||
          nativeCursor.includes('grab') ||
          nativeCursor.includes('move') ||
          nativeCursor.includes('resize')
        )
        const isDisabled = Boolean(target.closest('[disabled], [aria-disabled="true"], [data-disabled="true"]'))
        const baseInteractive = Boolean(target.closest(interactiveSelector))
        const forcedHover = cursorOverride === 'hover'
        const hidden = cursorOverride === 'hide'
        const quiet = cursorOverride === 'quiet'
        const interactive = !hidden && !quiet && !isDisabled && (baseInteractive || forcedHover)

        // Remonte l'arbre DOM pour trouver une couleur de fond
        while (current) {
          const bgColor = window.getComputedStyle(current).backgroundColor

          if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
            const rgb = parseRGB(bgColor)
            if (rgb) {
              return { luminance: getLuminance(rgb), interactive, hidden, hideCustom }
            }
          }

          current = current.parentElement
        }

        return { luminance: isDark ? 0.2 : 0.8, interactive, hidden, hideCustom }
      } catch {
        return { luminance: isDark ? 0.2 : 0.8, interactive: false, hidden: false, hideCustom: false }
      }
    }

    const updateCursorColor = (lum: number) => {
      // lum > 0.5 = fond CLAIR → curseur NOIR
      // lum < 0.5 = fond SOMBRE → curseur BLANC
      const bgIsLight = lum > 0.5

      if (bgIsLight === isDark) {  // isDark = "curseur est blanc"
        isDark = !bgIsLight

        if (!bgIsLight) {
          // Fond sombre → curseur blanc
          main.style.background = 'rgba(255, 255, 255, 0.94)'
          main.style.boxShadow = 'none'
          follower.style.borderColor = 'rgba(255, 255, 255, 0.62)'
          waveA.style.borderColor = 'rgba(190, 224, 255, 0.52)'
          waveB.style.borderColor = 'rgba(190, 224, 255, 0.44)'
        } else {
          // Fond clair → curseur noir
          main.style.background = 'rgba(10, 10, 10, 0.92)'
          main.style.boxShadow = 'none'
          follower.style.borderColor = 'rgba(10, 10, 10, 0.58)'
          waveA.style.borderColor = 'rgba(10, 10, 10, 0.25)'
          waveB.style.borderColor = 'rgba(10, 10, 10, 0.18)'
        }
      }
    }

    const frame = () => {
      // Dot = position exacte ; follower = inertie (décalage voulu)
      main.style.left = `${tx}px`
      main.style.top = `${ty}px`
      waveA.style.left = `${tx}px`
      waveA.style.top = `${ty}px`
      waveB.style.left = `${tx}px`
      waveB.style.top = `${ty}px`

      const vx = tx - fx
      const vy = ty - fy
      fx += vx * 0.12
      fy += vy * 0.12
      follower.style.left = `${fx}px`
      follower.style.top = `${fy}px`

      // Organique subtil: cercle parfait + respiration uniforme
      const speed = Math.hypot(vx, vy)
      const speedBoost = Math.min(speed / 460, 0.055)
      const breathe = 1 + Math.sin(performance.now() * 0.0032) * 0.012
      const uniformScale = breathe + speedBoost
      follower.style.transform = `translate(-50%, -50%) scale(${uniformScale})`

      // Détecte couleur tous les 3 frames (perf)
      checkCounter++
      if (checkCounter > 2) {
        checkCounter = 0
        const { luminance, interactive, hidden, hideCustom } = inspectPoint(tx, ty)
        updateCursorColor(luminance)

        const shouldHideCustom = hidden || hideCustom
        main.style.visibility = shouldHideCustom ? 'hidden' : 'visible'
        follower.style.visibility = shouldHideCustom ? 'hidden' : 'visible'
        waveA.style.visibility = shouldHideCustom ? 'hidden' : 'visible'
        waveB.style.visibility = shouldHideCustom ? 'hidden' : 'visible'

        const now = performance.now()
        if (interactive) lastHoverTimestamp = now
        const inHoverGrace = now - lastHoverTimestamp < hoverGraceMs
        const hoverActive = interactive || inHoverGrace
        lastInteractive = hoverActive

        if (pointerDown && hoverActive) {
          setState('click')
        } else {
          setState(hoverActive ? 'hover' : 'default')
        }
      }

      requestAnimationFrame(frame)
    }

    const onDown = () => {
      pointerDown = true
      if (lastInteractive) setState('click')
    }
    const onUp = () => {
      pointerDown = false
      setState(lastInteractive ? 'hover' : 'default')
    }
    const onWindowOut = (e: MouseEvent) => {
      if (e.relatedTarget) return
      tx = -50
      ty = -50
      fx = -50
      fy = -50
      pointerDown = false
      main.style.visibility = 'visible'
      follower.style.visibility = 'visible'
      waveA.style.visibility = 'visible'
      waveB.style.visibility = 'visible'
      follower.style.transform = 'translate(-50%, -50%)'
      setState('default')
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('mouseout', onWindowOut)
    const raf = requestAnimationFrame(frame)

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('mouseout', onWindowOut)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <>
      {/* Main circle — adaptatif (blanc ou noir) */}
      <div
        ref={mainRef}
        id="cursor"
        data-state="default"
        style={{
          position: 'fixed',
          width: '14px',
          height: '14px',
          borderRadius: '50%',
          background: 'rgba(10, 10, 10, 0.92)',
          pointerEvents: 'none',
          zIndex: 10000,
          boxShadow: 'none',
          transform: 'translate(-50%, -50%)',
          willChange: 'left, top, transform',
          transition: 'background 0.15s ease, box-shadow 0.15s ease',
        }}
      />

      {/* Follower — grand cercle qui suit (border adaptatif) */}
      <div
        ref={followerRef}
        id="cursor-follower"
        data-state="default"
        style={{
          position: 'fixed',
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          border: '1.5px solid rgba(10, 10, 10, 0.58)',
          pointerEvents: 'none',
          zIndex: 9999,
          transform: 'translate(-50%, -50%)',
          willChange: 'left, top, transform, border-color, width, height',
          transition: 'border-color 0.15s ease',
        }}
      />

      <div
        ref={waveARef}
        id="cursor-wave-a"
        data-state="default"
        style={{
          position: 'fixed',
          width: '26px',
          height: '26px',
          borderRadius: '50%',
          border: '1px solid rgba(10, 10, 10, 0.25)',
          pointerEvents: 'none',
          zIndex: 9998,
          opacity: 0,
          transform: 'translate(-50%, -50%) scale(0.5)',
          willChange: 'left, top, transform, opacity',
        }}
      />
      <div
        ref={waveBRef}
        id="cursor-wave-b"
        data-state="default"
        style={{
          position: 'fixed',
          width: '26px',
          height: '26px',
          borderRadius: '50%',
          border: '1px solid rgba(10, 10, 10, 0.18)',
          pointerEvents: 'none',
          zIndex: 9997,
          opacity: 0,
          transform: 'translate(-50%, -50%) scale(0.5)',
          willChange: 'left, top, transform, opacity',
        }}
      />
    </>
  )
}
