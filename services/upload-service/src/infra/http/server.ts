import express from 'express'
import cors from 'cors'

import { logRequests } from '@/infra/middlewares/logger.midleware'
import { uploadRequestHandler } from '@/infra/handlers/upload-request.handler'
import { uploadChunkHandler } from '@/infra/handlers/upload-chunk.handler'
import { uploadStatusHandler } from '@/infra/handlers/upload-status.handler'

export function getServer() {
  const app = express()

  app.use(express.json())
  app.use(cors())
  app.use(logRequests)

  app.post('/upload-request', uploadRequestHandler)

  app.post('/upload', uploadChunkHandler)

  app.get('/upload-status/:uploadRequestId', uploadStatusHandler)

  return app
}
