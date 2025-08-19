import './infra/tracing/tracing'
import client from 'prom-client'
import { getServer } from '@/infra/http/server'
import { ensureBucketExists } from '@/utils/check-bucket'
import { startRedisSubscribers } from '@/infra/adapters/redis/redis.subscriber'
import { env } from '@/infra/config/env'

client.collectDefaultMetrics()

async function main() {
  await ensureBucketExists()
  startRedisSubscribers()

  const app = getServer()

  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', String(client.register.contentType))
    res.end(await client.register.metrics())
  })

  app.listen(env.port, () => {
    console.log('Server running at: ' + env.port)
  })
}

main()
