import request from 'supertest'
import express from 'express'
import { uploadChunkHandler } from '@/infra/handlers/upload-chunk.handler'
import { mockRedis, mockBucketClient } from './mocks/mocks'
import { getServer } from '@/infra/http/server'

describe('uploadChunkHandler', () => {
  let app: express.Express

  beforeEach(() => {
    jest.clearAllMocks()
    app = getServer()
  })

  it('should return 400 if headers are missing', async () => {
    const res = await request(app).post('/upload')
    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/Missing/)
  })

  it('should return 400 if X-Upload-Id is invalid', async () => {
    const res = await request(app)
      .post('/upload')
      .set('content-part', '1')
      .set('x-upload-id', 'invalid-id')
      .attach('file', Buffer.from('chunk'), { filename: 'video.mp4' })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/Invalid X-Upload-Id/)
  })

  it('should return 400 if upload not found in Redis', async () => {
    mockRedis.get.mockResolvedValueOnce(null)

    const res = await request(app)
      .post('/upload')
      .set('content-part', '1')
      .set('x-upload-id', 'mockUploadId<>objKey')
      .attach('file', Buffer.from('chunk'), { filename: 'video.mp4' })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/Upload not found/)
  })

  it('should return 500 if bucketClient.uploadPart fails', async () => {
    mockRedis.get.mockResolvedValueOnce(
      JSON.stringify({
        uploadID: 'mockUploadId',
        parts: [],
        numberOfParts: 1,
        fileName: 'video.mp4',
        objectKey: 'objKey',
        episodeId: 'ep123',
        chunkSize: 40 * 1024 * 1024,
        totalSize: 40 * 1024 * 1024,
      }),
    )
    mockBucketClient.uploadPart.mockResolvedValueOnce(null)

    const res = await request(app)
      .post('/upload')
      .set('content-part', '1')
      .set('x-upload-id', 'mockUploadId<>objKey')
      .attach('file', Buffer.from('chunk'), { filename: 'video.mp4' })

    expect(res.status).toBe(500)
    expect(res.body.message).toBe('Internal error')
  })

  it('should process a chunk successfully but not complete upload if parts remain', async () => {
    mockRedis.get.mockResolvedValueOnce(
      JSON.stringify({
        uploadID: 'mockUploadId',
        parts: [],
        numberOfParts: 2,
        fileName: 'video.mp4',
        objectKey: 'objKey',
        episodeId: 'ep123',
        chunkSize: 40 * 1024 * 1024,
        totalSize: 80 * 1024 * 1024,
      }),
    )
    mockBucketClient.uploadPart.mockResolvedValueOnce('etag123')

    const res = await request(app)
      .post('/upload')
      .set('content-part', '1')
      .set('x-upload-id', 'mockUploadId<>objKey')
      .attach('file', Buffer.from('chunk'), { filename: 'video.mp4' })

    expect(res.status).toBe(200)
    expect(mockBucketClient.uploadPart).toHaveBeenCalled()
    expect(mockBucketClient.completeMultPartUpload).not.toHaveBeenCalled()
  })

  it('should complete upload when last part is uploaded', async () => {
    mockRedis.get.mockResolvedValueOnce(
      JSON.stringify({
        uploadID: 'mockUploadId',
        parts: [{ PartNumber: 1, ETag: 'etag1' }],
        numberOfParts: 2,
        fileName: 'video.mp4',
        objectKey: 'objKey',
        episodeId: 'ep123',
        chunkSize: 40 * 1024 * 1024,
        totalSize: 80 * 1024 * 1024,
      }),
    )
    mockBucketClient.uploadPart.mockResolvedValueOnce('etag2')
    mockBucketClient.completeMultPartUpload.mockResolvedValueOnce(true)

    const res = await request(app)
      .post('/upload')
      .set('content-part', '2')
      .set('x-upload-id', 'mockUploadId<>objKey')
      .attach('file', Buffer.from('chunk'), { filename: 'video.mp4' })

    expect(res.status).toBe(200)
    expect(mockBucketClient.uploadPart).toHaveBeenCalled()
    expect(mockBucketClient.completeMultPartUpload).toHaveBeenCalledWith(
      'objKey',
      'mockUploadId',
      expect.any(Array),
    )
    expect(mockRedis.del).toHaveBeenCalledWith('mockUploadId<>objKey')
  })

  it('should handle Busboy errors', async () => {
    app.post('/upload-error', () => {
      const handler = uploadChunkHandler
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fakeReq: any = {
        headers: {},
        pipe: () => {
          throw new Error('Busboy failed')
        },
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fakeRes: any = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      handler(fakeReq, fakeRes)
    })

    const res = await request(app).post('/upload-error')
    expect(res.status).toBe(500)
  })
})
