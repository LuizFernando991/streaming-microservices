import { Logger } from '@/infra/adapters/logger/logger.adapter'
import { getServer } from '@/infra/http/server'
import { ensureBucketExists } from '@/utils/check-bucket'
import { startRedisSubscribers } from '@/infra/adapters/redis/redis.subscriber'
import { env } from '@/infra/config/env'

const logger = new Logger('APP')

async function main() {
  await ensureBucketExists()
  startRedisSubscribers()

  const app = getServer()

  app.listen(env.port, () => {
    logger.info('Server running at: ' + env.port)
  })
}

main()
