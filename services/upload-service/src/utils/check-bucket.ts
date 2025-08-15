import {
  BUCKET_NAME,
  bucketClient,
} from '@/infra/adapters/bucket/bucket.adapter'
import { Logger } from '@/infra/adapters/logger/logger.adapter'

const logger = new Logger('BUCKET_CHECK')

export async function ensureBucketExists() {
  try {
    await bucketClient.checkBucket()
    logger.info(`Bucket "${BUCKET_NAME}" checked`)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    if (err?.$metadata?.httpStatusCode === 404 || err?.Code === 'NotFound') {
      logger.info(`Criando bucket "${BUCKET_NAME}"...`)
      await bucketClient.createBucket()
      logger.info(`Bucket "${BUCKET_NAME}" created`)
    } else {
      throw err
    }
  }
}
