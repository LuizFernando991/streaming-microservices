import { Request, Response } from 'express'
import { redis } from '@/infra/adapters/redis/redis.adapter'
import { UploadMeta } from '@/types/UploadMeta.type'

export async function uploadStatusHandler(req: Request, res: Response) {
  const { fileId } = req.params

  if (!fileId) {
    return res.status(400).json({ message: 'Missing fileId' })
  }

  try {
    const metaStr = await redis.get(fileId)
    const meta: UploadMeta | null = metaStr ? JSON.parse(metaStr) : null

    if (!meta) {
      return res.status(404).json({
        message: `Upload not found`,
      })
    }
    const uploadedParts = meta.parts.map((part) => part.PartNumber)
    return res.status(200).json({ uploadedParts })
  } catch {
    return res.status(404).json({ message: 'File not found' })
  }
}
