import * as React from "react"

import { cn } from "@/lib/utils"

interface ResizablePanelGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: "horizontal" | "vertical"
}

const ResizablePanelGroup = React.forwardRef<
  HTMLDivElement,
  ResizablePanelGroupProps
>(({ className, direction = "horizontal", ...props }, ref) => (
  <div
    ref={ref}
    data-direction={direction}
    className={cn(
      "flex h-full w-full",
      direction === "vertical" && "flex-col",
      className
    )}
    {...props}
  />
))
ResizablePanelGroup.displayName = "ResizablePanelGroup"

interface ResizablePanelProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultSize?: number
  minSize?: number
  maxSize?: number
}

const ResizablePanel = React.forwardRef<HTMLDivElement, ResizablePanelProps>(
  ({ className, defaultSize, minSize, maxSize, style, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex-1 overflow-auto", className)}
      style={{
        ...style,
        ...(defaultSize !== undefined && { flex: `${defaultSize} 1 0%` }),
        ...(minSize !== undefined && { minWidth: `${minSize}%` }),
        ...(maxSize !== undefined && { maxWidth: `${maxSize}%` }),
      }}
      {...props}
    />
  )
)
ResizablePanel.displayName = "ResizablePanel"

interface ResizableHandleProps extends React.HTMLAttributes<HTMLDivElement> {
  withHandle?: boolean
}

const ResizableHandle = React.forwardRef<HTMLDivElement, ResizableHandleProps>(
  ({ className, withHandle, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative flex w-1.5 shrink-0 items-center justify-center bg-border hover:bg-primary/20 cursor-col-resize after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2",
        className
      )}
      {...props}
    >
      {withHandle && (
        <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
          <svg
            width="6"
            height="10"
            viewBox="0 0 6 10"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-foreground/50"
          >
            <path
              d="M1 0.5V9.5M5 0.5V9.5"
              stroke="currentColor"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}
    </div>
  )
)
ResizableHandle.displayName = "ResizableHandle"

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
