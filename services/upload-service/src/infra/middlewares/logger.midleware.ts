import { Request, Response, NextFunction } from 'express'
import { Logger } from '../adapters/logger/logger.adapter'

const logger = new Logger('HTTP')

export function logRequests(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint()

  logger.info(`Incoming request: ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    headers: req.headers,
  })

  res.on('finish', () => {
    const end = process.hrtime.bigint()
    const durationMs = Number(end - start) / 1_000_000

    logger.info(`Request completed: ${req.method} ${req.originalUrl}`, {
      statusCode: res.statusCode,
      durationMs: durationMs.toFixed(2),
      contentLength: res.getHeader('content-length') || 0,
      ip: req.ip,
    })
  })

  next()
}
