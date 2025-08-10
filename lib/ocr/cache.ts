/**
 * OCR Result Caching System
 * Handles caching and retrieval of OCR results
 */

import crypto from 'crypto';
import { OCRCache, OCRResult, OCRConfig } from './types';
import { CACHE_CONFIG } from './config';

export class OCRCacheManager {
  private cache: Map<string, OCRCache> = new Map();
  private accessLog: Map<string, number> = new Map();

  constructor() {
    // Setup periodic cleanup
    setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000); // Cleanup every hour
  }

  /**
   * Generate cache key for image and configuration
   */
  generateCacheKey(imageBuffer: Buffer, config: Partial<OCRConfig> = {}): string {
    const imageHash = crypto.createHash('sha256').update(imageBuffer).digest('hex').substring(0, 16);
    
    if (CACHE_CONFIG.INCLUDE_CONFIG_HASH) {
      const configString = JSON.stringify({
        primaryLanguage: config.primaryLanguage,
        enablePreprocessing: config.enablePreprocessing,
      });
      const configHash = crypto.createHash('sha256').update(configString).digest('hex').substring(0, 8);
      return `${imageHash}_${configHash}`;
    }
    
    return imageHash;
  }

  /**
   * Store OCR result in cache
   */
  set(key: string, result: OCRResult, ttl?: number): void {
    const now = Date.now();
    const expirationTime = now + (ttl || CACHE_CONFIG.DEFAULT_TTL);

    // Check if cache is full and needs cleanup
    if (this.cache.size >= CACHE_CONFIG.MAX_CACHE_SIZE) {
      this.evictLeastUsed();
    }

    const cacheEntry: OCRCache = {
      key,
      result,
      timestamp: now,
      expiresAt: expirationTime,
      hitCount: 0,
    };

    this.cache.set(key, cacheEntry);
    this.accessLog.set(key, now);
  }

  /**
   * Retrieve OCR result from cache
   */
  get(key: string): OCRResult | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.accessLog.delete(key);
      return null;
    }

    // Update access statistics
    entry.hitCount++;
    this.accessLog.set(key, Date.now());

    // Mark as cache hit in metadata
    const result = { ...entry.result };
    result.metadata = { ...result.metadata, cacheHit: true };

    return result;
  }

  /**
   * Check if cache has valid entry for key
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.accessLog.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Remove specific cache entry
   */
  delete(key: string): boolean {
    this.accessLog.delete(key);
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.accessLog.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitCount: number;
    totalEntries: number;
    averageHitCount: number;
    oldestEntry: number;
    newestEntry: number;
  } {
    const entries = Array.from(this.cache.values());
    const totalHits = entries.reduce((sum, entry) => sum + entry.hitCount, 0);
    const timestamps = entries.map(entry => entry.timestamp);

    return {
      size: this.cache.size,
      maxSize: CACHE_CONFIG.MAX_CACHE_SIZE,
      hitCount: totalHits,
      totalEntries: entries.length,
      averageHitCount: entries.length > 0 ? totalHits / entries.length : 0,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : 0,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : 0,
    };
  }

  /**
   * Get cache entries for debugging
   */
  getEntries(): Array<{
    key: string;
    timestamp: number;
    expiresAt: number;
    hitCount: number;
    confidence: number;
    textLength: number;
  }> {
    return Array.from(this.cache.values()).map(entry => ({
      key: entry.key,
      timestamp: entry.timestamp,
      expiresAt: entry.expiresAt,
      hitCount: entry.hitCount,
      confidence: entry.result.confidence,
      textLength: entry.result.text.length,
    }));
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
      this.accessLog.delete(key);
    }

    console.log(`Cache cleanup: removed ${expiredKeys.length} expired entries`);
  }

  /**
   * Evict least recently used entries when cache is full
   */
  private evictLeastUsed(): void {
    const threshold = Math.floor(CACHE_CONFIG.MAX_CACHE_SIZE * CACHE_CONFIG.CLEANUP_THRESHOLD);
    const entries = Array.from(this.accessLog.entries())
      .sort((a, b) => a[1] - b[1]); // Sort by last access time (oldest first)

    const toEvict = entries.slice(0, this.cache.size - threshold);
    
    for (const [key] of toEvict) {
      this.cache.delete(key);
      this.accessLog.delete(key);
    }

    console.log(`Cache eviction: removed ${toEvict.length} least used entries`);
  }

  /**
   * Preload cache with common results (if applicable)
   */
  async preload(commonImages: Array<{ buffer: Buffer; result: OCRResult; config?: Partial<OCRConfig> }>): Promise<void> {
    for (const { buffer, result, config = {} } of commonImages) {
      const key = this.generateCacheKey(buffer, config);
      this.set(key, result);
    }
  }

  /**
   * Export cache to JSON (for persistence)
   */
  export(): string {
    const exportData = {
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        ...entry,
      })),
      timestamp: Date.now(),
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import cache from JSON (for persistence)
   */
  import(jsonData: string): void {
    try {
      const data = JSON.parse(jsonData);
      const now = Date.now();

      for (const entry of data.entries) {
        // Only import non-expired entries
        if (entry.expiresAt > now) {
          this.cache.set(entry.key, {
            key: entry.key,
            result: entry.result,
            timestamp: entry.timestamp,
            expiresAt: entry.expiresAt,
            hitCount: entry.hitCount,
          });
          this.accessLog.set(entry.key, entry.timestamp);
        }
      }

      console.log(`Cache import: loaded ${data.entries.length} entries`);
    } catch (error) {
      console.error('Failed to import cache:', error);
    }
  }
}

// Global cache instance
export const ocrCache = new OCRCacheManager();