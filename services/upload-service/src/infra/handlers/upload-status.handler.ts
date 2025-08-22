import { Request, Response } from 'express'
import { redis } from '@/infra/adapters/redis/redis.adapter'
import { REDIS_UPLOAD_PARTS_KEY } from '../config/consts'
import { getValuesFromRedisKey } from '@/utils/parse-redis-key'
import { UploadedPart } from '@/types/UploadedPart'
import { parseUploadMeta } from '@/utils/parse-upload-meta'

export async function uploadStatusHandler(req: Request, res: Response) {
  const { uploadRequestId } = req.params

  if (!uploadRequestId) {
    return res.status(400).json({ message: 'Missing fileId' })
  }

  try {
    const { uploadId } = getValuesFromRedisKey(uploadRequestId)

    if (!uploadId) {
      return res.status(400).json({ message: 'Invalid uploadRequestId' })
    }

    const uploadRequestPartsRedisKey = REDIS_UPLOAD_PARTS_KEY(uploadId)
    const [metaRaw, partsRaw] = await Promise.all([
      redis.hgetall(uploadRequestId),
      redis.hvals(uploadRequestPartsRedisKey),
    ])

    if (!partsRaw || !metaRaw || Object.keys(metaRaw).length === 0) {
      return res.status(404).json({
        message: `Upload not found`,
      })
    }

    const meta = parseUploadMeta(metaRaw)
    const parts = partsRaw.map(
      (p) => (JSON.parse(p) as UploadedPart).PartNumber,
    )

    return res.status(200).json({
      uploadedParts: parts,
      chunkSize: meta.chunkSize,
      numberOfParts: meta.numberOfParts,
      totalSize: meta.totalSize,
    })
  } catch {
    return res.status(500).json({ message: 'Internal error' })
  }
}
