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

    const onMove = (e: MouseEvent) => {
      mx = e.clientX
      my = e.clientY
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
    const detectBackgroundColor = (x: number, y: number): number => {
      try {
        // Cacher temporairement le curseur pour ne pas l'inclure
        main.style.display = 'none'
        follower.style.display = 'none'

        const el = document.elementFromPoint(x, y)

        main.style.display = 'block'
        follower.style.display = 'block'

        if (!el) return isDark ? 0.2 : 0.8

        let current = el as HTMLElement | null

        // Remonte l'arbre DOM pour trouver une couleur de fond
        while (current) {
          const bgColor = window.getComputedStyle(current).backgroundColor

          if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
            const rgb = parseRGB(bgColor)
            if (rgb) {
              return getLuminance(rgb)
            }
          }

          current = current.parentElement
        }

        return isDark ? 0.2 : 0.8
      } catch {
        return isDark ? 0.2 : 0.8
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
      main.style.left = `${mx - 4}px`
      main.style.top = `${my - 4}px`

      // Follower — lerp avec inertie douce
      fx += (mx - fx) * 0.12
      fy += (my - fy) * 0.12

      follower.style.left = `${fx - 15}px`
      follower.style.top = `${fy - 15}px`

      // Détecte couleur tous les 3 frames (perf)
      checkCounter++
      if (checkCounter > 2) {
        checkCounter = 0
        const lum = detectBackgroundColor(mx, my)
        updateCursorColor(lum)
      }

      requestAnimationFrame(frame)
    }

    window.addEventListener('mousemove', onMove)
    const raf = requestAnimationFrame(frame)

    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <>
      {/* Main circle — adaptatif (blanc ou noir) */}
      <div
        ref={mainRef}
        style={{
          position: 'fixed',
          width: '8px',
          height: '8px',
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
        style={{
          position: 'fixed',
          width: '30px',
          height: '30px',
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
