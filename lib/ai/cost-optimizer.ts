/**
 * Cost Optimization System
 * Manages token usage, model selection, and cost tracking for AI parsing
 */

import { 
  AIParsingConfig, 
  CostOptimizationSettings, 
  TokenUsage, 
  ParsingContext,
  ParsingMetrics 
} from './types';
import { COST_OPTIMIZATION, MODEL_PRICING } from './config';

interface ModelPerformanceMetrics {
  model: string;
  averageTokens: number;
  averageLatency: number;
  successRate: number;
  averageConfidence: number;
  costPerEvent: number;
}

interface ParsingStrategy {
  method: 'ai-only' | 'rule-based' | 'hybrid';
  model?: string;
  reasoning: string;
  estimatedCost: number;
  expectedAccuracy: number;
}

interface UsageTracker {
  dailyTokens: number;
  monthlyTokens: number;
  dailyCost: number;
  monthlyCost: number;
  requestCount: number;
  lastReset: Date;
}

export class CostOptimizer {
  private config: CostOptimizationSettings;
  private usageTracker: UsageTracker;
  private modelMetrics: Map<string, ModelPerformanceMetrics>;
  private requestHistory: Array<{
    timestamp: Date;
    tokens: TokenUsage;
    accuracy: number;
    model: string;
  }>;

  constructor(aiConfig: AIParsingConfig) {
    this.config = { ...COST_OPTIMIZATION };
    this.usageTracker = this.initializeUsageTracker();
    this.modelMetrics = new Map();
    this.requestHistory = [];
    
    this.initializeModelMetrics();
  }

  /**
   * Select the optimal parsing strategy based on content and constraints
   */
  public async selectParsingStrategy(
    ocrText: string, 
    context: ParsingContext
  ): Promise<ParsingStrategy> {
    // Check if we're near cost limits
    if (await this.isNearCostLimit()) {
      return {
        method: 'rule-based',
        reasoning: 'Near daily/monthly cost limit, using rule-based parsing',
        estimatedCost: 0,
        expectedAccuracy: 0.6,
      };
    }

    // Analyze text complexity
    const complexity = this.analyzeTextComplexity(ocrText);
    
    // Simple text can use rule-based parsing
    if (complexity.score < 0.3 && this.config.enablePrefiltering) {
      return {
        method: 'rule-based',
        reasoning: 'Simple text structure detected, rule-based parsing sufficient',
        estimatedCost: 0,
        expectedAccuracy: 0.75,
      };
    }

    // Medium complexity can benefit from hybrid approach
    if (complexity.score < 0.7 && complexity.score > 0.3) {
      const model = await this.selectOptimalModel(ocrText, context);
      return {
        method: 'hybrid',
        model,
        reasoning: 'Medium complexity text, hybrid approach optimal',
        estimatedCost: this.estimateTokenCost(ocrText, model) * 0.7, // Hybrid uses fewer tokens
        expectedAccuracy: 0.85,
      };
    }

    // Complex text requires full AI parsing
    const model = await this.selectOptimalModel(ocrText, context);
    return {
      method: 'ai-only',
      model,
      reasoning: 'Complex text requires full AI parsing',
      estimatedCost: this.estimateTokenCost(ocrText, model),
      expectedAccuracy: 0.9,
    };
  }

