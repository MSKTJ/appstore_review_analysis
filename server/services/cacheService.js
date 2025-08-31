class CacheService {
  constructor(ttlSeconds) {
    this.cache = new Map();
    this.ttl = ttlSeconds * 1000; // Time to live in milliseconds
  }

  get(key) {
    const record = this.cache.get(key);
    if (!record) {
      return null;
    }

    const isExpired = Date.now() > record.expiry;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return record.value;
  }

  set(key, value) {
    const expiry = Date.now() + this.ttl;
    this.cache.set(key, { value, expiry });
  }

  has(key) {
    return this.cache.has(key) && !this.isExpired(key);
  }

  delete(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  isExpired(key) {
    const record = this.cache.get(key);
    if (record) {
      return Date.now() > record.expiry;
    }
    return true;
  }

  get size() {
    // Expired items are not counted
    let count = 0;
    for (const key of this.cache.keys()) {
      if (!this.isExpired(key)) {
        count++;
      }
    }
    return count;
  }
}

// Export a singleton instance with a 1-hour TTL
module.exports = new CacheService(3600);
