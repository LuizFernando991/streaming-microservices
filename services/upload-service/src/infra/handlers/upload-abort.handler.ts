import { bucketClient } from '@/infra/adapters/bucket/bucket.adapter'

export async function uploadAbort(uploadId: string, objectKey: string) {
  await bucketClient.abortMultipartUpload({
    key: objectKey,
    uploadId,
  })
}
