import pino, { Logger as PinoLogger } from 'pino'
import { randomUUID } from 'crypto'
import { env } from '@/infra/config/env'

export class Logger {
  private logger: PinoLogger

  constructor(context?: string, traceId?: string) {
    this.logger = pino({
      level: env.logLevel || 'info',
      transport:
        process.env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
      base: { service: 'upload-service' },
    }).child({ context, traceId: traceId || randomUUID() })
  }

  info(message: string, meta?: object) {
    this.logger.info(meta || {}, message)
  }

  warn(message: string, meta?: object) {
    this.logger.warn(meta || {}, message)
  }

  error(message: string, meta?: object) {
    this.logger.error(meta || {}, message)
  }

  debug(message: string, meta?: object) {
    this.logger.debug(meta || {}, message)
  }
}
