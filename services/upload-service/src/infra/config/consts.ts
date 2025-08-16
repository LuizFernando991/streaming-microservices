import { env } from './env'

export const REDIS_UPLOAD_PARTS_KEY = (uploadRequestId: string) =>
  `${uploadRequestId}:parts`

export const REDIS_UPLOAD_PARTS_LOCK_KEY = (uploadRequestId: string) =>
  `lock:${uploadRequestId}`

export const REDIS_UPLOAD_DATA_KEY = (uploadId: string, objectKey: string) => {
  return `${uploadId}<>${objectKey}`
}

export const BUCKET_NAME = env.bucketName
