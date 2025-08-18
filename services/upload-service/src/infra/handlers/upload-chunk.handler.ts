import { Request, Response } from 'express'
import Stream from 'node:stream'
import Busboy from 'busboy'
import { redis } from '@/infra/adapters/redis/redis.adapter'
import { BucketClient } from '@/infra/adapters/bucket/bucket.adapter'
import { Logger } from '@/infra/adapters/logger/logger.adapter'
import { getValuesFromRedisKey } from '@/utils/parse-redis-key'
import { uploadCompletedHandler } from './upload-completed.handler'
import { REDIS_UPLOAD_PARTS_KEY } from '../config/consts'

const logger = new Logger('UPLOAD_CHUNCK_HANDLER')

// Better change to queue or task
const checkIfIsComplete = async (
  uploadRequestRedisKey: string,
  uploadRequestPartsRedisKey: string,
  numberOfParts: number,
  uploadId: string,
  objectKey: string,
) => {
  const partsCount = await redis.hlen(uploadRequestPartsRedisKey)
  const totalParts = Number(numberOfParts)

  if (partsCount === totalParts) {
    try {
      await uploadCompletedHandler(uploadRequestRedisKey, uploadId, objectKey)
    } catch {
      logger.error('Failed to complete upload')
    }
  }
}

export function uploadChunkHandler(req: Request, res: Response) {
  const contentPart = Number(req.headers['content-part'] as string)
  const redisUploadRequestId = req.headers['x-upload-id'] as string

  if (!contentPart || !redisUploadRequestId) {
    return res
      .status(400)
      .json({ message: 'Missing "Content-Range" or "X-Upload-Id" header' })
  }

  const { uploadId, objectKey } = getValuesFromRedisKey(redisUploadRequestId)

  if (!uploadId || !objectKey) {
    return res.status(400).json({ message: 'Invalid X-Upload-Id' })
  }

  const busboy = Busboy({ headers: req.headers })
  const bucketClient = BucketClient.getInstance()

  busboy.on('file', async (_, file) => {
    try {
      const meta = await redis.hgetall(redisUploadRequestId)
      if (!meta || Object.keys(meta).length === 0) {
        return res.status(400).json({
          message: `Upload not found`,
        })
      }

      const etag = await bucketClient.uploadPart(
        objectKey,
        contentPart,
        meta.uploadID,
        file as Stream.Readable,
      )

      if (!etag) {
        return res.status(500).json({ message: 'Internal error' })
      }

      const newPartData = { PartNumber: contentPart, ETag: etag }

      const uploadRequestPartsRedisKey = REDIS_UPLOAD_PARTS_KEY(uploadId)

      await redis.hset(
        uploadRequestPartsRedisKey,
        contentPart.toString(),
        JSON.stringify(newPartData),
      )
      await redis.expire(uploadRequestPartsRedisKey, 7200)

      checkIfIsComplete(
        redisUploadRequestId,
        uploadRequestPartsRedisKey,
        Number(meta.numberOfParts),
        uploadId,
        objectKey,
      )

      return res.status(200).json({ message: 'Chunk Uploaded' })
    } catch (err) {
      logger.error('Erro upload chunk:', { error: err })
      return res.status(500).json({ message: 'Upload failed' })
    }
  })

  busboy.on('error', (err) => {
    logger.error('Busboy error:', { error: err })
    return res.status(500).send('Upload error')
  })

  req.pipe(busboy)
}
