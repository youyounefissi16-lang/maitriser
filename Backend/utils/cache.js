const store = new Map();

const defaultTTL = 5 * 60 * 1000; // 5 minutes

function get(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

function set(key, value, ttl = defaultTTL) {
  store.set(key, { value, expiry: Date.now() + ttl });
}

function del(key) {
  store.delete(key);
}

function delPattern(pattern) {
  for (const key of store.keys()) {
    if (key.startsWith(pattern)) store.delete(key);
  }
}

function clear() {
  store.clear();
}

function size() {
  return store.size;
}

function cacheMiddleware(ttl = defaultTTL) {
  return (req, res, next) => {
    const key = `${req.method}:${req.originalUrl}`;
    const cached = get(key);
    if (cached) return res.json(cached);

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode < 400) set(key, body, ttl);
      originalJson(body);
    };
    next();
  };
}

export { get, set, del, delPattern, clear, size, cacheMiddleware };
export default { get, set, del, delPattern, clear, size, cacheMiddleware };
