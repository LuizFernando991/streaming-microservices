import { UploadMeta } from '@/types/UploadMeta.type'

export function parseUploadMeta(raw: Record<string, string>): UploadMeta {
  return {
    uploadID: raw.uploadID,
    objectKey: raw.objectKey,
    fileName: raw.fileName,
    episodeId: raw.episodeId,
    totalSize: Number(raw.totalSize),
    numberOfParts: Number(raw.numberOfParts),
    chunkSize: Number(raw.chunkSize),
  }
}
