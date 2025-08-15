import Redis from 'ioredis'

import { uploadAbort } from '@/infra/handlers/upload-abort.handler'
import { getValuesFromRedisKey } from '@/utils/parse-redis-key'
import { env } from '@/infra/config/env'
import { Logger } from '../logger/logger.adapter'

const logger = new Logger('REDIS_SUBSCRIPTION')

export function startRedisSubscribers() {
  const redisSubscriber = new Redis({
    host: env.redisHost,
    port: env.redisPort,
    password: env.redisPassword,
  })

  redisSubscriber.subscribe('__keyevent@0__:expired', (err) => {
    if (err) {
      logger.error('Failed to subscribe to expired events:', err)
      throw new Error('Failed to subscribe on redis expiration event')
    } else {
      logger.info('Subscribed to expired events')
    }
  })

  redisSubscriber.on('message', async (event, requestUploadId) => {
    if (event === '__keyevent@0__:expired') {
      console.info(`Received expired event for key: ${requestUploadId}`)

      const { objectKey, uploadId } = getValuesFromRedisKey(requestUploadId)

      if (!objectKey || !uploadId) return

      try {
        await uploadAbort(uploadId, objectKey)
        logger.info(`Aborted multipart upload with ID: ${requestUploadId}`)
        //TODO alert??
      } catch {
        logger.error('Error aborting multipart upload')
      }
    }
  })
}
