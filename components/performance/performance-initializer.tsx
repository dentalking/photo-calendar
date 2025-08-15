'use client';

import { useEffect } from 'react';
import { getPerformanceMonitor } from '@/lib/utils/performance-monitor';
import { usePathname } from 'next/navigation';

export function PerformanceInitializer() {
  const pathname = usePathname();

  useEffect(() => {
    const monitor = getPerformanceMonitor();
    
    // Mark navigation start
    monitor.markNavigationTiming(`nav-start-${pathname}`);
    
    // Report metrics when they're ready
    monitor.onReport((metrics) => {
      console.log('[Performance] Current metrics:', metrics);
      
      // Show warning for poor performance
      if (metrics.LCP && metrics.LCP > 2500) {
        console.warn('[Performance] Poor LCP detected:', metrics.LCP);
      }
      if (metrics.CLS && metrics.CLS > 0.1) {
        console.warn('[Performance] Poor CLS detected:', metrics.CLS);
      }
      if (metrics.FID && metrics.FID > 100) {
        console.warn('[Performance] Poor FID detected:', metrics.FID);
      }
    });
    
    // Mark when component is mounted
    monitor.markNavigationTiming(`nav-end-${pathname}`);
    monitor.measureNavigationTiming(
      `route-change-${pathname}`,
      `nav-start-${pathname}`,
      `nav-end-${pathname}`
    );
    
    // Measure time to interactive
    if (document.readyState === 'complete') {
      monitor.measureCustomMetric('time-to-interactive', performance.now());
    } else {
      window.addEventListener('load', () => {
        monitor.measureCustomMetric('time-to-interactive', performance.now());
      });
    }
    
    return () => {
      // Cleanup if needed
    };
  }, [pathname]);

  // Performance debugging in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Log all performance entries
      const logPerformance = () => {
        const entries = performance.getEntries();
        const navigation = entries.filter(e => e.entryType === 'navigation')[0] as PerformanceNavigationTiming;
        
        if (navigation) {
          console.log('[Performance] Navigation Timing:', {
            'DNS Lookup': navigation.domainLookupEnd - navigation.domainLookupStart,
            'TCP Connection': navigation.connectEnd - navigation.connectStart,
            'Request Time': navigation.responseStart - navigation.requestStart,
            'Response Time': navigation.responseEnd - navigation.responseStart,
            'DOM Processing': navigation.domComplete - navigation.domInteractive,
            'Load Complete': navigation.loadEventEnd - navigation.loadEventStart,
          });
        }
        
        // Find slow resources
        const resources = entries.filter(e => e.entryType === 'resource') as PerformanceResourceTiming[];
        const slowResources = resources.filter(r => r.duration > 500);
        
        if (slowResources.length > 0) {
          console.warn('[Performance] Slow resources detected:', 
            slowResources.map(r => ({
              name: r.name.split('/').pop(),
              duration: Math.round(r.duration),
              size: r.transferSize
            }))
          );
        }
      };
      
      // Log after page load
      if (document.readyState === 'complete') {
        setTimeout(logPerformance, 1000);
      } else {
        window.addEventListener('load', () => {
          setTimeout(logPerformance, 1000);
        });
      }
    }
  }, []);

  return null;
}