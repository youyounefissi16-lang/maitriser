export const blacklist = new Set();

export const addToBlacklist = (token, expiresAt) => {
  blacklist.add(token);
  const ttl = Math.max(0, expiresAt - Date.now());
  if (ttl > 0) setTimeout(() => blacklist.delete(token), ttl);
};

export const isBlacklisted = (token) => blacklist.has(token);