  /**
   * Select the optimal AI model based on content and performance metrics
   */
  public async selectOptimalModel(
    ocrText: string, 
    context: ParsingContext
  ): Promise<string> {
    if (!this.config.smartModelSelection) {
      return this.config.primaryModel;
    }

    const textLength = ocrText.length;
    const estimatedTokens = Math.ceil(textLength / 4); // Rough estimation
    
    // For simple, short texts, use cheaper model
    if (estimatedTokens < 500 && !this.hasComplexPatterns(ocrText)) {
      return this.config.fallbackModel;
    }

    // Check if we have performance data to make informed decision
    const gpt4Metrics = this.modelMetrics.get('gpt-4-turbo');
    const gpt35Metrics = this.modelMetrics.get('gpt-3.5-turbo');

    if (gpt4Metrics && gpt35Metrics) {
      // Calculate cost-effectiveness ratio
      const gpt4CostEffectiveness = gpt4Metrics.averageConfidence / gpt4Metrics.costPerEvent;
      const gpt35CostEffectiveness = gpt35Metrics.averageConfidence / gpt35Metrics.costPerEvent;

      // If GPT-3.5 is significantly more cost-effective and accuracy difference is small
      if (gpt35CostEffectiveness > gpt4CostEffectiveness * 1.5 && 
          Math.abs(gpt4Metrics.averageConfidence - gpt35Metrics.averageConfidence) < 0.1) {
        return 'gpt-3.5-turbo';
      }
    }

    // For Korean text or complex patterns, prefer GPT-4
    if (this.hasKoreanText(ocrText) || this.hasComplexPatterns(ocrText)) {
      return 'gpt-4-turbo';
    }

    return this.config.primaryModel;
  }

  /**
   * Track token usage and update metrics
   */
  public async trackUsage(tokenUsage: TokenUsage): Promise<void> {
    const now = new Date();
    
    // Reset counters if it's a new day/month
    await this.resetCountersIfNeeded(now);
    
    // Update usage tracker
    this.usageTracker.dailyTokens += tokenUsage.totalTokens;
    this.usageTracker.monthlyTokens += tokenUsage.totalTokens;
    this.usageTracker.dailyCost += tokenUsage.estimatedCost;
    this.usageTracker.monthlyCost += tokenUsage.estimatedCost;
    this.usageTracker.requestCount++;
    
    // Store in request history for analysis
    this.requestHistory.push({
      timestamp: now,
      tokens: tokenUsage,
      accuracy: 0.8, // This would be calculated from validation results
      model: 'gpt-4-turbo', // This would be passed from the actual request
    });

    // Limit history size
    if (this.requestHistory.length > 1000) {
      this.requestHistory = this.requestHistory.slice(-500);
    }

    // Update model metrics
    await this.updateModelMetrics();
    
    // Check for alerts
    await this.checkUsageAlerts();
  }

  /**
   * Get current usage statistics
   */
  public async getUsageStatistics(): Promise<{
    daily: { tokens: number; cost: number; requests: number };
    monthly: { tokens: number; cost: number; requests: number };
    remainingBudget: { daily: number; monthly: number };
  }> {
    return {
      daily: {
        tokens: this.usageTracker.dailyTokens,
        cost: this.usageTracker.dailyCost,
        requests: this.usageTracker.requestCount,
      },
      monthly: {
        tokens: this.usageTracker.monthlyTokens,
        cost: this.usageTracker.monthlyCost,
        requests: this.requestHistory.filter(r => 
          r.timestamp.getMonth() === new Date().getMonth()
        ).length,
      },
      remainingBudget: {
        daily: Math.max(0, this.config.maxMonthlyCost / 30 - this.usageTracker.dailyCost),
        monthly: Math.max(0, this.config.maxMonthlyCost - this.usageTracker.monthlyCost),
      },
    };
  }

  /**
   * Get model performance comparison
   */
  public async getModelComparison(): Promise<ModelPerformanceMetrics[]> {
    return Array.from(this.modelMetrics.values()).sort((a, b) => 
      (b.averageConfidence / b.costPerEvent) - (a.averageConfidence / a.costPerEvent)
    );
  }

  /**
   * Optimize batch processing
   */
  public async optimizeBatchProcessing(
    requests: Array<{ ocrText: string; context: ParsingContext }>
  ): Promise<Array<{ requests: typeof requests; strategy: ParsingStrategy }>> {
    if (!this.config.batchSimilarRequests) {
      return requests.map(req => ({ requests: [req], strategy: this.getDefaultStrategy() }));
    }

    // Group similar requests
    const groups = this.groupSimilarRequests(requests);
    
    const optimizedBatches: Array<{ requests: typeof requests; strategy: ParsingStrategy }> = [];
    
    for (const group of groups) {
      const strategy = await this.selectParsingStrategy(
        group[0].ocrText, 
        group[0].context
      );
      optimizedBatches.push({ requests: group, strategy });
    }

    return optimizedBatches;
  }

