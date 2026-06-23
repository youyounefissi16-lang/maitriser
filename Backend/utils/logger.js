import pino from 'pino';
import pinoHttp from 'pino-http';
import path from 'path';
import { fileURLToPath } from 'url';

const isDev = process.env.NODE_ENV !== 'production';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logDir = path.resolve(__dirname, '../../logs');

const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  transport: isDev
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' } }
    : { target: 'pino/file', options: { destination: path.join(logDir, 'server.log'), mkdir: true } },
  serializers: { err: pino.stdSerializers.err },
  redact: ['req.headers.authorization', 'req.headers.cookie'],
});

const httpLogger = pinoHttp({
  logger,
  autoLogging: {
    ignore: (req) => req.url === '/api/health',
  },
  serializers: {
    req: (req) => ({ method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
});

export { logger, httpLogger };
export default logger;
