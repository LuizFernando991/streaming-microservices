import { connect, Channel, ChannelModel } from 'amqplib'
import { env } from '@/infra/config/env'
import { Logger } from '../logger/logger.adapter'

const logger = new Logger('QUEUE_ADAPTER')

export class QueueAdapter {
  private static instance: QueueAdapter
  private connection?: ChannelModel
  private channel?: Channel

  private constructor() {}

  public static async getInstance(): Promise<QueueAdapter> {
    if (!QueueAdapter.instance) {
      const adapter = new QueueAdapter()
      adapter.connection = await connect(env.rabbitmqUrl)
      adapter.channel = await adapter.connection.createChannel()
      QueueAdapter.instance = adapter
      logger.info('[RabbitMQ] Connected.')
    }
    return QueueAdapter.instance
  }

  private async publish(queue: string, message: string): Promise<void> {
    if (!this.channel) throw new Error('Channel not initialized')
    await this.channel.assertQueue(queue, { durable: true })
    this.channel.sendToQueue(queue, Buffer.from(message))
  }

  async onUploadCompleted(data: {
    episodeId: string
    objectkey: string
  }): Promise<void> {
    await this.publish(
      env.uploadedQueueName,
      JSON.stringify({
        bucket: env.bucketName,
        object_key: data.objectkey,
        episode_id: data.episodeId,
      }),
    )
  }
}
