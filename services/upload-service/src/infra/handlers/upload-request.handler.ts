import { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { BucketClient } from '@/infra/adapters/bucket/bucket.adapter'
import { redis } from '@/infra/adapters/redis/redis.adapter'
import { UploadMeta } from '@/types/UploadMeta.type'
import { Logger } from '@/infra/adapters/logger/logger.adapter'
import { REDIS_UPLOAD_DATA_KEY } from '../config/consts'

const logger = new Logger('UPLOAD_REQUEST_HANDLER')

export async function uploadRequestHandler(req: Request, res: Response) {
  if (
    !req.body ||
    !req.body.fileName ||
    !req.body.totalSize ||
    !req.body.totalParts ||
    !req.body.episodeId
  ) {
    return res.status(400).json({ message: 'Invalid file meta' })
  }

  const fileId = uuidv4()
  const objectKey = `file-${fileId}`
  const bucketClient = BucketClient.getInstance()

  try {
    const uploadID = await bucketClient.createNewMultipartUpload(objectKey)

    const meta: UploadMeta = {
      uploadID,
      parts: [],
      chunkSize: 40 * 1024 * 1024, // 40 MB
      totalSize: req.body.totalSize,
      numberOfParts: Number(req.body.totalParts),
      fileName: req.body.fileName,
      objectKey,
      episodeId: req.body.episodeId,
    }

    const redisKey = REDIS_UPLOAD_DATA_KEY(uploadID, objectKey)

    await redis.hset(redisKey, {
      uploadID,
      objectKey,
      numberOfParts: meta.numberOfParts,
      totalSize: meta.totalSize,
      fileName: meta.fileName,
      episodeId: meta.episodeId,
    })

    await redis.expire(redisKey, 7200)

    return res.status(200).json({
      uploadRequestId: redisKey,
    })
  } catch (err) {
    logger.error('Failed to initiate multipart upload:', { error: err })
    return res.status(500).json({ message: 'Failed to start upload session' })
  }
}
