import { env } from "../../../core/config/env.js";

export class AiBudgetService {
  private static dailyCount = 0;
  private static monthlyCount = 0;
  private static lastResetDay = new Date().getUTCDate();
  private static lastResetMonth = new Date().getUTCMonth();

  private static developerDailyMap = new Map<string, number>();
  private static clusterCooldownMap = new Map<string, number>();

  private static checkAndResetPeriods(): void {
    const now = new Date();
    const currentDay = now.getUTCDate();
    const currentMonth = now.getUTCMonth();

    if (currentDay !== this.lastResetDay) {
      this.dailyCount = 0;
      this.developerDailyMap.clear();
      this.lastResetDay = currentDay;
    }

    if (currentMonth !== this.lastResetMonth) {
      this.monthlyCount = 0;
      this.lastResetMonth = currentMonth;
    }
  }

  /**
   * Detailed check if quota, rate limits, and cooldown allow AI analysis.
   */
  public static checkConsumption(developerId?: string, clusterId?: string): { allowed: boolean; reason?: string } {
    this.checkAndResetPeriods();

    const maxDaily = env.AI_DAILY_LIMIT || env.REPORT_AI_MAX_DAILY_REVIEWS;
    const maxMonthly = env.AI_MONTHLY_LIMIT || env.REPORT_AI_MAX_MONTHLY_REVIEWS;

    // 1. System Daily Limit
    if (this.dailyCount >= maxDaily) {
      return { allowed: false, reason: "SYSTEM_DAILY_LIMIT_EXCEEDED" };
    }

    // 2. System Monthly Limit
    if (this.monthlyCount >= maxMonthly) {
      return { allowed: false, reason: "SYSTEM_MONTHLY_LIMIT_EXCEEDED" };
    }

    // 3. Developer Daily Limit
    if (developerId) {
      const devCount = this.developerDailyMap.get(developerId) || 0;
      const maxDevDaily = env.AI_MAX_REQUESTS_PER_DEVELOPER_PER_DAY;
      if (devCount >= maxDevDaily) {
        return { allowed: false, reason: "DEVELOPER_DAILY_LIMIT_EXCEEDED" };
      }
    }

    // 4. Cluster Cooldown
    if (clusterId && this.isClusterInCooldown(clusterId)) {
      return { allowed: false, reason: "CLUSTER_IN_COOLDOWN" };
    }

    return { allowed: true };
  }

  /**
   * Checks if quota is available for AI analysis (backward compatible boolean).
   */
  public static canConsume(developerId?: string, clusterId?: string): boolean {
    return this.checkConsumption(developerId, clusterId).allowed;
  }

  /**
   * Checks if a cluster is currently within its 24h cooldown period.
   */
  public static isClusterInCooldown(clusterId: string): boolean {
    const lastReviewedAt = this.clusterCooldownMap.get(clusterId);
    if (!lastReviewedAt) return false;

    const cooldownMs = (env.AI_CLUSTER_COOLDOWN_HOURS || 24) * 60 * 60 * 1000;
    return Date.now() - lastReviewedAt < cooldownMs;
  }

  /**
   * Atomically reserves a budget slot for an AI review.
   */
  public static reserve(developerId?: string, clusterId?: string): boolean {
    const check = this.checkConsumption(developerId, clusterId);
    if (!check.allowed) {
      return false;
    }

    this.dailyCount++;
    this.monthlyCount++;

    if (developerId) {
      const devCount = this.developerDailyMap.get(developerId) || 0;
      this.developerDailyMap.set(developerId, devCount + 1);
    }

    return true;
  }

  /**
   * Consumes one review slot (backward compatible).
   */
  public static consume(developerId?: string, clusterId?: string): boolean {
    return this.reserve(developerId, clusterId);
  }

  /**
   * Records that a cluster review was completed, starting its cooldown window.
   */
  public static recordClusterReview(clusterId: string): void {
    this.clusterCooldownMap.set(clusterId, Date.now());
  }

  /**
   * Releases or refunds a reserved budget slot (e.g. upon API failure or duplicate race condition).
   */
  public static refund(developerId?: string): void {
    this.checkAndResetPeriods();
    if (this.dailyCount > 0) this.dailyCount--;
    if (this.monthlyCount > 0) this.monthlyCount--;

    if (developerId) {
      const devCount = this.developerDailyMap.get(developerId) || 0;
      if (devCount > 0) {
        this.developerDailyMap.set(developerId, devCount - 1);
      }
    }
  }

  public static getRemainingDaily(): number {
    this.checkAndResetPeriods();
    const maxDaily = env.AI_DAILY_LIMIT || env.REPORT_AI_MAX_DAILY_REVIEWS;
    return Math.max(0, maxDaily - this.dailyCount);
  }

  public static getRemainingMonthly(): number {
    this.checkAndResetPeriods();
    const maxMonthly = env.AI_MONTHLY_LIMIT || env.REPORT_AI_MAX_MONTHLY_REVIEWS;
    return Math.max(0, maxMonthly - this.monthlyCount);
  }

  public static getDeveloperDailyCount(developerId: string): number {
    this.checkAndResetPeriods();
    return this.developerDailyMap.get(developerId) || 0;
  }

  public static getDeveloperRemainingDaily(developerId: string): number {
    this.checkAndResetPeriods();
    const maxDevDaily = env.AI_MAX_REQUESTS_PER_DEVELOPER_PER_DAY;
    return Math.max(0, maxDevDaily - this.getDeveloperDailyCount(developerId));
  }

  public static getDailyCount(): number {
    this.checkAndResetPeriods();
    return this.dailyCount;
  }

  public static getMonthlyCount(): number {
    this.checkAndResetPeriods();
    return this.monthlyCount;
  }

  public static reset(): void {
    this.dailyCount = 0;
    this.monthlyCount = 0;
    this.developerDailyMap.clear();
    this.clusterCooldownMap.clear();
    this.lastResetDay = new Date().getUTCDate();
    this.lastResetMonth = new Date().getUTCMonth();
  }
}
