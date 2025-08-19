import { Logger } from '@/infra/adapters/logger/logger.adapter'

declare global {
  namespace Express {
    interface Request {
      logger: Logger
      traceId: string
    }
  }
}
