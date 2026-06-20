import pino from 'pino';
import { AsyncLocalStorage } from 'async_hooks';

export const requestIdStorage = new AsyncLocalStorage<string>();

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
  mixin: () => {
    const requestId = requestIdStorage.getStore();
    return requestId ? { requestId } : {};
  },
});

export default logger;
