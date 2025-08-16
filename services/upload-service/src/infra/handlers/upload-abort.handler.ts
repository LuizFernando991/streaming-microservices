import { BucketClient } from '@/infra/adapters/bucket/bucket.adapter'

export async function uploadAbort(uploadId: string, objectKey: string) {
  const bucketClient = BucketClient.getInstance()
  await bucketClient.abortMultipartUpload({
    key: objectKey,
    uploadId,
  })
}