  /**
   * Get total requests processed
   */
  public async getTotalRequests(): Promise<number> {
    return this.requestHistory.length;
  }

  /**
   * Get total cost
   */
  public async getTotalCost(): Promise<number> {
    return this.requestHistory.reduce((sum, req) => sum + req.tokens.estimatedCost, 0);
  }

  // Private helper methods

  private initializeUsageTracker(): UsageTracker {
    return {
      dailyTokens: 0,
      monthlyTokens: 0,
      dailyCost: 0,
      monthlyCost: 0,
      requestCount: 0,
      lastReset: new Date(),
    };
  }

  private initializeModelMetrics(): void {
    // Initialize with baseline metrics
    this.modelMetrics.set('gpt-4-turbo', {
      model: 'gpt-4-turbo',
      averageTokens: 1500,
      averageLatency: 3000,
      successRate: 0.95,
      averageConfidence: 0.88,
      costPerEvent: 0.03,
    });

    this.modelMetrics.set('gpt-3.5-turbo', {
      model: 'gpt-3.5-turbo',
      averageTokens: 1200,
      averageLatency: 1500,
      successRate: 0.90,
      averageConfidence: 0.82,
      costPerEvent: 0.008,
    });
  }

  private analyzeTextComplexity(text: string): { score: number; factors: string[] } {
    const factors: string[] = [];
    let score = 0;

    // Length factor
    if (text.length > 1000) {
      score += 0.2;
      factors.push('long-text');
    }

    // Mixed language factor
    const hasKorean = /[가-힣]/.test(text);
    const hasEnglish = /[a-zA-Z]/.test(text);
    if (hasKorean && hasEnglish) {
      score += 0.3;
      factors.push('mixed-language');
    }

    // Complex date patterns
    if (/다음주|이번주|매주|매월/.test(text)) {
      score += 0.2;
      factors.push('relative-dates');
    }

    // Multiple events
    const eventIndicators = text.match(/\d{1,2}시|\d{1,2}월|\d{1,2}일/g) || [];
    if (eventIndicators.length > 3) {
      score += 0.3;
      factors.push('multiple-events');
    }

    // Handwriting or poor OCR quality
    if (text.includes('ㅣ') || text.includes('ㅡ') || /[oO0]{3,}/.test(text)) {
      score += 0.4;
      factors.push('poor-ocr');
    }

    return { score: Math.min(score, 1), factors };
  }

  private hasComplexPatterns(text: string): boolean {
    const complexPatterns = [
      /매주.*요일/, // Weekly recurring patterns
      /다음.*주.*월요일/, // Relative week references
      /\d+월\s*\d+일.*부터.*\d+월\s*\d+일/, // Date ranges
      /오전|오후.*시.*분.*부터.*시.*분/, // Time ranges
    ];

    return complexPatterns.some(pattern => pattern.test(text));
  }

  private hasKoreanText(text: string): boolean {
    return /[가-힣]/.test(text);
  }

  private estimateTokenCost(text: string, model: string): number {
    const estimatedTokens = Math.ceil(text.length / 4) + 500; // Text + prompt overhead
    const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING];
    
    if (!pricing) return 0;
    
