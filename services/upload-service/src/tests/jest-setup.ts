import dotenv from 'dotenv'
import path from 'path'
import {
  mockBucketClient,
  mockLogger,
  mockQueueAdapter,
  mockRedis,
  mockRedlock,
} from './mocks/mocks'

dotenv.config({ path: path.resolve(__dirname, '../../.env.test'), quiet: true })

jest.mock('@/infra/adapters/redis/redis.adapter', () => ({
  redis: mockRedis,
  redlock: mockRedlock,
}))

jest.mock('@/infra/adapters/queue/queue.adapter', () => ({
  QueueAdapter: {
    getInstance: () => mockQueueAdapter,
  },
}))

jest.mock('@/infra/adapters/bucket/bucket.adapter', () => ({
  BucketClient: {
    getInstance: () => mockBucketClient,
  },
}))

jest.mock('@/infra/adapters/logger/logger.adapter', () => ({
  Logger: jest.fn(() => mockLogger),
}))

jest.mock('@/infra/middlewares/request.middleware', () => ({
  requestsMiddleware: jest.fn((_req, _res, next) => next()),
}))
