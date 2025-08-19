import { uploadCompletedHandler } from '@/infra/handlers/upload-completed.handler'
import {
  mockRedis,
  mockBucketClient,
  mockQueueAdapter,
  mockRedlock,
} from './mocks/mocks'

describe('uploadCompletedHandler', () => {
  const uploadRequestId = 'mockUploadId'
  const objectKey = 'mockObjectKey'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should complete upload and cleanup redis', async () => {
    mockRedlock.acquire.mockResolvedValue({
      release: jest.fn().mockResolvedValue(true),
    })
    mockRedis.hvals.mockResolvedValue([
      JSON.stringify({ PartNumber: 1, ETag: 'etag1' }),
      JSON.stringify({ PartNumber: 2, ETag: 'etag2' }),
    ])
    mockRedis.hgetall.mockResolvedValue({ episodeId: 'ep123' })
    mockBucketClient.completeMultPartUpload.mockResolvedValue(true)
    mockQueueAdapter.onUploadCompleted.mockResolvedValue(true)
    mockRedis.multi.mockReturnValue({
      del: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(true),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    await uploadCompletedHandler(uploadRequestId, 'uploadId', objectKey)

    expect(mockRedlock.acquire).toHaveBeenCalled()
    expect(mockBucketClient.completeMultPartUpload).toHaveBeenCalledWith(
      objectKey,
      'uploadId',
      expect.any(Array),
    )
    expect(mockQueueAdapter.onUploadCompleted).toHaveBeenCalledWith({
      episodeId: 'ep123',
      objectkey: objectKey,
    })
    expect(mockRedis.multi).toHaveBeenCalled()
  })

  it('should not crash if lock is already acquired by another process', async () => {
    const lockError = new Error('Already locked')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(lockError as any).name = 'LockError'
    mockRedlock.acquire.mockRejectedValueOnce(lockError)

    await expect(
      uploadCompletedHandler(uploadRequestId, 'uploadId', objectKey),
    ).resolves.not.toThrow()

    expect(mockBucketClient.completeMultPartUpload).not.toHaveBeenCalled()
  })

  it('should handle failure in completeMultPartUpload gracefully', async () => {
    mockRedlock.acquire.mockResolvedValue({
      release: jest.fn().mockResolvedValue(true),
    })
    mockRedis.hvals.mockResolvedValue([
      JSON.stringify({ PartNumber: 1, ETag: 'etag1' }),
    ])
    mockRedis.hgetall.mockResolvedValue({ episodeId: 'ep123' })
    mockBucketClient.completeMultPartUpload.mockRejectedValue(
      new Error('S3 error'),
    )

    await uploadCompletedHandler(uploadRequestId, 'uploadId', objectKey)

    expect(mockBucketClient.completeMultPartUpload).toHaveBeenCalled()
    expect(mockQueueAdapter.onUploadCompleted).not.toHaveBeenCalled()
  })

  it('should log error if lock.release fails', async () => {
    const releaseMock = jest.fn().mockRejectedValue(new Error('release error'))
    mockRedlock.acquire.mockResolvedValue({ release: releaseMock })
    mockRedis.hvals.mockResolvedValue([
      JSON.stringify({ PartNumber: 1, ETag: 'etag1' }),
    ])
    mockRedis.hgetall.mockResolvedValue({ episodeId: 'ep123' })
    mockBucketClient.completeMultPartUpload.mockResolvedValue(true)
    mockQueueAdapter.onUploadCompleted.mockResolvedValue(true)
    mockRedis.multi.mockReturnValue({
      del: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(true),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    await uploadCompletedHandler(uploadRequestId, 'uploadId', objectKey)

    expect(releaseMock).toHaveBeenCalled()
  })
})
