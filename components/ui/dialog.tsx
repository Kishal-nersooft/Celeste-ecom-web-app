"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:duration-300 data-[state=closed]:duration-300",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const MOBILE_SHEET_MQ = "(max-width: 1023px)"
const SWIPE_CLOSE_DISTANCE = 80
const SWIPE_CLOSE_MS = 240
const DEFAULT_SHEET_MIN_RATIO = 0.65
const DEFAULT_SHEET_MAX_RATIO = 0.9

function isMobileSheetViewport() {
  return typeof window !== "undefined" && window.matchMedia(MOBILE_SHEET_MQ).matches
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function useIsMobileSheet() {
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const media = window.matchMedia(MOBILE_SHEET_MQ)
    const update = () => setIsMobile(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  return isMobile
}

function useVisibleViewport(enabled: boolean) {
  const [viewport, setViewport] = React.useState({ height: 0, keyboardInset: 0 })

  React.useEffect(() => {
    if (!enabled) {
      setViewport({ height: 0, keyboardInset: 0 })
      return
    }

    const update = () => {
      const visual = window.visualViewport
      const height = visual?.height ?? window.innerHeight
      const inset = Math.max(
        0,
        window.innerHeight - (visual ? visual.height + visual.offsetTop : window.innerHeight)
      )
      setViewport({ height, keyboardInset: inset })
    }

    update()
    window.visualViewport?.addEventListener("resize", update)
    window.visualViewport?.addEventListener("scroll", update)
    window.addEventListener("resize", update)
    return () => {
      window.visualViewport?.removeEventListener("resize", update)
      window.visualViewport?.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
    }
  }, [enabled])

  return viewport
}

type DialogContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  hideCloseButton?: boolean
  mobileAsSheet?: boolean
  sheetDismissible?: boolean
  sheetCompact?: boolean
  sheetAutoHeight?: boolean
  sheetResizable?: boolean
  sheetExpanded?: boolean
  sheetMinRatio?: number
  sheetMaxRatio?: number
  sheetSizeKey?: string | number
  onDismiss?: () => void
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({
  className,
  children,
  hideCloseButton = false,
  mobileAsSheet = false,
  sheetDismissible = true,
  sheetCompact = false,
  sheetAutoHeight = false,
  sheetResizable = false,
  sheetExpanded = false,
  sheetMinRatio = DEFAULT_SHEET_MIN_RATIO,
  sheetMaxRatio = DEFAULT_SHEET_MAX_RATIO,
  sheetSizeKey,
  onDismiss,
  style,
  ...props
}, ref) => {
  const isMobile = useIsMobileSheet()
  const useFittedSheet = Boolean(
    mobileAsSheet && isMobile && !sheetCompact && (sheetAutoHeight || sheetResizable)
  )
  const { height: visibleHeight, keyboardInset } = useVisibleViewport(useFittedSheet)

  const contentRef = React.useRef<HTMLDivElement | null>(null)
  const handleRef = React.useRef<HTMLDivElement | null>(null)
  const measureRef = React.useRef<HTMLDivElement | null>(null)
  const [contentHeight, setContentHeight] = React.useState(0)
  const [chromeHeight, setChromeHeight] = React.useState(36)
  const [userHeightPx, setUserHeightPx] = React.useState<number | null>(null)
  const [dragY, setDragY] = React.useState(0)
  const [dragging, setDragging] = React.useState(false)
  const startYRef = React.useRef<number | null>(null)
  const startHeightRef = React.useRef(0)
  const dragYRef = React.useRef(0)
  const heightRef = React.useRef(0)
  const closeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const [swipeClosing, setSwipeClosing] = React.useState(false)

  const setContentNode = React.useCallback(
    (node: HTMLDivElement | null) => {
      contentRef.current = node
      if (typeof ref === "function") {
        ref(node)
      } else if (ref) {
        ref.current = node
      }
    },
    [ref]
  )

  const minPx = visibleHeight > 0 ? visibleHeight * sheetMinRatio : 0
  const maxPx = visibleHeight > 0 ? visibleHeight * sheetMaxRatio : 0

  React.useLayoutEffect(() => {
    if (!useFittedSheet) return
    const sheet = contentRef.current
    const handle = handleRef.current
    if (!sheet) return
    const styles = window.getComputedStyle(sheet)
    const padding =
      (parseFloat(styles.paddingTop) || 0) + (parseFloat(styles.paddingBottom) || 0)
    const gap = parseFloat(styles.rowGap || styles.gap) || 0
    setChromeHeight(padding + gap + (handle?.offsetHeight ?? 0))
  }, [useFittedSheet, contentHeight, visibleHeight, keyboardInset])

  const autoHeightPx = maxPx > 0
    ? clamp(contentHeight + chromeHeight, minPx, maxPx)
    : 0
  const fittedHeightPx = maxPx > 0
    ? clamp(userHeightPx ?? (sheetExpanded ? maxPx : autoHeightPx), minPx, maxPx)
    : 0

  heightRef.current = fittedHeightPx

  React.useLayoutEffect(() => {
    if (!useFittedSheet) return
    const el = measureRef.current
    if (!el) return

    const update = () => setContentHeight(el.scrollHeight)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [useFittedSheet, children, sheetSizeKey, sheetExpanded])

  React.useEffect(() => {
    setUserHeightPx(null)
    setDragY(0)
    setDragging(false)
    setSwipeClosing(false)
  }, [sheetSizeKey, sheetCompact])

  React.useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  const wasExpandedRef = React.useRef(false)
  React.useEffect(() => {
    if (sheetExpanded && !wasExpandedRef.current) {
      setUserHeightPx(null)
    }
    wasExpandedRef.current = sheetExpanded
  }, [sheetExpanded])

  const beginSwipe = (clientY: number) => {
    if (!mobileAsSheet || !isMobileSheetViewport()) return false
    if (swipeClosing) return false
    if (!sheetDismissible && !sheetResizable) return false
    startYRef.current = clientY
    startHeightRef.current = heightRef.current
    dragYRef.current = 0
    setDragging(true)
    return true
  }

  const moveSwipe = (clientY: number) => {
    if (startYRef.current == null || swipeClosing) return

    const canResize = sheetResizable && useFittedSheet && maxPx > 0 && !sheetCompact
    if (canResize) {
      const delta = clientY - startYRef.current
      const nextHeight = startHeightRef.current - delta
      if (nextHeight < minPx) {
        setUserHeightPx(minPx)
        const extra = minPx - nextHeight
        dragYRef.current = extra
        setDragY(extra)
        return
      }
      dragYRef.current = 0
      setDragY(0)
      setUserHeightPx(clamp(nextHeight, minPx, maxPx))
      return
    }

    const delta = Math.max(0, clientY - startYRef.current)
    dragYRef.current = delta
    setDragY(delta)
  }

  const endSwipe = () => {
    if (startYRef.current == null || swipeClosing) return
    const delta = dragYRef.current
    const shouldClose = sheetDismissible && delta > SWIPE_CLOSE_DISTANCE
    startYRef.current = null
    setDragging(false)

    if (shouldClose) {
      const sheetHeight = contentRef.current?.getBoundingClientRect().height ?? minPx ?? 400
      const offScreenY = sheetHeight + 32
      setSwipeClosing(true)
      dragYRef.current = offScreenY
      requestAnimationFrame(() => setDragY(offScreenY))
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      closeTimerRef.current = setTimeout(() => {
        onDismiss?.()
      }, SWIPE_CLOSE_MS)
      return
    }

    dragYRef.current = 0
    setDragY(0)
    if (sheetResizable && useFittedSheet && maxPx > 0) {
      setUserHeightPx((current) => clamp(current ?? heightRef.current, minPx, maxPx))
    }
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!beginSwipe(event.clientY)) return
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Untrusted or unsupported pointer capture should not block resize.
    }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    moveSwipe(event.clientY)
  }

  const handlePointerUp = () => {
    endSwipe()
  }

  const sheetTransition = dragging
    ? "none"
    : swipeClosing
      ? `transform ${SWIPE_CLOSE_MS}ms ease-in`
      : "transform 200ms ease-out, height 200ms ease-out, bottom 200ms ease-out"

  const fittedStyle = useFittedSheet && fittedHeightPx > 0
    ? {
        height: fittedHeightPx,
        minHeight: minPx,
        maxHeight: maxPx,
        bottom: keyboardInset,
        transition: sheetTransition,
      }
    : undefined

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={setContentNode}
        className={cn(
          mobileAsSheet
            ? [
                "fixed z-50 grid w-full gap-4 border bg-background p-6 shadow-lg",
                "duration-300 ease-out data-[state=open]:animate-in data-[state=closed]:animate-out",
                "data-[state=open]:duration-300 data-[state=closed]:duration-300",
                "lg:data-[state=closed]:fade-out-0 lg:data-[state=open]:fade-in-0",
                "max-lg:inset-x-0 max-lg:bottom-0 max-lg:top-auto max-lg:left-0",
                "max-lg:flex max-lg:flex-col max-lg:gap-2",
                "max-lg:w-full max-lg:max-w-none max-lg:translate-x-0 max-lg:translate-y-0",
                "max-lg:rounded-t-2xl max-lg:rounded-b-none max-lg:border-x-0 max-lg:border-b-0",
                sheetCompact
                  ? "max-lg:h-auto max-lg:min-h-0 max-lg:max-h-none"
                  : sheetAutoHeight || sheetResizable
                    ? "max-lg:h-auto max-lg:min-h-[65dvh] max-lg:max-h-[90dvh]"
                    : "max-lg:h-[55vh] max-lg:min-h-[45vh] max-lg:max-h-[65vh]",
                "max-lg:p-4 max-lg:pt-2 max-lg:pb-[max(1rem,env(safe-area-inset-bottom))]",
                "max-lg:overflow-hidden",
                "max-lg:data-[state=open]:slide-in-from-bottom",
                swipeClosing
                  ? "max-lg:!animate-none max-lg:data-[state=closed]:!animate-none max-lg:data-[state=closed]:duration-0"
                  : "max-lg:data-[state=closed]:slide-out-to-bottom",
                "max-lg:data-[state=open]:zoom-in-100 max-lg:data-[state=closed]:zoom-out-100",
                "lg:left-[50%] lg:top-[50%] lg:translate-x-[-50%] lg:translate-y-[-50%]",
                "lg:max-w-lg lg:rounded-lg",
                "lg:data-[state=closed]:zoom-out-95 lg:data-[state=open]:zoom-in-95",
                "lg:data-[state=closed]:slide-out-to-left-1/2 lg:data-[state=closed]:slide-out-to-top-[48%]",
                "lg:data-[state=open]:slide-in-from-left-1/2 lg:data-[state=open]:slide-in-from-top-[48%]",
              ]
            : "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
          className
        )}
        style={{
          ...style,
          ...fittedStyle,
          ...(mobileAsSheet && (dragY > 0 || swipeClosing)
            ? {
                transform: `translateY(${dragY}px)`,
                transition: dragging ? "none" : sheetTransition,
              }
            : !fittedStyle && mobileAsSheet && !dragging
              ? { transition: sheetTransition }
              : undefined),
        }}
        {...props}
      >
        {mobileAsSheet && (
          <div
            ref={handleRef}
            className="hidden max-lg:flex w-full cursor-grab touch-none items-center justify-center py-2 active:cursor-grabbing"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <div className="h-1.5 w-10 rounded-full bg-gray-300" aria-hidden />
            <span className="sr-only">
              {sheetResizable && !sheetCompact ? "Drag to resize or swipe down to close" : "Drag down to close"}
            </span>
          </div>
        )}
        {mobileAsSheet ? (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain max-lg:px-0">
            <div ref={measureRef}>
              {children}
            </div>
          </div>
        ) : (
          children
        )}
        {!hideCloseButton && (
          <DialogPrimitive.Close
            className={cn(
              "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground",
              mobileAsSheet && "max-lg:hidden"
            )}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
