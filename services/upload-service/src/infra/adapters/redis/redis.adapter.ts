import Redis from 'ioredis'

import { env } from '@/infra/config/env'

export const redis = new Redis({
  host: env.redisHost,
  port: env.redisPort,
  password: env.redisPassword,
  enableReadyCheck: true,
  lazyConnect: false, // conecta ao importar
  retryStrategy: (times) => Math.min(times * 200, 5000),
})
