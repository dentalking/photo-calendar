import dynamic from 'next/dynamic';
import { ComponentType } from 'react';
import { Loader2 } from 'lucide-react';

// Loading component for lazy-loaded components
export const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Wrapper for dynamic imports with loading state
export function dynamicImport<P = {}>(
  importFunc: () => Promise<{ default: ComponentType<P> }>,
  options?: {
    loading?: ComponentType;
    ssr?: boolean;
  }
) {
  return dynamic(importFunc, {
    loading: options?.loading || LoadingSpinner,
    ssr: options?.ssr ?? true,
  });
}

// Pre-configured dynamic imports for heavy components
export const DynamicCalendarView = dynamicImport(
  () => import('@/components/calendar/calendar-view').then(mod => ({ default: mod.CalendarView })),
  { ssr: false }
);

export const DynamicEventModal = dynamicImport(
  () => import('@/components/calendar/event-modal').then(mod => ({ default: mod.EventModal })),
  { ssr: false }
);

export const DynamicPhotoUpload = dynamicImport(
  () => import('@/components/ui/photo-upload').then(mod => ({ default: mod.PhotoUpload })),
  { ssr: false }
);

export const DynamicSyncProgress = dynamicImport(
  () => import('@/components/calendar/sync-progress').then(mod => ({ default: mod.SyncProgress })),
  { ssr: false }
);