    return estimatedTokens * pricing.input + 200 * pricing.output; // Estimated response tokens
  }

  private async isNearCostLimit(): Promise<boolean> {
    const dailyLimit = this.config.maxMonthlyCost / 30;
    return this.usageTracker.dailyCost > dailyLimit * 0.9 || 
           this.usageTracker.monthlyCost > this.config.maxMonthlyCost * 0.9;
  }

  private async resetCountersIfNeeded(now: Date): Promise<void> {
    const lastReset = this.usageTracker.lastReset;
    
    // Reset daily counters
    if (now.getDate() !== lastReset.getDate()) {
      this.usageTracker.dailyTokens = 0;
      this.usageTracker.dailyCost = 0;
      this.usageTracker.requestCount = 0;
    }
    
    // Reset monthly counters
    if (now.getMonth() !== lastReset.getMonth()) {
      this.usageTracker.monthlyTokens = 0;
      this.usageTracker.monthlyCost = 0;
    }
    
    this.usageTracker.lastReset = now;
  }

  private async updateModelMetrics(): Promise<void> {
    // Calculate metrics from recent request history
    const recentRequests = this.requestHistory.slice(-100); // Last 100 requests
    
    const modelStats = new Map<string, {
      tokens: number[];
      accuracy: number[];
      costs: number[];
    }>();

    for (const request of recentRequests) {
      if (!modelStats.has(request.model)) {
        modelStats.set(request.model, { tokens: [], accuracy: [], costs: [] });
      }
      
      const stats = modelStats.get(request.model)!;
      stats.tokens.push(request.tokens.totalTokens);
      stats.accuracy.push(request.accuracy);
      stats.costs.push(request.tokens.estimatedCost);
    }

    // Update metrics for each model
    for (const [model, stats] of modelStats) {
      if (stats.tokens.length > 0) {
        const existingMetrics = this.modelMetrics.get(model);
        
        const newMetrics: ModelPerformanceMetrics = {
          model,
          averageTokens: stats.tokens.reduce((sum, t) => sum + t, 0) / stats.tokens.length,
          averageLatency: existingMetrics?.averageLatency || 2000, // Keep existing or default
          successRate: existingMetrics?.successRate || 0.9,
          averageConfidence: stats.accuracy.reduce((sum, a) => sum + a, 0) / stats.accuracy.length,
          costPerEvent: stats.costs.reduce((sum, c) => sum + c, 0) / stats.costs.length,
        };
        
        this.modelMetrics.set(model, newMetrics);
      }
    }
  }

  private async checkUsageAlerts(): Promise<void> {
    const dailyLimit = this.config.maxMonthlyCost / 30;
    
    if (this.usageTracker.dailyCost > dailyLimit * 0.8) {
      console.warn('Daily cost approaching limit:', this.usageTracker.dailyCost);
    }
    
    if (this.usageTracker.monthlyCost > this.config.maxMonthlyCost * 0.8) {
      console.warn('Monthly cost approaching limit:', this.usageTracker.monthlyCost);
    }
  }

  private groupSimilarRequests(
    requests: Array<{ ocrText: string; context: ParsingContext }>
  ): Array<Array<{ ocrText: string; context: ParsingContext }>> {
    // Simple grouping by text similarity and document type
    const groups: Array<Array<{ ocrText: string; context: ParsingContext }>> = [];
    
    for (const request of requests) {
      let foundGroup = false;
      
      for (const group of groups) {
        if (this.areRequestsSimilar(request, group[0])) {
          group.push(request);
          foundGroup = true;
          break;
        }
      }
      
      if (!foundGroup) {
        groups.push([request]);
      }
    }
    
    return groups;
  }

  private areRequestsSimilar(
    req1: { ocrText: string; context: ParsingContext },
    req2: { ocrText: string; context: ParsingContext }
  ): boolean {
    // Similar document types
    if (req1.context.documentType !== req2.context.documentType) {
      return false;
    }
    
    // Similar text length
    const lengthRatio = Math.min(req1.ocrText.length, req2.ocrText.length) / 
                       Math.max(req1.ocrText.length, req2.ocrText.length);
    if (lengthRatio < 0.5) {
      return false;
    }
    
    // Similar language characteristics
    const hasKorean1 = /[가-힣]/.test(req1.ocrText);
    const hasKorean2 = /[가-힣]/.test(req2.ocrText);
    const hasEnglish1 = /[a-zA-Z]/.test(req1.ocrText);
    const hasEnglish2 = /[a-zA-Z]/.test(req2.ocrText);
    
    return hasKorean1 === hasKorean2 && hasEnglish1 === hasEnglish2;
  }

  private getDefaultStrategy(): ParsingStrategy {
    return {
      method: 'ai-only',
      model: this.config.primaryModel,
      reasoning: 'Default strategy',
      estimatedCost: 0.02,
      expectedAccuracy: 0.85,
    };
  }
}