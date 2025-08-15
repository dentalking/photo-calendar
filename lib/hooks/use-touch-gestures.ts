import { useEffect, useRef, useState } from 'react'

interface TouchGestureOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  onTap?: () => void
  onDoubleTap?: () => void
  onPinch?: (scale: number) => void
  threshold?: number
  enabled?: boolean
}

export function useTouchGestures(
  elementRef: React.RefObject<HTMLElement>,
  options: TouchGestureOptions
) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onTap,
    onDoubleTap,
    onPinch,
    threshold = 50,
    enabled = true
  } = options

  const [isGesturing, setIsGesturing] = useState(false)
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const lastTapRef = useRef<number>(0)
  const pinchStartRef = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled || !elementRef.current) return

    const element = elementRef.current
    let touchStartX = 0
    let touchStartY = 0
    let touchStartTime = 0

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX
        touchStartY = e.touches[0].clientY
        touchStartTime = Date.now()
        touchStartRef.current = { x: touchStartX, y: touchStartY, time: touchStartTime }
        setIsGesturing(true)
      } else if (e.touches.length === 2 && onPinch) {
        // Handle pinch start
        const touch1 = e.touches[0]
        const touch2 = e.touches[1]
        const distance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        )
        pinchStartRef.current = distance
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchStartRef.current && onPinch) {
        // Handle pinch move
        const touch1 = e.touches[0]
        const touch2 = e.touches[1]
        const distance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        )
        const scale = distance / pinchStartRef.current
        onPinch(scale)
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return

      const touchEndX = e.changedTouches[0].clientX
      const touchEndY = e.changedTouches[0].clientY
      const touchEndTime = Date.now()

      const deltaX = touchEndX - touchStartRef.current.x
      const deltaY = touchEndY - touchStartRef.current.y
      const deltaTime = touchEndTime - touchStartRef.current.time

      const absX = Math.abs(deltaX)
      const absY = Math.abs(deltaY)

      // Check for tap or double tap
      if (absX < 10 && absY < 10 && deltaTime < 300) {
        const currentTime = Date.now()
        const timeSinceLastTap = currentTime - lastTapRef.current

        if (timeSinceLastTap < 300 && onDoubleTap) {
          onDoubleTap()
          lastTapRef.current = 0
        } else if (onTap) {
          onTap()
          lastTapRef.current = currentTime
        }
      }
      // Check for swipe
      else if (absX > threshold || absY > threshold) {
        if (absX > absY) {
          // Horizontal swipe
          if (deltaX > threshold && onSwipeRight) {
            onSwipeRight()
          } else if (deltaX < -threshold && onSwipeLeft) {
            onSwipeLeft()
          }
        } else {
          // Vertical swipe
          if (deltaY > threshold && onSwipeDown) {
            onSwipeDown()
          } else if (deltaY < -threshold && onSwipeUp) {
            onSwipeUp()
          }
        }
      }

      touchStartRef.current = null
      pinchStartRef.current = null
      setIsGesturing(false)
    }

    const handleTouchCancel = () => {
      touchStartRef.current = null
      pinchStartRef.current = null
      setIsGesturing(false)
    }

    // Add passive: false to prevent scrolling during gestures
    const options = { passive: false }
    
    element.addEventListener('touchstart', handleTouchStart, options)
    element.addEventListener('touchmove', handleTouchMove, options)
    element.addEventListener('touchend', handleTouchEnd, options)
    element.addEventListener('touchcancel', handleTouchCancel, options)

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
      element.removeEventListener('touchcancel', handleTouchCancel)
    }
  }, [enabled, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onTap, onDoubleTap, onPinch, threshold])

  return { isGesturing }
}