import { BUCKET_NAME } from '@/infra/config/consts'
import { env } from '@/infra/config/env'
import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3'
import Stream from 'node:stream'

export class BucketClient {
  private static instance: BucketClient
  private readonly s3Client

  constructor() {
    this.s3Client = new S3Client({
      region: 'us-east-2',
      credentials: {
        accessKeyId: env.bucketAccessKey,
        secretAccessKey: env.bucketAccessPassword,
      },
      endpoint: env.bucketUrl,
      forcePathStyle: true,
    })
  }

  public static getInstance(): BucketClient {
    if (!BucketClient.instance) {
      return new BucketClient()
    }
    return BucketClient.instance
  }

  async createNewMultipartUpload(objectKey: string): Promise<string> {
    const res = await this.s3Client.send(
      new CreateMultipartUploadCommand({
        Bucket: BUCKET_NAME,
        Key: objectKey,
      }),
    )

    if (!res.UploadId) throw new Error('Internal error')

    return res.UploadId
  }

  async uploadPart(
    objectKey: string,
    partNumber: number,
    uploadID: string,
    stream: Stream.Readable,
  ) {
    // I don't know why, but min.io throws an error if i don't convert to buffer
    // In real application, we should use the stream object
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer)
    }

    const fileBuffer = Buffer.concat(chunks)
    const uploadPartCommand = new UploadPartCommand({
      Bucket: BUCKET_NAME,
      Key: objectKey,
      PartNumber: partNumber,
      UploadId: uploadID,
      Body: fileBuffer,
    })

    const etagObj = await this.s3Client.send(uploadPartCommand)

    return etagObj.ETag
  }

  async completeMultPartUpload(
    objectKey: string,
    uploadID: string,
    parts: { PartNumber: number; ETag: string }[],
  ) {
    const sortedParts = parts.sort((a, b) => a.PartNumber - b.PartNumber)
    await this.s3Client.send(
      new CompleteMultipartUploadCommand({
        Bucket: BUCKET_NAME,
        Key: objectKey,
        UploadId: uploadID,
        MultipartUpload: {
          Parts: sortedParts,
        },
      }),
    )
  }

  async checkBucket() {
    await this.s3Client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }))
  }

  async createBucket() {
    await this.s3Client.send(
      new CreateBucketCommand({
        Bucket: BUCKET_NAME,
        CreateBucketConfiguration: {
          LocationConstraint: 'us-east-2',
        },
      }),
    )
  }

  async abortMultipartUpload({
    key,
    uploadId,
  }: {
    key: string
    uploadId: string
  }) {
    await this.s3Client.send(
      new AbortMultipartUploadCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        UploadId: uploadId,
      }),
    )
  }
}
