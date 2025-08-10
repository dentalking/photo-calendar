/**
 * AI Parsing Cache Management
 * Intelligent caching system to reduce API calls and costs
 */

import crypto from 'crypto';
import { AIParsingResult, PromptCache, ParsingContext } from './types';
import { CACHE_CONFIG } from './config';

interface CacheStatistics {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  tokensSaved: number;
  costSaved: number;
  averageResponseTime: number;
}

interface SemanticCacheEntry {
  key: string;
  semanticHash: string;
  result: AIParsingResult;
  timestamp: number;
  expiresAt: number;
  hitCount: number;
  lastAccess: number;
  tags: string[];
}

export class PromptCacheManager {
  private cache: Map<string, SemanticCacheEntry>;
  private semanticIndex: Map<string, string[]>; // semantic hash -> keys
  private statistics: CacheStatistics;
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.cache = new Map();
    this.semanticIndex = new Map();
    this.statistics = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      hitRate: 0,
      tokensSaved: 0,
      costSaved: 0,
      averageResponseTime: 0,
    };

    this.startCleanupSchedule();
  }

  /**
   * Generate cache key from OCR text and context
   */
  public generateCacheKey(ocrText: string, context: ParsingContext): string {
    const normalizedText = this.normalizeText(ocrText);
    const contextStr = JSON.stringify({
      userLanguage: context.userLanguage,
      documentType: context.documentType,
      timezone: context.userTimezone,
      // Don't include processing date as it changes frequently
    });

    return crypto
      .createHash('sha256')
      .update(normalizedText + contextStr)
      .digest('hex');
  }

  /**
   * Generate semantic hash for similar content detection
   */
  public generateSemanticHash(ocrText: string): string {
    // Extract semantic features for similarity matching
    const features = this.extractSemanticFeatures(ocrText);
    const featureString = features.sort().join('|');
    
    return crypto
      .createHash('md5')
      .update(featureString)
      .digest('hex');
  }

  /**
   * Get cached result if available
   */
  public async getCachedResult(cacheKey: string): Promise<AIParsingResult | null> {
    this.statistics.totalRequests++;

    const entry = this.cache.get(cacheKey);
    
    if (!entry) {
      this.statistics.cacheMisses++;
      this.updateHitRate();
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(cacheKey);
      this.removeFromSemanticIndex(entry);
      this.statistics.cacheMisses++;
      this.updateHitRate();
      return null;
    }

    // Update access statistics
    entry.hitCount++;
    entry.lastAccess = Date.now();
    this.statistics.cacheHits++;
    this.statistics.tokensSaved += entry.result.tokenUsage.totalTokens;
    this.statistics.costSaved += entry.result.tokenUsage.estimatedCost;
    this.updateHitRate();

    // Return a copy to prevent modification
    return {
      ...entry.result,
      processingTime: 50, // Cache hit is very fast
    };
  }

  /**
   * Cache a parsing result
   */
  public async cacheResult(
    cacheKey: string,
    result: AIParsingResult,
    tags: string[] = []
  ): Promise<void> {
    // Check cache size limits
    if (this.cache.size >= CACHE_CONFIG.maxEntries) {
      await this.evictLeastUsed();
    }

    const now = Date.now();
    const expiryTime = this.calculateExpiryTime(result);
    const semanticHash = this.generateSemanticHash(result.rawResponse?.input || '');

    const entry: SemanticCacheEntry = {
      key: cacheKey,
      semanticHash,
      result,
      timestamp: now,
      expiresAt: now + expiryTime,
      hitCount: 0,
      lastAccess: now,
      tags: [...tags, this.generateAutoTags(result)].flat(),
    };

    this.cache.set(cacheKey, entry);
    this.addToSemanticIndex(entry);
  }

  /**
   * Find similar cached results using semantic similarity
   */
  public async findSimilarResults(
    ocrText: string,
    similarityThreshold: number = 0.8
  ): Promise<SemanticCacheEntry[]> {
    const targetSemanticHash = this.generateSemanticHash(ocrText);
    const similarKeys = this.semanticIndex.get(targetSemanticHash) || [];
    
    const similarResults: SemanticCacheEntry[] = [];

    for (const key of similarKeys) {
      const entry = this.cache.get(key);
      if (entry && Date.now() <= entry.expiresAt) {
        const similarity = this.calculateSimilarity(ocrText, entry);
        if (similarity >= similarityThreshold) {
          similarResults.push(entry);
        }
      }
    }

    return similarResults.sort((a, b) => b.hitCount - a.hitCount);
  }

  /**
   * Preload cache with common patterns
   */
  public async preloadCommonPatterns(): Promise<void> {
    const commonPatterns = [
      {
        pattern: '회의 미팅 업무 프로젝트',
        result: this.createSampleResult('work', 0.85),
        tags: ['work', 'meeting'],
      },
      {
        pattern: '생일 파티 축하 케이크',
        result: this.createSampleResult('personal', 0.80),
        tags: ['personal', 'birthday'],
      },
      {
        pattern: '병원 진료 검진 치료',
        result: this.createSampleResult('health', 0.90),
        tags: ['health', 'medical'],
      },
    ];

    for (const { pattern, result, tags } of commonPatterns) {
      const key = crypto.createHash('sha256').update(pattern).digest('hex');
      await this.cacheResult(key, result, tags);
    }
  }

  /**
   * Get cache statistics
   */
  public async getStatistics(): Promise<CacheStatistics> {
    return { ...this.statistics };
  }

  /**
   * Get hit rate
   */
  public async getHitRate(): Promise<number> {
    return this.statistics.hitRate;
  }

  /**
   * Clear cache
   */
  public async clearCache(): Promise<void> {
    this.cache.clear();
    this.semanticIndex.clear();
    this.resetStatistics();
  }

  /**
   * Clear expired entries
   */
  public async clearExpired(): Promise<number> {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        this.removeFromSemanticIndex(entry);
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * Get cache size and memory usage
   */
  public async getCacheInfo(): Promise<{
    entries: number;
    memoryUsageMB: number;
    oldestEntry: Date;
    newestEntry: Date;
  }> {
    const entries = this.cache.size;
    const memoryUsageMB = this.estimateMemoryUsage();
    
    let oldest = Date.now();
    let newest = 0;

    for (const entry of this.cache.values()) {
      oldest = Math.min(oldest, entry.timestamp);
      newest = Math.max(newest, entry.timestamp);
    }

    return {
      entries,
      memoryUsageMB,
      oldestEntry: new Date(oldest),
      newestEntry: new Date(newest),
    };
  }

  // Private helper methods

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s가-힣]/g, '')
      .trim();
  }

  private extractSemanticFeatures(text: string): string[] {
    const features: string[] = [];

    // Date patterns
    if (/\d{4}년|\d{1,2}월|\d{1,2}일/.test(text)) features.push('has-korean-date');
    if (/\d{1,2}\/\d{1,2}\/\d{4}/.test(text)) features.push('has-english-date');
    if (/오늘|내일|모레/.test(text)) features.push('has-relative-date');

    // Time patterns  
    if (/\d{1,2}시|\d{1,2}:\d{2}/.test(text)) features.push('has-time');
    if (/오전|오후/.test(text)) features.push('has-korean-time');

    // Location patterns
    if (/[가-힣]+역|[가-힣]+점/.test(text)) features.push('has-location');
    if (/온라인|zoom|teams/.test(text)) features.push('has-online-location');

    // Event type patterns
    if (/회의|미팅|업무/.test(text)) features.push('work-event');
    if (/생일|파티|축하/.test(text)) features.push('personal-event');
    if (/병원|진료|치료/.test(text)) features.push('health-event');

    // Language detection
    if (/[가-힣]/.test(text)) features.push('korean-text');
    if (/[a-zA-Z]/.test(text)) features.push('english-text');

    // Text length categories
    if (text.length < 100) features.push('short-text');
    else if (text.length < 500) features.push('medium-text');
    else features.push('long-text');

    return features;
  }

  private calculateExpiryTime(result: AIParsingResult): number {
    // Dynamic expiry based on confidence and cost
    const baseExpiry = CACHE_CONFIG.mediumTerm * 60 * 1000; // Convert to ms
    
    // High confidence results can be cached longer
    if (result.confidence > 0.9) {
      return baseExpiry * 2;
    }
    
    // Low confidence results expire sooner
    if (result.confidence < 0.6) {
      return CACHE_CONFIG.shortTerm * 60 * 1000;
    }
    
    return baseExpiry;
  }

  private generateAutoTags(result: AIParsingResult): string[] {
    const tags: string[] = [];

    // Add tags based on events
    for (const event of result.events) {
      tags.push(`category:${event.category}`);
      
      if (event.isRecurring) tags.push('recurring');
      if (event.location) tags.push('has-location');
      if (!event.isAllDay) tags.push('has-time');
    }

    // Add confidence tags
    if (result.confidence > 0.9) tags.push('high-confidence');
    else if (result.confidence < 0.6) tags.push('low-confidence');

    // Add model tag
    tags.push(`model:${result.model}`);

    return tags;
  }

  private addToSemanticIndex(entry: SemanticCacheEntry): void {
    const keys = this.semanticIndex.get(entry.semanticHash) || [];
    keys.push(entry.key);
    this.semanticIndex.set(entry.semanticHash, keys);
  }

  private removeFromSemanticIndex(entry: SemanticCacheEntry): void {
    const keys = this.semanticIndex.get(entry.semanticHash) || [];
    const filtered = keys.filter(key => key !== entry.key);
    
    if (filtered.length === 0) {
      this.semanticIndex.delete(entry.semanticHash);
    } else {
      this.semanticIndex.set(entry.semanticHash, filtered);
    }
  }

  private calculateSimilarity(text: string, entry: SemanticCacheEntry): number {
    // Simple similarity calculation based on shared semantic features
    const textFeatures = new Set(this.extractSemanticFeatures(text));
    const entryFeatures = new Set(this.extractSemanticFeatures(entry.result.rawResponse?.input || ''));
    
    const intersection = new Set([...textFeatures].filter(f => entryFeatures.has(f)));
    const union = new Set([...textFeatures, ...entryFeatures]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private async evictLeastUsed(): Promise<void> {
    const entries = Array.from(this.cache.values());
    
    // Sort by hit count (ascending) and last access (ascending)
    entries.sort((a, b) => {
      if (a.hitCount !== b.hitCount) {
        return a.hitCount - b.hitCount;
      }
      return a.lastAccess - b.lastAccess;
    });

    // Remove bottom 10% of entries
    const removeCount = Math.max(1, Math.floor(entries.length * 0.1));
    
    for (let i = 0; i < removeCount; i++) {
      const entry = entries[i];
      this.cache.delete(entry.key);
      this.removeFromSemanticIndex(entry);
    }
  }

  private updateHitRate(): void {
    this.statistics.hitRate = this.statistics.totalRequests > 0 
      ? this.statistics.cacheHits / this.statistics.totalRequests 
      : 0;
  }

  private resetStatistics(): void {
    this.statistics = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      hitRate: 0,
      tokensSaved: 0,
      costSaved: 0,
      averageResponseTime: 0,
    };
  }

  private estimateMemoryUsage(): number {
    let totalSize = 0;
    
    for (const entry of this.cache.values()) {
      // Rough estimation of entry size in bytes
      const entrySize = JSON.stringify(entry).length * 2; // Rough conversion to bytes
      totalSize += entrySize;
    }
    
    return totalSize / (1024 * 1024); // Convert to MB
  }

  private createSampleResult(category: string, confidence: number): AIParsingResult {
    return {
      events: [{
        title: 'Sample Event',
        description: 'Sample description',
        startDate: new Date(),
        endDate: new Date(),
        startTime: null,
        endTime: null,
        isAllDay: true,
        timezone: 'Asia/Seoul',
        isRecurring: false,
        recurrenceRule: null,
        location: null,
        attendees: [],
        organizer: null,
        category: category as any,
        priority: 'medium',
        status: 'confirmed',
        confidence: {
          overall: confidence,
          title: confidence,
          dateTime: confidence,
          location: 0.5,
          recurrence: 0,
          category: confidence,
        },
        originalText: 'Sample text',
        extractionMethod: 'ai',
        processingTime: 0,
        cost: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0 },
      }],
      confidence,
      processingTime: 2000,
      model: 'gpt-4-turbo',
      tokenUsage: { promptTokens: 500, completionTokens: 200, totalTokens: 700, estimatedCost: 0.02 },
      validationErrors: [],
      warnings: [],
      rawResponse: { input: 'Sample input' },
    };
  }

  private startCleanupSchedule(): void {
    this.cleanupInterval = setInterval(async () => {
      const removed = await this.clearExpired();
      if (removed > 0) {
        console.log(`Cache cleanup: removed ${removed} expired entries`);
      }
    }, CACHE_CONFIG.cleanupInterval);
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}