import { Logger } from '@/infra/adapters/logger/logger.adapter'
import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config({
  path: ['.env', '.env.local'],
})

const logger = new Logger('ENV_VALIDATION')

const envSchema = z.object({
  BUCKET_NAME: z.string().min(1, 'BUCKET_NAME is required'),
  BUCKET_ACCESS_KEY: z.string().min(1, 'BUCKET_ACCESS_KEY is required'),
  BUCKET_ACCESS_PASSWORD: z
    .string()
    .min(1, 'BUCKET_ACCESS_PASSWORD is required'),
  BUCKET_URL: z.url().optional(),
  PORT: z
    .string()
    .transform((port) => Number(port))
    .refine((port) => !isNaN(port) && port > 0, {
      message: 'PORT must be a positive number',
    }),
  NODE_ENV: z.enum(['development', 'production', 'test']),
  LOG_LEVEL: z
    .enum(['error', 'warn', 'info', 'debug'])
    .optional()
    .default('info'),
  REDIS_HOST: z.url(),
  REDIS_PORT: z
    .string()
    .transform((port) => Number(port))
    .refine((port) => !isNaN(port) && port > 0, {
      message: 'PORT must be a positive number',
    }),
  REDIS_PASSWORD: z.string(),
})

const parsedEnv = envSchema.safeParse(process.env)

if (!parsedEnv.success) {
  logger.error('Invalid environment variables:', parsedEnv.error)
  throw new Error('Invalid env file')
}

export const env = {
  bucketName: parsedEnv.data.BUCKET_NAME,
  bucketAccessKey: parsedEnv.data.BUCKET_ACCESS_KEY,
  bucketAccessPassword: parsedEnv.data.BUCKET_ACCESS_PASSWORD,
  bucketUrl: parsedEnv.data.BUCKET_URL,
  port: parsedEnv.data.PORT,
  nodeEnv: parsedEnv.data.NODE_ENV,
  logLevel: parsedEnv.data.LOG_LEVEL,
  redisHost: parsedEnv.data.REDIS_HOST,
  redisPort: parsedEnv.data.REDIS_PORT,
  redisPassword: parsedEnv.data.REDIS_PASSWORD,
}
