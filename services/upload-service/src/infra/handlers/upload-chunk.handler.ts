import { Request, Response } from 'express'
import Busboy from 'busboy'
import { redis } from '@/infra/adapters/redis/redis.adapter'
import { bucketClient } from '@/infra/adapters/bucket/bucket.adapter'
import { UploadMeta } from '@/types/UploadMeta.type'
import { Logger } from '@/infra/adapters/logger/logger.adapter'
import { getValuesFromRedisKey } from '@/utils/parse-redis-key'

const logger = new Logger('UPLOAD_CHUNCK_HANDLER')

export function uploadChunkHandler(req: Request, res: Response) {
  const contentPart = Number(req.headers['content-part'] as string)
  const uploadRequestId = req.headers['x-upload-id'] as string

  if (!contentPart || !uploadRequestId) {
    return res
      .status(400)
      .json({ message: 'Missing "Content-Range" or "X-Upload-Id" header' })
  }

  const { uploadId, objectKey } = getValuesFromRedisKey(uploadRequestId)

  if (!uploadId || !objectKey) {
    return res.status(400).json({ message: 'Invalid X-Upload-Id' })
  }

  const busboy = Busboy({ headers: req.headers })
  busboy.on('file', async (_, file) => {
    try {
      const metaStr = await redis.get(uploadId)
      const meta: UploadMeta | null = metaStr ? JSON.parse(metaStr) : null

      if (!meta) {
        return res.status(400).json({
          message: `Upload not found`,
        })
      }

      // minio requires (for now)
      const chunks: Buffer[] = []
      for await (const chunk of file) {
        chunks.push(chunk as Buffer)
      }

      const fileBuffer = Buffer.concat(chunks)

      const etag = await bucketClient.uploadPart(
        objectKey,
        contentPart,
        meta.uploadID,
        fileBuffer,
      )

      if (!etag) {
        return res.status(500).json({ message: 'Internal error' })
      }

      meta.parts.push({ PartNumber: contentPart, ETag: etag })

      await redis.set(uploadRequestId, JSON.stringify(meta), 'EX', 3600)

      if (meta.parts.length === meta.numberOfParts) {
        await bucketClient.completeMultPartUpload(
          objectKey,
          meta.uploadID,
          meta.parts,
        )

        await redis.del(uploadRequestId)
        logger.info(`Upload Completed: ${objectKey}`)
      }

      return res.sendStatus(200)
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
