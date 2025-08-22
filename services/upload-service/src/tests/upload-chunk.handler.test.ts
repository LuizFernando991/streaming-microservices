import request from 'supertest'
import express from 'express'
import { uploadChunkHandler } from '@/infra/handlers/upload-chunk.handler'
import { mockRedis, mockBucketClient } from './mocks/mocks'
import { getServer } from '@/infra/http/server'
import { uploadCompletedHandler } from '@/infra/handlers/upload-completed.handler'

jest.mock('@/infra/handlers/upload-completed.handler', () => ({
  uploadCompletedHandler: jest.fn(),
}))

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
    mockRedis.hgetall.mockResolvedValueOnce(null)

    const res = await request(app)
      .post('/upload')
      .set('content-part', '1')
      .set('x-upload-id', 'mockUploadId<>objKey')
      .attach('file', Buffer.from('chunk'), { filename: 'video.mp4' })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/Upload not found/)
  })

  it('should return 500 if bucketClient.uploadPart fails', async () => {
    mockRedis.hgetall.mockResolvedValueOnce({
      uploadID: 'mockUploadId',
      numberOfParts: 1,
      fileName: 'video.mp4',
      objectKey: 'objKey',
      episodeId: 'ep123',
    })
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
    mockRedis.hgetall.mockResolvedValueOnce({
      uploadID: 'mockUploadId',
      numberOfParts: 2,
      fileName: 'video.mp4',
      objectKey: 'objKey',
      episodeId: 'ep123',
    })
    mockBucketClient.uploadPart.mockResolvedValueOnce('etag123')
    mockRedis.hset.mockResolvedValueOnce(true)
    mockRedis.expire.mockResolvedValueOnce(true)
    mockRedis.hlen.mockResolvedValueOnce(1)

    const res = await request(app)
      .post('/upload')
      .set('content-part', '1')
      .set('x-upload-id', 'mockUploadId<>objKey')
      .attach('file', Buffer.from('chunk'), { filename: 'video.mp4' })

    expect(res.status).toBe(200)
    expect(mockBucketClient.uploadPart).toHaveBeenCalled()
    expect(uploadCompletedHandler).not.toHaveBeenCalled()
  })

  it('should complete upload when last part is uploaded', async () => {
    mockRedis.hgetall.mockResolvedValueOnce({
      uploadID: 'mockUploadId',
      numberOfParts: 2,
      fileName: 'video.mp4',
      objectKey: 'objKey',
      episodeId: 'ep123',
    })
    mockBucketClient.uploadPart.mockResolvedValueOnce('etag2')
    mockRedis.hset.mockResolvedValueOnce(true)
    mockRedis.expire.mockResolvedValueOnce(true)
    mockRedis.hlen.mockResolvedValueOnce(2)

    const res = await request(app)
      .post('/upload')
      .set('content-part', '2')
      .set('x-upload-id', 'mockUploadId<>objKey')
      .attach('file', Buffer.from('chunk'), { filename: 'video.mp4' })

    expect(res.status).toBe(200)
    expect(mockBucketClient.uploadPart).toHaveBeenCalled()
    expect(uploadCompletedHandler).toHaveBeenCalledWith(
      'mockUploadId<>objKey',
      'mockUploadId',
      'objKey',
    )
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
