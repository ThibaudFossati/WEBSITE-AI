import { useEffect, useRef } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// ADAPTIVE CIRCLE CURSOR — Détecte la couleur de fond sous le curseur
// Blanc sur sombre, noir sur clair — via elementFromPoint + computed styles
// ─────────────────────────────────────────────────────────────────────────────

export default function Cursor() {
  const mainRef = useRef<HTMLDivElement>(null)
  const followerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const main = mainRef.current
    const follower = followerRef.current

    if (!main || !follower) return

    let mx = -50, my = -50
    let fx = -50, fy = -50
    let isDark = true  // true = blanc, false = noir
    let checkCounter = 0
    let currentState: 'default' | 'hover' | 'click' = 'default'

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
      mx = e.clientX
      my = e.clientY
    }

    const setState = (nextState: 'default' | 'hover' | 'click') => {
      if (currentState === nextState) return
      currentState = nextState
      main.dataset.state = nextState
      follower.dataset.state = nextState
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
    const inspectPoint = (x: number, y: number): { luminance: number; interactive: boolean } => {
      try {
        // Cacher temporairement le curseur pour ne pas l'inclure
        main.style.display = 'none'
        follower.style.display = 'none'

        const el = document.elementFromPoint(x, y)

        main.style.display = 'block'
        follower.style.display = 'block'

        if (!el) return { luminance: isDark ? 0.2 : 0.8, interactive: false }

        let current = el as HTMLElement | null
        const interactive = Boolean((el as HTMLElement).closest(interactiveSelector))

        // Remonte l'arbre DOM pour trouver une couleur de fond
        while (current) {
          const bgColor = window.getComputedStyle(current).backgroundColor

          if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
            const rgb = parseRGB(bgColor)
            if (rgb) {
              return { luminance: getLuminance(rgb), interactive }
            }
          }

          current = current.parentElement
        }

        return { luminance: isDark ? 0.2 : 0.8, interactive }
      } catch {
        return { luminance: isDark ? 0.2 : 0.8, interactive: false }
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
          main.style.background = 'rgba(255, 255, 255, 0.95)'
          main.style.boxShadow = '0 0 10px rgba(140, 210, 255, 0.9)'
          follower.style.borderColor = 'rgba(255, 255, 255, 0.7)'
        } else {
          // Fond clair → curseur noir
          main.style.background = 'rgba(20, 16, 14, 0.95)'
          main.style.boxShadow = '0 0 6px rgba(0, 0, 0, 0.2)'
          follower.style.borderColor = 'rgba(20, 16, 14, 0.6)'
        }
      }
    }

    const frame = () => {
      // Main circle — exact position
      main.style.left = `${mx}px`
      main.style.top = `${my}px`

      // Follower — lerp avec inertie douce
      fx += (mx - fx) * 0.12
      fy += (my - fy) * 0.12

      follower.style.left = `${fx}px`
      follower.style.top = `${fy}px`

      // Détecte couleur tous les 3 frames (perf)
      checkCounter++
      if (checkCounter > 2) {
        checkCounter = 0
        const { luminance, interactive } = inspectPoint(mx, my)
        updateCursorColor(luminance)
        if (currentState !== 'click') {
          setState(interactive ? 'hover' : 'default')
        }
      }

      requestAnimationFrame(frame)
    }

    const onDown = () => setState('click')
    const onUp = () => setState('default')
    const onWindowOut = (e: MouseEvent) => {
      if (e.relatedTarget) return
      mx = -50
      my = -50
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
          background: 'rgba(255, 255, 255, 0.95)',
          pointerEvents: 'none',
          zIndex: 10000,
          boxShadow: '0 0 10px rgba(140, 210, 255, 0.9)',
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
          border: '1.5px solid rgba(255, 255, 255, 0.7)',
          pointerEvents: 'none',
          zIndex: 9999,
          transition: 'border-color 0.15s ease',
        }}
      />
    </>
  )
}
