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

export const BUCKET_NAME = env.bucketName

class BucketClient {
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
    buffer: Buffer,
  ) {
    const uploadPartCommand = new UploadPartCommand({
      Bucket: BUCKET_NAME,
      Key: objectKey,
      PartNumber: partNumber,
      UploadId: uploadID,
      Body: buffer,
    })

    const etagObj = await this.s3Client.send(uploadPartCommand)

    return etagObj.ETag
  }

  async completeMultPartUpload(
    objectKey: string,
    uploadID: string,
    parts: { PartNumber: number; ETag: string }[],
  ) {
    await this.s3Client.send(
      new CompleteMultipartUploadCommand({
        Bucket: BUCKET_NAME,
        Key: objectKey,
        UploadId: uploadID,
        MultipartUpload: {
          Parts: parts,
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

export const bucketClient = new BucketClient()
