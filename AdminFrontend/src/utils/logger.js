const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

const currentLevel = LOG_LEVELS[import.meta.env.VITE_LOG_LEVEL] ?? LOG_LEVELS.info;

const prefix = (level, ...args) => [`[Admin]`, `[${level.toUpperCase()}]`, ...args];

export const logger = {
  debug: (...args) => { if (currentLevel <= 0) console.debug(...prefix('debug', ...args)); },
  info:  (...args) => { if (currentLevel <= 1) console.info(...prefix('info', ...args)); },
  warn:  (...args) => { if (currentLevel <= 2) console.warn(...prefix('warn', ...args)); },
  error: (...args) => { if (currentLevel <= 3) console.error(...prefix('error', ...args)); },
};

export default logger;
