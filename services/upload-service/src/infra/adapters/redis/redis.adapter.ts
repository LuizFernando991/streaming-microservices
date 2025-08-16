import Redis from 'ioredis'
import Redlock from 'redlock'

import { env } from '@/infra/config/env'

export const redis = new Redis({
  host: env.redisHost,
  port: env.redisPort,
  password: env.redisPassword,
  enableReadyCheck: true,
  lazyConnect: false, // connect on import
  retryStrategy: (times) => Math.min(times * 200, 5000),
})

export const redlock = new Redlock([redis], {
  retryCount: 0,
})
