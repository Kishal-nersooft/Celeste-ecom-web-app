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

function isMobileSheetViewport() {
  return typeof window !== "undefined" && window.matchMedia(MOBILE_SHEET_MQ).matches
}

type DialogContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  hideCloseButton?: boolean
  mobileAsSheet?: boolean
  sheetDismissible?: boolean
  sheetCompact?: boolean
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
  onDismiss,
  style,
  ...props
}, ref) => {
  const [dragY, setDragY] = React.useState(0)
  const [dragging, setDragging] = React.useState(false)
  const startYRef = React.useRef<number | null>(null)
  const dragYRef = React.useRef(0)

  const resetDrag = React.useCallback(() => {
    startYRef.current = null
    dragYRef.current = 0
    setDragY(0)
    setDragging(false)
  }, [])

  const beginSwipe = (clientY: number) => {
    if (!mobileAsSheet || !sheetDismissible || !isMobileSheetViewport()) return false
    startYRef.current = clientY
    dragYRef.current = 0
    setDragging(true)
    return true
  }

  const moveSwipe = (clientY: number) => {
    if (startYRef.current == null) return
    const delta = Math.max(0, clientY - startYRef.current)
    dragYRef.current = delta
    setDragY(delta)
  }

  const endSwipe = () => {
    if (startYRef.current == null) return
    const delta = dragYRef.current
    const shouldClose = delta > SWIPE_CLOSE_DISTANCE
    resetDrag()
    if (shouldClose) {
      onDismiss?.()
    }
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!beginSwipe(event.clientY)) return
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    moveSwipe(event.clientY)
  }

  const handlePointerUp = () => {
    endSwipe()
  }

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
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
                  : "max-lg:h-[55vh] max-lg:min-h-[45vh] max-lg:max-h-[65vh]",
                "max-lg:p-4 max-lg:pt-2 max-lg:pb-[max(1rem,env(safe-area-inset-bottom))]",
                "max-lg:overflow-hidden",
                "max-lg:data-[state=open]:slide-in-from-bottom max-lg:data-[state=closed]:slide-out-to-bottom",
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
          ...(mobileAsSheet && dragY > 0
            ? {
                transform: `translateY(${dragY}px)`,
                transition: dragging ? "none" : "transform 200ms ease-out",
              }
            : undefined),
        }}
        {...props}
      >
        {mobileAsSheet && (
          <div
            className="hidden max-lg:flex w-full cursor-grab touch-none items-center justify-center pb-1 active:cursor-grabbing"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <div className="h-1.5 w-10 rounded-full bg-gray-300" aria-hidden />
            <span className="sr-only">Drag down to close</span>
          </div>
        )}
        {mobileAsSheet ? (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain max-lg:px-0">
            {children}
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
