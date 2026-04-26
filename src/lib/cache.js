const TTL = 5 * 60 * 1000; // 5 minutes default TTL

export function setCache(key, data) {
  const entry = {
    data,
    timestamp: Date.now(),
  };
  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (e) {
    console.warn('Cache write failed:', e);
  }
}

export function getCache(key, maxAge = TTL) {
  try {
    const entry = localStorage.getItem(key);
    if (!entry) return null;

    const { data, timestamp } = JSON.parse(entry);
    const age = Date.now() - timestamp;

    // Return null if expired (unless maxAge is Infinity for stale fallback)
    if (age > maxAge && maxAge !== Infinity) {
      return null;
    }

    return data;
  } catch (e) {
    console.warn('Cache read failed:', e);
    return null;
  }
}

export function clearCache(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn('Cache clear failed:', e);
  }
}
