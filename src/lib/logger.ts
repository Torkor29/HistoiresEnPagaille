import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';
// Sous Next.js, ne pas utiliser le transport pino-pretty (worker) : le chemin au worker casse dans le bundle.
const usePretty = isDev && !process.env.NEXT_RUNTIME;

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  ...(usePretty && {
    transport: { target: 'pino-pretty', options: { colorize: true } },
  }),
  base: undefined,
  formatters: {
    level: (label) => ({ level: label }),
  },
});

export function withRequestId(requestId: string) {
  return logger.child({ requestId });
}
