import { onCLS, onFCP, onFID, onLCP, onTTFB, onINP, Metric } from 'web-vitals';

interface PerformanceMetrics {
  CLS?: number;  // Cumulative Layout Shift
  FCP?: number;  // First Contentful Paint
  FID?: number;  // First Input Delay
  LCP?: number;  // Largest Contentful Paint
  TTFB?: number; // Time to First Byte
  INP?: number;  // Interaction to Next Paint
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {};
  private observers: Map<string, PerformanceObserver> = new Map();
  private reportCallback?: (metrics: PerformanceMetrics) => void;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeVitals();
      this.initializeObservers();
    }
  }

  private initializeVitals() {
    // Core Web Vitals
    onCLS(this.handleMetric.bind(this));
    onFCP(this.handleMetric.bind(this));
    onFID(this.handleMetric.bind(this));
    onLCP(this.handleMetric.bind(this));
    onTTFB(this.handleMetric.bind(this));
    onINP(this.handleMetric.bind(this));
  }

  private handleMetric(metric: Metric) {
    this.metrics[metric.name as keyof PerformanceMetrics] = metric.value;
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${metric.name}:`, metric.value.toFixed(2));
    }

    // Report to analytics
    this.reportToAnalytics(metric);
    
    // Call custom callback if set
    if (this.reportCallback) {
      this.reportCallback(this.metrics);
    }
  }

  private initializeObservers() {
    // Observer for long tasks
    if ('PerformanceObserver' in window && 'PerformanceLongTaskTiming' in window) {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.warn('[Performance] Long task detected:', {
            duration: entry.duration,
            startTime: entry.startTime,
            name: entry.name
          });
        }
      });

      try {
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.set('longtask', longTaskObserver);
      } catch (e) {
        // Long task observer not supported
      }
    }

    // Observer for resource timing
    if ('PerformanceObserver' in window) {
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            if (resourceEntry.duration > 1000) {
              console.warn('[Performance] Slow resource:', {
                name: resourceEntry.name,
                duration: resourceEntry.duration,
                size: resourceEntry.transferSize
              });
            }
          }
        }
      });

      try {
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.set('resource', resourceObserver);
      } catch (e) {
        // Resource observer not supported
      }
    }
  }

  private reportToAnalytics(metric: Metric) {
    // Report to Google Analytics if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', metric.name, {
        value: Math.round(metric.value),
        metric_id: metric.id,
        metric_value: metric.value,
        metric_delta: metric.delta,
      });
    }

    // Report to custom analytics endpoint
    if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
      fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metric: metric.name,
          value: metric.value,
          timestamp: Date.now(),
          url: window.location.href,
          userAgent: navigator.userAgent
        })
      }).catch(() => {
        // Fail silently
      });
    }
  }

  // Public methods
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public onReport(callback: (metrics: PerformanceMetrics) => void) {
    this.reportCallback = callback;
  }

  public measureCustomMetric(name: string, value: number) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] Custom metric - ${name}:`, value);
    }

    // Report custom metric
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'custom_metric', {
        metric_name: name,
        value: Math.round(value)
      });
    }
  }

  public markNavigationTiming(marker: string) {
    if ('performance' in window && 'mark' in performance) {
      performance.mark(marker);
    }
  }

  public measureNavigationTiming(name: string, startMark: string, endMark: string) {
    if ('performance' in window && 'measure' in performance) {
      try {
        performance.measure(name, startMark, endMark);
        const measure = performance.getEntriesByName(name)[0];
        if (measure) {
          this.measureCustomMetric(name, measure.duration);
        }
      } catch (e) {
        // Measurement failed
      }
    }
  }

  public destroy() {
    // Clean up observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}

// Singleton instance
let performanceMonitor: PerformanceMonitor | null = null;

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!performanceMonitor && typeof window !== 'undefined') {
    performanceMonitor = new PerformanceMonitor();
  }
  return performanceMonitor!;
}

// Hook for React components
export function usePerformanceMonitor() {
  const monitor = getPerformanceMonitor();
  
  return {
    markTiming: (marker: string) => monitor?.markNavigationTiming(marker),
    measureTiming: (name: string, start: string, end: string) => 
      monitor?.measureNavigationTiming(name, start, end),
    measureCustom: (name: string, value: number) => 
      monitor?.measureCustomMetric(name, value),
    getMetrics: () => monitor?.getMetrics() || {}
  };
}