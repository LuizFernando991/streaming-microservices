import { Request, Response, NextFunction } from 'express'
import { Logger } from '../adapters/logger/logger.adapter'
import { randomUUID } from 'crypto'
import { context, trace } from '@opentelemetry/api'
import client from 'prom-client'

const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'HTTP reqs total',
  labelNames: ['method', 'route', 'status_code'],
})

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'HTTP request duration in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [50, 100, 300, 500, 1000, 2000, 5000],
})

export function requestsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const ignorePaths = ['/health', '/metrics']
  if (ignorePaths.includes(req.path)) {
    return next()
  }

  const activeSpan = trace.getSpan(context.active())
  const traceId = activeSpan?.spanContext().traceId || randomUUID()

  const logger = new Logger('HTTP', traceId)
  req.logger = logger
  req.traceId = traceId

  const start = process.hrtime.bigint()

  logger.info(`Incoming request: ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  })

  res.on('finish', () => {
    const end = process.hrtime.bigint()
    const durationMs = Number(end - start) / 1_000_000

    if (res.statusCode >= 400) {
      logger.error(`Request finished with error status`, {
        statusCode: res.statusCode,
        path: req.originalUrl,
        durationMs: durationMs.toFixed(2),
        contentLength: res.getHeader('content-length') || 0,
        ip: req.ip,
      })
    } else {
      logger.info(`Request completed`, {
        statusCode: res.statusCode,
        durationMs: durationMs.toFixed(2),
        contentLength: res.getHeader('content-length') || 0,
        ip: req.ip,
      })
    }

    httpRequestCounter.inc({
      method: req.method,
      route: req.route?.path || req.originalUrl,
      status_code: res.statusCode,
    })

    httpRequestDuration.observe(
      {
        method: req.method,
        route: req.route?.path || req.originalUrl,
        status_code: res.statusCode,
      },
      durationMs,
    )
  })

  next()
}
