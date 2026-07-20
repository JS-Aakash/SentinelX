import morgan from 'morgan';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// Create a write stream for morgan → winston
const stream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

const skip = () => {
  return env.NODE_ENV === 'test';
};

export const morganMiddleware = morgan(
  env.NODE_ENV === 'production' ? 'combined' : 'dev',
  { stream, skip }
);
