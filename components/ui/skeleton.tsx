import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader } from "./card"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  loading?: boolean
  children?: React.ReactNode
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, loading = true, children, ...props }, ref) => {
    if (!loading && children) {
      return <>{children}</>
    }

    return (
      <div
        ref={ref}
        className={cn(
          "animate-pulse rounded-md bg-muted",
          className
        )}
        data-testid="skeleton"
        {...props}
      />
    )
  }
)
Skeleton.displayName = "Skeleton"

// Calendar Skeleton
const CalendarSkeleton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("w-full", className)} data-testid="calendar-skeleton" {...props}>
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-4 p-2">
        <div className="flex items-center gap-4">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-8 w-12" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>

      {/* Calendar grid skeleton */}
      <div className="border rounded-lg overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b bg-muted/50">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="p-3 text-center">
              <Skeleton className="h-4 w-4 mx-auto" />
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-px bg-muted">
          {Array.from({ length: 42 }).map((_, i) => (
            <Card key={i} className="h-24 sm:h-32 p-2">
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
)
CalendarSkeleton.displayName = "CalendarSkeleton"

// Event Card Skeleton
const EventCardSkeleton = React.forwardRef<HTMLDivElement, { variant?: "default" | "compact" | "detailed" } & React.HTMLAttributes<HTMLDivElement>>(
  ({ className, variant = "default", ...props }, ref) => {
    if (variant === "compact") {
      return (
        <Card ref={ref} className={cn("", className)} data-testid="event-card-skeleton" {...props}>
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-lg shrink-0" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3 w-3" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-3 ml-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <div className="flex gap-1">
                <Skeleton className="h-6 w-6" />
                <Skeleton className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card ref={ref} className={cn("", className)} data-testid="event-card-skeleton" {...props}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-3/4" />
              <div className="flex items-center gap-1">
                <Skeleton className="w-2 h-2 rounded-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <div className="flex gap-1">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Photo skeleton */}
          <Skeleton className="w-full aspect-video rounded-lg" />
          
          {/* Description skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>

          {/* Date and time skeleton */}
          <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="w-4 h-4 ml-2" />
            <Skeleton className="h-4 w-16" />
          </div>

          {/* Location skeleton */}
          <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4" />
            <Skeleton className="h-4 w-32" />
          </div>
        </CardContent>
      </Card>
    )
  }
)
EventCardSkeleton.displayName = "EventCardSkeleton"

// Photo Upload Skeleton
const PhotoUploadSkeleton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("w-full", className)} data-testid="photo-upload-skeleton" {...props}>
      <Card className="p-8 text-center border-2 border-dashed border-muted">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Skeleton className="w-16 h-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
      </Card>

      {/* Preview skeleton */}
      <div className="mt-6 space-y-4">
        <Skeleton className="h-5 w-32" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-square" />
              <div className="p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1 space-y-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
)
PhotoUploadSkeleton.displayName = "PhotoUploadSkeleton"

// Generic Loading State Components
const LoadingSpinner = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center justify-center p-4", className)}
      data-testid="loading-spinner"
      {...props}
    >
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
    </div>
  )
)
LoadingSpinner.displayName = "LoadingSpinner"

const LoadingPage = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col items-center justify-center min-h-[400px] space-y-4", className)}
      data-testid="loading-page"
      {...props}
    >
      <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">로딩 중...</p>
    </div>
  )
)
LoadingPage.displayName = "LoadingPage"

// List skeleton for multiple items
const ListSkeleton = React.forwardRef<HTMLDivElement, { count?: number; itemHeight?: string } & React.HTMLAttributes<HTMLDivElement>>(
  ({ className, count = 5, itemHeight = "h-16", ...props }, ref) => (
    <div ref={ref} className={cn("space-y-3", className)} data-testid="list-skeleton" {...props}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={cn("w-full", itemHeight)} />
      ))}
    </div>
  )
)
ListSkeleton.displayName = "ListSkeleton"

export {
  Skeleton,
  CalendarSkeleton,
  EventCardSkeleton,
  PhotoUploadSkeleton,
  LoadingSpinner,
  LoadingPage,
  ListSkeleton,
}