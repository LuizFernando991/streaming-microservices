import request from 'supertest'
import express from 'express'
import { mockRedis, mockBucketClient } from './mocks/mocks'
import { getServer } from '@/infra/http/server'

describe('uploadRequestHandler', () => {
  let app: express.Express

  beforeEach(() => {
    jest.clearAllMocks()
    app = getServer()
  })

  it('should return 400 if file meta is missing', async () => {
    const res = await request(app).post('/upload-request').send({})
    expect(res.status).toBe(400)
    expect(res.body.message).toBe('Invalid file meta')
  })

  it('should create new upload and save on Redis', async () => {
    mockBucketClient.createNewMultipartUpload.mockResolvedValue('mockUploadId')
    mockRedis.set.mockResolvedValue(true)

    const body = {
      fileName: 'video.mp4',
      totalSize: 100,
      totalParts: 2,
      episodeId: 'ep123',
    }

    const res = await request(app).post('/upload-request').send(body)
    expect(res.status).toBe(200)
    expect(res.body.uploadRequestId).toContain('mockUploadId')
    expect(mockRedis.set).toHaveBeenCalled()
    expect(mockBucketClient.createNewMultipartUpload).toHaveBeenCalledWith(
      expect.any(String),
    )
  })

  it('should return 500 if bucketClient fails', async () => {
    mockBucketClient.createNewMultipartUpload.mockRejectedValue(
      new Error('fail'),
    )

    const body = {
      fileName: 'video.mp4',
      totalSize: 100,
      totalParts: 2,
      episodeId: 'ep123',
    }

    const res = await request(app).post('/upload-request').send(body)
    expect(res.status).toBe(500)
    expect(res.body.message).toBe('Failed to start upload session')
  })
})
