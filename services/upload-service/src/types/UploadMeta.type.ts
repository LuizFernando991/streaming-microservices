export type UploadMeta = {
  uploadID: string
  parts: { PartNumber: number; ETag: string }[]
  totalSize: number
  chunkSize: number
  numberOfParts: number
  fileName: string
  objectKey: string
  episodeId: string
}
