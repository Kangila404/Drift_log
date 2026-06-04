import { useEffect, useState } from 'react'

export type Viewport = 'desktop' | 'tablet' | 'mobile'
export type Orientation = 'landscape' | 'portrait'

const getViewport = (w: number): Viewport => {
  if (w >= 1024) return 'desktop'
  if (w >= 768) return 'tablet'
  return 'mobile'
}

export function useViewport() {
  const [viewport, setViewport] = useState<Viewport>(() =>
    typeof window !== 'undefined' ? getViewport(window.innerWidth) : 'desktop'
  )
  const [orientation, setOrientation] = useState<Orientation>(() =>
    typeof window !== 'undefined' && window.innerWidth > window.innerHeight
      ? 'landscape' : 'portrait'
  )

  useEffect(() => {
    const update = () => {
      setViewport(getViewport(window.innerWidth))
      setOrientation(window.innerWidth > window.innerHeight ? 'landscape' : 'portrait')
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])


  const isMobile = viewport === 'mobile' || (viewport === 'tablet' && orientation === 'portrait')

  return { viewport, orientation, isMobile }
}