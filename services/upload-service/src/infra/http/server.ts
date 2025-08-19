import express, { Request, Response } from 'express'
import cors from 'cors'

import { requestsMiddleware } from '@/infra/middlewares/request.midleware'
import { uploadRequestHandler } from '@/infra/handlers/upload-request.handler'
import { uploadChunkHandler } from '@/infra/handlers/upload-chunk.handler'
import { uploadStatusHandler } from '@/infra/handlers/upload-status.handler'

export function getServer() {
  const app = express()

  app.use(express.json())
  app.use(cors())
  app.use(requestsMiddleware)

  app.post('/upload-request', uploadRequestHandler)

  app.post('/upload', uploadChunkHandler)

  app.get('/upload-status/:uploadRequestId', uploadStatusHandler)

  app.get('/health', (req: Request, res: Response) => {
    return res.status(200).json({ message: 'service on' })
  })

  return app
}
