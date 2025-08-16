import request from 'supertest'
import express from 'express'
import { mockRedis } from './mocks/mocks'
import { getServer } from '@/infra/http/server'

describe('uploadStatusHandler', () => {
  let app: express.Express

  beforeEach(() => {
    jest.clearAllMocks()
    app = getServer()
  })

  it('should return 404 if fileId was not passed', async () => {
    const res = await request(app).get('/upload-status')
    expect(res.status).toBe(404)
  })

  it('should return the sent parts', async () => {
    mockRedis.hvals.mockResolvedValueOnce([
      JSON.stringify({ PartNumber: 1, ETag: 'abc' }),
    ])

    const res = await request(app).get('/upload-status/test')
    expect(res.status).toBe(200)
    expect(res.body.uploadedParts).toEqual([1])
  })

  it('should return 404 if upload is not found', async () => {
    mockRedis.hvals.mockResolvedValueOnce([])
    const res = await request(app).get('/upload-status/test<>test')
    expect(res.status).toBe(404)
    expect(res.body.message).toBe('Upload not found')
  })
})
