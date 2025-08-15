import dotenv from 'dotenv'
import path from 'path'
import { mockBucketClient, mockRedis } from './mocks/mocks'

dotenv.config({ path: path.resolve(__dirname, '../../env.test'), quiet: true })

jest.mock('@/infra/adapters/redis/redis.adapter', () => ({
  redis: mockRedis,
}))

jest.mock('@/infra/adapters/bucket/bucket.adapter', () => ({
  bucketClient: mockBucketClient,
}))

jest.mock('@/infra/adapters/logger/logger.adapter', () => {
  return {
    Logger: jest.fn().mockImplementation(() => ({
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    })),
  }
})
