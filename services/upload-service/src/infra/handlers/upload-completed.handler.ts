/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { UploadedPart } from '@/types/UploadedPart'
import { BucketClient } from '../adapters/bucket/bucket.adapter'
import { redis, redlock } from '../adapters/redis/redis.adapter'
import { QueueAdapter } from '../adapters/queue/queue.adapter'
import { Logger } from '../adapters/logger/logger.adapter'
import { Lock } from 'redlock'
import { retry } from '@/utils/retry'
import {
  REDIS_UPLOAD_PARTS_KEY,
  REDIS_UPLOAD_PARTS_LOCK_KEY,
} from '../config/consts'

const logger = new Logger('UPLOAD_COMPLETE_HANDLER')

export async function uploadCompletedHandler(
  uploadRequestId: string,
  objectKey: string,
) {
  const lockKey = REDIS_UPLOAD_PARTS_LOCK_KEY(uploadRequestId)
  const bucketClient = BucketClient.getInstance()

  let lock: Lock

  try {
    lock = await redlock.acquire([lockKey], 30000)
  } catch (err: any) {
    if (err?.name === 'LockError') {
      logger.info(`Upload is ending in another process: ${objectKey}`)
      return
    }
    throw err
  }

  try {
    const uploadRequestPartsRedisKey = REDIS_UPLOAD_PARTS_KEY(uploadRequestId)
    await retry(
      async () => {
        const [partsRaw, uploadMeta] = await Promise.all([
          redis.hvals(uploadRequestPartsRedisKey),
          redis.hgetall(uploadRequestId),
        ])

        const parts: UploadedPart[] = partsRaw.map(
          (p) => JSON.parse(p) as UploadedPart,
        )
        const episodeId = uploadMeta.episodeId

        const queueAdapter = await QueueAdapter.getInstance()

        await bucketClient.completeMultPartUpload(
          objectKey,
          uploadRequestId,
          parts,
        )

        await queueAdapter.onUploadCompleted({
          episodeId,
          objectkey: objectKey,
        })

        await redis
          .multi()
          .del(uploadRequestId)
          .del(uploadRequestPartsRedisKey)
          .exec()

        logger.info(`Upload Completed: ${objectKey}`)
      },
      3,
      1000,
    )
  } catch (err: any) {
    // Send to alert!
    logger.error(`Failed to release lock for ${objectKey}`, err)
  } finally {
    try {
      await lock.release()
    } catch (err: any) {
      logger.error(`Failed to release lock for ${objectKey}`, err)
    }
  }
}
