export function getValuesFromRedisKey(redisKey: string): {
  uploadId: string | undefined
  objectKey: string | undefined
} {
  const [uploadId, objectKey] = redisKey.split('<>')

  return {
    uploadId,
    objectKey,
  }
}
