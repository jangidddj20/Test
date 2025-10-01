// API request deduplication and caching utility
class ApiCache {
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.defaultTTL = 30000; // 30 seconds default TTL
  }

  generateKey(url, options = {}) {
    return `${url}_${JSON.stringify(options)}`;
  }

  isValid(cacheEntry) {
    if (!cacheEntry) return false;
    return Date.now() - cacheEntry.timestamp < cacheEntry.ttl;
  }

  get(url, options = {}) {
    const key = this.generateKey(url, options);
    const cached = this.cache.get(key);

    if (this.isValid(cached)) {
      return cached.data;
    }

    return null;
  }

  set(url, options = {}, data, ttl = this.defaultTTL) {
    const key = this.generateKey(url, options);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  async dedupe(url, options = {}, fetcher) {
    const key = this.generateKey(url, options);

    // Check cache first
    const cached = this.get(url, options);
    if (cached !== null) {
      return cached;
    }

    // Check if there's already a pending request for this key
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    // Create new request
    const requestPromise = fetcher()
      .then(data => {
        this.set(url, options, data);
        this.pendingRequests.delete(key);
        return data;
      })
      .catch(error => {
        this.pendingRequests.delete(key);
        throw error;
      });

    this.pendingRequests.set(key, requestPromise);
    return requestPromise;
  }

  invalidate(url, options = {}) {
    const key = this.generateKey(url, options);
    this.cache.delete(key);
  }

  invalidatePattern(pattern) {
    const keys = Array.from(this.cache.keys());
    keys.forEach(key => {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    });
  }

  clear() {
    this.cache.clear();
    this.pendingRequests.clear();
  }
}

export const apiCache = new ApiCache();
