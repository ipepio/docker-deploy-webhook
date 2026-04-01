import { createLogger, format, transports } from 'winston';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = createLogger({
  level: isProduction ? 'info' : 'debug',
  defaultMeta: {
    service: 'docker-deploy-webhook',
  },
  format: isProduction
    ? format.combine(format.timestamp(), format.errors({ stack: true }), format.json())
    : format.combine(
        format.colorize(),
        format.timestamp(),
        format.errors({ stack: true }),
        format.printf(({ timestamp, level, message, ...meta }) => {
          const metaText = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} ${level}: ${message}${metaText}`;
        }),
      ),
  transports: [new transports.Console()],
});
