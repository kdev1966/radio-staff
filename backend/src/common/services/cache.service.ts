import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Simple in-memory cache implementation
// Can be replaced with Redis for production

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

@Injectable()
export class CacheService implements OnModuleDestroy {
  private cache = new Map<string, CacheEntry<any>>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(private configService: ConfigService) {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * Get cached value or fetch from source
   */
  async getCachedOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    // Check if we have a valid cached entry
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    const data = await fetcher();

    // Cache the result
    this.set(key, data, ttlSeconds);

    return data;
  }

  /**
   * Get a cached value
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set a cached value
   */
  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { data, expiry });
  }

  /**
   * Delete a cached value
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cached values
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  invalidatePattern(pattern: string): number {
    let deleted = 0;
    const regex = new RegExp(pattern);

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    entries: number;
    size: number;
    keys: string[];
  } {
    const keys = Array.from(this.cache.keys());

    // Estimate memory size (rough approximation)
    let size = 0;
    for (const entry of this.cache.values()) {
      size += JSON.stringify(entry.data).length;
    }

    return {
      entries: this.cache.size,
      size,
      keys
    };
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Cache key builder utility
 */
export class CacheKeyBuilder {
  static shifts(filters?: Record<string, any>): string {
    const base = 'shifts';
    if (!filters || Object.keys(filters).length === 0) {
      return `${base}:all`;
    }
    const filterStr = Object.entries(filters)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(':');
    return `${base}:${filterStr}`;
  }

  static shift(id: string): string {
    return `shift:${id}`;
  }

  static shiftSuggestions(shiftId: string): string {
    return `shift:${shiftId}:suggestions`;
  }

  static employees(filters?: Record<string, any>): string {
    const base = 'employees';
    if (!filters || Object.keys(filters).length === 0) {
      return `${base}:all`;
    }
    const filterStr = Object.entries(filters)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(':');
    return `${base}:${filterStr}`;
  }

  static employee(id: string): string {
    return `employee:${id}`;
  }

  static leaves(employeeId?: string, status?: string): string {
    const parts = ['leaves'];
    if (employeeId) parts.push(`emp:${employeeId}`);
    if (status) parts.push(`status:${status}`);
    return parts.join(':');
  }

  static leave(id: string): string {
    return `leave:${id}`;
  }
}